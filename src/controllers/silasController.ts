
import { randomBytes } from "node:crypto";
import config from "#config.js"
import { ConfidentialClientApplication } from "@azure/msal-node"
import { AccessTokenClaims } from "#types/auth-types.js";

const OIDC_SCOPES = new Set(['openid', 'profile', 'offline_access']);
const msalConfig = {
    auth: {
        clientId: config.silas.clientId,
        authority: config.silas.authority,
        clientSecret: config.silas.clientSecret, 
    }
};


export async function loginAction(req: any, res: any) {
        const nonce = randomBytes(32).toString("base64url")
        const authCodeUrlParameters = {
            scopes: config.silas.scopes,
            redirectUri: config.silas.redirectUri,
            state: nonce,
        };
        req.session.auth_nonce = nonce
        req.session.save()
        const msalClient = new ConfidentialClientApplication(msalConfig);
        // Get the URL to sign the user in and redirect them
        const response = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
        res.redirect(response);
}

export async function callbackAction(req: any, res: any) {
    const code = typeof req.query.code == "string" ? req.query.code : ""
	const state = typeof req.query.state == "string" ? req.query.state : ""
	console.log("Recieved code", code)
	console.log("Recieved state", state)
	if (!code) {
		console.error("Entra callback - Invalid code")
		return res.status(500).send("")
	}
	if (!state) {
		console.error("Entra callback - Invalid state")
		return res.status(500).send("")
	}
    const tokenRequest = {
        code: code, // The Authorization Code from Entra
        scopes: config.silas.scopes,
        redirectUri: config.silas.redirectUri,
    };

    try {
        const msalClient = new ConfidentialClientApplication(msalConfig)
        const response = await msalClient.acquireTokenByCode(tokenRequest);

        // Success! We have a token for the user.
        // response.accessToken contains the 'scp' claim.
        console.log("User Token Acquired!");
        req.session.regenerate((regenErr: any) => {
        if (regenErr !== null && regenErr !== undefined) {
            console.error("Session regeneration failed: ", regenErr instanceof Error ? regenErr.message : String(regenErr));
            return;
        }

        if (!response || !response.accessToken || !response.idToken || !response.account || !response.account.username || !response.account.name || !response.account.homeAccountId) {
            console.error("Entra callback - Invalid response from Entra:", response);
            return res.status(500).send("Invalid response from Entra");
        }

        const payload = decodeToken(response.accessToken)
        validateAccessTokenClaims(payload);

        console.log("Response from Entra:", response);
        
        req.session.silasAuth = {
            accessToken: response.accessToken,
            idToken: response.idToken,
            expiresAt: response.expiresOn?.getTime() ?? Date.now() + (30 * 60 * 1000),
            email: payload.USER_EMAIL,
            name: payload.name
        };

        req.session.user = {
            email: response.account.username,
            name: response.account.name,
            oid: response.account.homeAccountId,
        };

        console.log("SILAS AUTH:", req.session.silasAuth);

        // decode the tome
        req.session.save((saveErr: any) => {
            if (saveErr !== null && saveErr !== undefined) {
                console.error("Session save failed: ", saveErr instanceof Error ? saveErr.message : String(saveErr));
                return;
            }
            return res.redirect('/receive-call');
        });
    });
    } catch (error) {
        console.log("This has run")
        console.error(error);
        res.status(500).send(error);
    }
}


function decodeToken(token:string): AccessTokenClaims {
	//decode the JWT Token 
	const parts = token.split('.')

	if (parts.length !== 3) {
		throw new Error('Silas Token failed to decode, not 3 parts')
	}

	try {
    const payloadBuffer = Buffer.from(parts[1], 'base64url');
    const payload = JSON.parse(payloadBuffer.toString('utf8')) as AccessTokenClaims;
    return payload;
  } catch (error) {
    throw new Error(`Failed to decode SILAS access token claims: ${error instanceof Error ? error.message : String(error)}`);
  }


}

function normalizeScope(scope: string): string {
  if (!scope.includes('/')) {
    return scope;
  }
  const segments = scope.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? scope;
}

function validateAccessTokenClaims(claims: AccessTokenClaims): void {

	const expectedIss =  `https://login.microsoftonline.com/${config.silas.tenantId}/v2.0`;
  	if (claims.iss !== expectedIss) {
    	throw new Error(`Unexpected SILAS token issuer. Expected '${expectedIss}', got '${claims.iss ?? 'undefined'}'`);
  	}

  if (claims.aud !== config.silas.expectedAudience) {
    throw new Error(`Unexpected SILAS token audience. Expected '${config.silas.expectedAudience}', got '${claims.aud ?? 'undefined'}'`);
  }

  const configuredApiScopes = config.silas.scopes
    .filter((scope) => !OIDC_SCOPES.has(scope.toLowerCase()))
    .map(normalizeScope);

  if (configuredApiScopes.length === 0) {
    return;
  }

    if (configuredApiScopes.length === 0) {
    return;
  }

  const tokenScopeValues = typeof claims.scp === 'string'
    ? claims.scp.split(' ').map((scope) => scope.trim()).filter(Boolean)
    : [];

  const hasConfiguredScope = configuredApiScopes.some((scope) => tokenScopeValues.includes(scope));

  if (!hasConfiguredScope) {
    throw new Error(
      `SILAS token missing expected delegated scope. Expected one of: ${configuredApiScopes.join(', ')}`
    );
  }

}