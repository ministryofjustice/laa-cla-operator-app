import { randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";

import { ConfidentialClientApplication } from "@azure/msal-node";
import type { Request, Response } from "express";

import config from "#config.js";
import type { AccessTokenClaims } from "#types/auth-types.js";
import jsonwebtoken from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const EPHEMERAL_SUFFIX =
  "laa-cla-operator-app.cloud-platform.service.justice.gov.uk";
const NONCE_BYTES = 32;
const DEFAULT_SESSION_MINUTES = 30;
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const INTERNAL_SERVER_ERROR = 500;
const EMPTY_LENGTH = 0;
const LAST_SEGMENT_INDEX = -1;

const TOKEN_EXPIRY_OFFSET_MS =
  DEFAULT_SESSION_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

const OIDC_SCOPES = new Set(["openid", "profile", "offline_access"]);
const ENTRA_KEY_CACHE_TTL_MS = 3600000; // 1 hour

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: config.silas.clientId,
    authority: config.silas.authority,
    clientSecret: config.silas.clientSecret,
  },
});

/**
 * Get a querystring as a string
 * @param {Request} request - The express request
 * @param {string} key - Which querystring to get
 * @returns {string | undefined} - The querysyting value
 */
function getQueryStringAsString(
  request: Request,
  key: string,
): string | undefined {
  // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- direct access is much cleaner here
  const value = request.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Redirects user to main uat if they are on a ephemeral environment for silas authentication
 * @param {"login" | "redirect"} action - The action under which this function is being called under
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @returns {boolean} - Returns true if the user was redirected
 */
export async function processUATRedirect(
  action: "login" | "redirect",
  req: Request,
  res: Response,
): Promise<boolean> {
  if (action === "login") {
    const returnTo = getQueryStringAsString(req, "return_to");
    if (config.app.environment.toLowerCase() === "ephemeral") {
      if (config.SERVICE_URL !== undefined) {
        const nonce = randomUUID();
        req.session.auth_nonce = nonce;
        await saveSession(req);
        // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- Direct property access is clearer here
        const domain = new URL(config.silas.redirectUri).origin;
        const redirect = `${domain}/login?return_to=https://${config.SERVICE_URL}/redirect&nonce=${nonce}`;
        res.redirect(redirect);
        return true;
      }
    } else if (
      config.app.environment.toLowerCase() === "uat" &&
      returnTo !== undefined
    ) {
      // limit redirects those on our namespace
      // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- direct access is much cleaner here
      const returnToDomain = new URL(returnTo).origin;
      if (!returnToDomain.endsWith(EPHEMERAL_SUFFIX)) {
        throw new Error(
          `Return to does not belong to our namespace: ${returnTo}`,
        );
      }

      if (req.query.nonce !== undefined) {
        req.session.auth_nonce = getQueryStringAsString(req, "nonce");
      }
      req.session.return_to = returnTo;
      await saveSession(req);
      return false;
    }
  } else if (
    config.app.environment.toLocaleLowerCase() === "uat" &&
    req.session.return_to !== undefined
  ) {
    const queryString = new URLSearchParams(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- query parameters will be a single value here
      req.query as Record<string, string>,
    ).toString();
    const redirect = `${req.session.return_to}?${queryString}`;
    console.log("Redirect is ", redirect);
    res.redirect(redirect);
    return true;
  }
  return false;
}

/**
 * Tries to find auth nonce in req.session.auth_nonce otherwise creates and saves in the session and returns it
 * @param {Request} req - Express Request object
 * @returns {Promise<string>} - Returns the nonce to use for the auth
 */
async function getAuthNonce(req: Request): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- Direct property access is clearer here
  let authNonce = req.session.auth_nonce;
  if (authNonce === undefined) {
    authNonce = randomBytes(NONCE_BYTES).toString("base64url");
    req.session.auth_nonce = authNonce;
    await saveSession(req);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- nonce will be a string
  return authNonce as string;
}

/**
 * Handles the initial SILAS login request and redirects the user to Microsoft.
 *
 * @param {Request} req Express request containing the authenticated session.
 * @param {Response} res Express response used to redirect the user.
 * @returns {Promise<void>} A promise that resolves after the redirect.
 */
export async function loginAction(req: Request, res: Response): Promise<void> {
  const userRedirected = await processUATRedirect("login", req, res);
  if (userRedirected) {
    return;
  }
  const authNonce = await getAuthNonce(req);
  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: config.silas.scopes,
    redirectUri: config.silas.redirectUri,
    state: authNonce,
  });

  res.redirect(authUrl);
}

/**
 * Decodes the claims portion of a JWT access token.
 * @param {string} token JWT access token to decode.
 * @returns {AccessTokenClaims} The decoded access-token claims.
 * @throws {Error} When the token cannot be decoded.
 */
async function decodeToken(token: string): Promise<AccessTokenClaims> {
  const kid = getAccessTokenKID(token);
  const pubKey = await getPublicKey(kid);
  const claims = jsonwebtoken.verify(token, pubKey, {
    audience: config.silas.expectedAudience,
    issuer: `https://login.microsoftonline.com/${config.silas.tenantId}/v2.0`,
    algorithms: ["RS256"],
  });
  if (typeof claims === "string") {
    throw new Error("Access token could not be decoded");
  }
  return claims as AccessTokenClaims;
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
 * Validates access token scopes.
 *
 * @param {AccessTokenClaims} claims Decoded access-token claims.
 * @returns {void} Nothing when all required claims are valid.
 * @throws {Error} When a required claim is invalid.
 */
function validateAccessTokenScopes(claims: AccessTokenClaims): void {
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
 * @returns {void} Sends the authentication failure response.
 */
function sendAuthenticationFailure(res: Response): void {
  res.status(INTERNAL_SERVER_ERROR).send("");
}

/**
 * Saves the current request session.
 *
 * @param {Request} req Express request containing the session to save.
 * @returns {Promise<void>} A promise resolving after the session is saved.
 */
async function saveSession(req: Request): Promise<void> {
  const save = promisify((callback: (error?: unknown) => void): void => {
    req.session.save(callback);
  });

  await save();
}

/**
 * Regenerates the current request session.
 *
 * @param {Request} req Express request containing the session to regenerate.
 * @returns {Promise<void>} A promise resolving after the session is regenerated.
 */
async function regenerateSession(req: Request): Promise<void> {
  const regenerate = promisify((callback: (error?: unknown) => void): void => {
    req.session.regenerate(callback);
  });

  await regenerate();
}

/**
 * Destroys the current request session.
 *
 * @param {Request} req Express request containing the session to destroy.
 * @returns {Promise<void>} A promise resolving after the session is destroyed.
 */
async function destroySession(req: Request): Promise<void> {
  const destroy = promisify((callback: (error?: unknown) => void): void => {
    req.session.destroy(callback);
  });

  await destroy();
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
  response: Awaited<
    ReturnType<ConfidentialClientApplication["acquireTokenByCode"]>
  >,
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
 * Validate code and state from an entra redirect
 * @param {string} code - The entra code that will be exchange for an access token
 * @param {state} state - The alue that was added to the original lokin request
 * @param {Request} req - Express request object
 * @returns {boolean} - Whether the given values are valid
 */
function validateCodeAndState(
  code: string,
  state: string,
  req: Request,
): boolean {
  if (code.length === EMPTY_LENGTH || state.length === EMPTY_LENGTH) {
    return false;
  }

  if (state !== req.session.auth_nonce) {
    return false;
  }
  return true;
}
/**
 * Handles the OAuth callback from SILAS.
 *
 * @param {Request} req Express request containing the OAuth callback.
 * @param {Response} res Express response used to complete authentication.
 * @returns {Promise<void>} A promise resolving after the response is sent.
 */
export async function callbackAction(
  req: Request,
  res: Response,
): Promise<void> {
  // ON UAT we might need to proxy to an ephemeral environment
  const userRedirected = await processUATRedirect("redirect", req, res);
  if (userRedirected) {
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (!validateCodeAndState(code, state, req)) {
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

    const claims = await decodeToken(response.accessToken);

    validateAccessTokenScopes(claims);

    await regenerateSession(req);

    const { session } = req;

    session.auth_nonce = undefined;

    session.silasAuth = {
      accessToken: response.accessToken,
      idToken: response.idToken,
      expiresAt:
        response.expiresOn?.getTime() ?? Date.now() + TOKEN_EXPIRY_OFFSET_MS,
      email: claims.USER_EMAIL,
      name: claims.name,
    };

    session.user = {
      email: response.account.username,
      name: response.account.name,
      oid: response.account.homeAccountId,
    };

    await saveSession(req);

    res.redirect("/receive-call");
  } catch {
    res.status(INTERNAL_SERVER_ERROR).send("Authentication failed");
  }
}

/**
 * Get public key for given key id.
 * @param {string} kid - Key ID
 * @returns {string} - The entra public key for the given key id
 */
async function getPublicKey(kid: string) {
  const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${config.silas.tenantId}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: ENTRA_KEY_CACHE_TTL_MS,
  });
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

/**
 * Get key id used in a given access token.
 * @param {string} accessToken - Access token
 * @returns {string} - The Key ID used in the access token
 */
function getAccessTokenKID(accessToken: string): string {
  const parts = accessToken.split(".");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  if (header.kid === undefined) {
    throw new Error("Access token is missing a valid header");
  }
  return header.kid;
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
    await destroySession(req);
  } catch {
    // Local session cleanup failure should not prevent provider logout.
  }

  res.clearCookie("connect.sid");

  const logoutUrl = new URL(`${config.silas.authority}/oauth2/v2.0/logout`);

  res.redirect(logoutUrl.toString());
}
