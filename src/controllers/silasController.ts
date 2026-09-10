import { randomBytes } from "node:crypto";
import { promisify } from "node:util";

import { ConfidentialClientApplication } from "@azure/msal-node";
import type { Request, Response } from "express";

import config from "#config.js";
import type { AccessTokenClaims } from "#types/auth-types.js";

const NONCE_BYTES = 32;
const TOKEN_PARTS_COUNT = 3;
const DEFAULT_SESSION_MINUTES = 30;
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const INTERNAL_SERVER_ERROR = 500;
const EMPTY_LENGTH = 0;
const TOKEN_CLAIMS_INDEX = 1;
const LAST_SEGMENT_INDEX = -1;

const TOKEN_EXPIRY_OFFSET_MS =
  DEFAULT_SESSION_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

const OIDC_SCOPES = new Set(["openid", "profile", "offline_access"]);

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: config.silas.clientId,
    authority: config.silas.authority,
    clientSecret: config.silas.clientSecret,
  },
});

/**
 * Handles the initial SILAS login request and redirects the user to Microsoft.
 *
 * @param {Request} req Express request containing the authenticated session.
 * @param {Response} res Express response used to redirect the user.
 * @returns {Promise<void>} A promise that resolves after the redirect.
 */
export async function loginAction(req: Request, res: Response): Promise<void> {
  const nonce = randomBytes(NONCE_BYTES).toString("base64url");

  req.session.auth_nonce = nonce;
  await promisify(req.session.save.bind(req.session))();

  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: config.silas.scopes,
    redirectUri: config.silas.redirectUri,
    state: nonce,
  });

  res.redirect(authUrl);
}

/**
 * Decodes the claims portion of a JWT access token.
 *
 * @param {string} token JWT access token to decode.
 * @returns {AccessTokenClaims} The decoded access-token claims.
 * @throws {Error} When the token cannot be decoded.
 */
function decodeToken(token: string): AccessTokenClaims {
  const parts = token.split(".");

  if (parts.length !== TOKEN_PARTS_COUNT) {
    throw new Error("SILAS token failed to decode: not 3 parts");
  }

  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(parts[TOKEN_CLAIMS_INDEX], "base64url").toString("utf8"),
    );

    if (!isAccessTokenClaims(decoded)) {
      throw new Error("Invalid SILAS access-token claims");
    }

    return decoded;
  } catch (error) {
    throw new Error(
      `Failed to decode SILAS access token claims: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}

/**
 * Determines whether a decoded value represents access-token claims.
 *
 * @param {unknown} value Value to validate.
 * @returns {value is AccessTokenClaims} Whether the value is access-token claims.
 */
function isAccessTokenClaims(value: unknown): value is AccessTokenClaims {
  return typeof value === "object" && value !== null;
}

/**
 * Normalizes a configured OAuth scope to its final path segment.
 *
 * @param {string} scope OAuth scope to normalize.
 * @returns {string} The final segment of the scope.
 */
function normalizeScope(scope: string): string {
  const segments = scope.split("/").filter(Boolean);
  return segments.at(LAST_SEGMENT_INDEX) ?? scope;
}

/**
 * Validates the issuer, audience, and delegated scopes in SILAS claims.
 *
 * @param {AccessTokenClaims} claims Decoded access-token claims.
 * @returns {void} Nothing when all required claims are valid.
 * @throws {Error} When a required claim is invalid.
 */
function validateAccessTokenClaims(claims: AccessTokenClaims): void {
  const expectedIss = `https://login.microsoftonline.com/${config.silas.tenantId}/v2.0`;

  if (claims.iss !== expectedIss) {
    throw new Error(
      `Unexpected SILAS token issuer. Expected '${expectedIss}', got '${claims.iss ?? "undefined"}'`,
    );
  }

  if (claims.aud !== config.silas.expectedAudience) {
    throw new Error(
      `Unexpected SILAS token audience. Expected '${config.silas.expectedAudience}', got '${claims.aud ?? "undefined"}'`,
    );
  }

  const requiredScopes = config.silas.scopes
    .filter((scope) => !OIDC_SCOPES.has(scope.toLowerCase()))
    .map(normalizeScope);

  if (requiredScopes.length === EMPTY_LENGTH) {
    return;
  }

  const tokenScopes =
    typeof claims.scp === "string" ? claims.scp.split(" ").filter(Boolean) : [];

  const hasRequiredScope = requiredScopes.some((scope) =>
    tokenScopes.includes(scope),
  );

  if (!hasRequiredScope) {
    throw new Error(
      `SILAS token missing expected delegated scope. Expected one of: ${requiredScopes.join(", ")}`,
    );
  }
}

/**
 * Sends an authentication failure response.
 *
 * @param {Response} res Express response used to send the failure status.
 * @returns {Response} The Express response.
 */
function sendAuthenticationFailure(res: Response): Response {
  return res.status(INTERNAL_SERVER_ERROR).send("");
}

/**
 * Determines whether an MSAL authentication response contains
 * the information required to establish a session.
 *
 * @param {Awaited<ReturnType<ConfidentialClientApplication["acquireTokenByCode"]>>} response
 * MSAL authentication response to validate.
 * @returns {boolean} Whether the response contains valid authentication data.
 */
function hasValidAccountResponse(
  response: Awaited<ReturnType<ConfidentialClientApplication["acquireTokenByCode"]>>,
): response is typeof response & {
  accessToken: string;
  idToken: string;
  account: {
    username: string;
    name: string;
    homeAccountId: string;
  };
} {
  return (
    response.accessToken.length > EMPTY_LENGTH &&
    response.idToken.length > EMPTY_LENGTH &&
    response.account !== null &&
    response.account.username.length > EMPTY_LENGTH &&
    (response.account.name?.length ?? EMPTY_LENGTH) > EMPTY_LENGTH &&
    response.account.homeAccountId.length > EMPTY_LENGTH
  );
}


/**
 * Handles the OAuth callback from SILAS.
 *
 * @param {Request} req Express request containing the OAuth callback.
 * @param {Response} res Express response used to complete authentication.
 * @returns {Promise<void>} A promise resolving after the response is sent.
 */
export async function callbackAction(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (code.length === EMPTY_LENGTH || state.length === EMPTY_LENGTH) {
    sendAuthenticationFailure(res);
    return;
  }

  if (state !== req.session.auth_nonce) {
    sendAuthenticationFailure(res);
    return;
  }

  try {
    const response = await msalClient.acquireTokenByCode({
      code,
      scopes: config.silas.scopes,
      redirectUri: config.silas.redirectUri,
    });

    if (!hasValidAccountResponse(response)) {
      sendAuthenticationFailure(res);
      return;
    }

    const claims = decodeToken(response.accessToken);

    validateAccessTokenClaims(claims);

    await promisify(req.session.regenerate.bind(req.session))();

    req.session.auth_nonce = undefined;

    req.session.silasAuth = {
      accessToken: response.accessToken,
      idToken: response.idToken,
      expiresAt: response.expiresOn?.getTime() ?? Date.now() + TOKEN_EXPIRY_OFFSET_MS,
      email: claims.USER_EMAIL,
      name: claims.name,
    };

    req.session.user = {
      email: response.account.username,
      name: response.account.name,
      oid: response.account.homeAccountId,
    };

    await promisify(req.session.save.bind(req.session))();

    res.redirect("/receive-call");
  } catch {
    res.status(INTERNAL_SERVER_ERROR).send("Authentication failed");
  }
}

/**
 * Logs the user out of the local session and redirects them
 * to the SILAS logout endpoint.
 *
 * @param {Request} req Express request containing the authenticated session.
 * @param {Response} res Express response used to redirect the user.
 * @returns {Promise<void>} A promise resolving after logout redirect.
 */
export async function logOut(req: Request, res: Response): Promise<void> {
  try {
    await promisify(req.session.destroy.bind(req.session))();
  } catch {
    // Local session cleanup failure should not prevent provider logout.
  }

  res.clearCookie("connect.sid");

  const logoutUrl = new URL(`${config.silas.authority}/oauth2/v2.0/logout`);

  res.redirect(logoutUrl.toString());
}