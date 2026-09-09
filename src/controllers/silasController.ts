import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import config from "#config.js";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { AccessTokenClaims, } from "#types/auth-types.js";

const OIDC_SCOPES = new Set(["openid", "profile", "offline_access"]);

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: config.silas.clientId,
    authority: config.silas.authority,
    clientSecret: config.silas.clientSecret,
  },
});

export async function loginAction(req: any, res: any) {
  const nonce = randomBytes(32).toString("base64url");
  req.session.auth_nonce = nonce;
  await promisify(req.session.save).call(req.session);

  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: config.silas.scopes,
    redirectUri: config.silas.redirectUri,
    state: nonce,
  });
  res.redirect(authUrl);
}


function decodeToken(token: string): AccessTokenClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Silas token failed to decode: not 3 parts");
  }
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch (error) {
    throw new Error(
      `Failed to decode SILAS access token claims: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function normalizeScope(scope: string): string {
  const segments = scope.split("/").filter(Boolean);
  return segments.at(-1) ?? scope;
}

function validateAccessTokenClaims(claims: AccessTokenClaims): void {
  const expectedIss = `https://login.microsoftonline.com/${config.silas.tenantId}/v2.0`;
  if (claims.iss !== expectedIss) {
    throw new Error(`Unexpected SILAS token issuer. Expected '${expectedIss}', got '${claims.iss ?? "undefined"}'`);
  }
  if (claims.aud !== config.silas.expectedAudience) {
    throw new Error(`Unexpected SILAS token audience. Expected '${config.silas.expectedAudience}', got '${claims.aud ?? "undefined"}'`);
  }

  const requiredScopes = config.silas.scopes
    .filter((scope) => !OIDC_SCOPES.has(scope.toLowerCase()))
    .map(normalizeScope);

  if (requiredScopes.length === 0) return;

  const tokenScopes = typeof claims.scp === "string" ? claims.scp.split(" ").filter(Boolean) : [];
  const hasRequiredScope = requiredScopes.some((scope) => tokenScopes.includes(scope));

  if (!hasRequiredScope) {
    throw new Error(`SILAS token missing expected delegated scope. Expected one of: ${requiredScopes.join(", ")}`);
  }
}


export async function callbackAction(req: any, res: any) {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (!code || !state) {

    return res.status(500).send("");
  }
  if (state !== req.session.auth_nonce) {
    return res.status(500).send("");
  }

  try {
    const response = await msalClient.acquireTokenByCode({
      code,
      scopes: config.silas.scopes,
      redirectUri: config.silas.redirectUri,
    });

    if (
      !response?.accessToken ||
      !response.idToken ||
      !response.account?.username ||
      !response.account?.name ||
      !response.account?.homeAccountId
    ) {

      return res.status(500).send("");
    }

    const claims = decodeToken(response.accessToken);
    validateAccessTokenClaims(claims);

    await promisify(req.session.regenerate).call(req.session);

    req.session.auth_nonce = undefined;
    req.session.silasAuth = {
      accessToken: response.accessToken,
      idToken: response.idToken,
      expiresAt: response.expiresOn?.getTime() ?? Date.now() + 30 * 60 * 1000,
      email: claims.USER_EMAIL,
      name: claims.name,
    };
    req.session.user = {
      email: response.account.username,
      name: response.account.name,
      oid: response.account.homeAccountId,
    };

    await promisify(req.session.save).call(req.session);
    return res.redirect("/receive-call");
  } catch (error) {
    return res.status(500).send("Authentication failed");
  }
}

export async function logOut(req: any, res: any) {
  try {
    await promisify(req.session.destroy).call(req.session);
  } catch {
  }
  res.clearCookie("connect.sid");

  const logoutUrl = new URL(`${config.silas.authority}/oauth2/v2.0/logout`);

  return res.redirect(logoutUrl.toString());
}