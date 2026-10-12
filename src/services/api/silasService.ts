import {Request} from "express"
import { AuthenticationResult, ConfidentialClientApplication } from "@azure/msal-node";
import { SilasConfig } from "#types/config-types.js";
import { saveSession } from "#src/helpers/session.js";

import type { AccessTokenClaims } from "#types/auth-types.js";
import jsonwebtoken from "jsonwebtoken";
import jwksClient from "jwks-rsa";

import { randomBytes } from "node:crypto";

const NONCE_BYTES = 32;
const ENTRA_KEY_CACHE_TTL_MS = 3600000; // 1 hour
const OIDC_SCOPES = new Set(["openid", "profile", "offline_access"]);

let service: SilasService | null = null
export class SilasService {
    private config: SilasConfig
    private msalClient: ConfidentialClientApplication

    constructor(config: SilasConfig) {
        this.config = config
        this.msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: config.clientId,
                authority: config.authority,
                clientSecret: config.clientSecret
            },
        });
    }

    /**
     * Factory method to create a singleton of a silas service
     * @param {SilasConfig} config - The silas config
     * @returns {SilasService} - The single silas service.
     */
    public static Singleton(config: SilasConfig): SilasService {
        if(service === null) {
            service = new SilasService(config)
        }
        return service
    }

    /**
     * Tries to find auth nonce in req.session.auth_nonce otherwise creates and saves in the session and returns it
     * @param {Request} req - Express Request object
     * @returns {Promise<string>} - Returns the nonce to use for the auth
     */
    async getAuthNonce(req: Request): Promise<string> {
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
     * 
     * @param {Request} req - The express request
     * @returns {string} - The url to redirect the user to autheticate with entra
     */
    async getAuthUrl(req: Request): Promise<string> {
        const authNonce = await this.getAuthNonce(req);
        const authUrl = await this.msalClient.getAuthCodeUrl({
            scopes: this.config.scopes,
            redirectUri: this.config.redirectUri,
            state: authNonce,
        });
        return authUrl
    }

    async exchangeAuthCode(code: string): Promise<AuthenticationResult> {
        return await this.msalClient.acquireTokenByCode({
            code,
            scopes: this.config.scopes,
            redirectUri: this.config.redirectUri,
        });
    }

    /**
     * Get public key for given key id.
     * @param {string} kid - Key ID
     * @returns {string} - The entra public key for the given key id
     */
    async getPublicKey(kid: string) {
        const client = this.getJwksClient()
        const key = await client.getSigningKey(kid);
        return key.getPublicKey();
    }

    /**
     * Makes easier to mock the signing key
     * @returns {jwksClient.JwksClient} - Gets a jwksClient
     */
    getJwksClient(): jwksClient.JwksClient {
        return jwksClient({
            jwksUri: `https://login.microsoftonline.com/${this.config.tenantId}/discovery/v2.0/keys`,
            cache: true,
            cacheMaxAge: ENTRA_KEY_CACHE_TTL_MS,
        });
    }

    /**
     * Decodes the claims portion of a JWT access token.
     * @param {string} token JWT access token to decode.
     * @returns {AccessTokenClaims} The decoded access-token claims.
     * @throws {Error} When the token cannot be decoded.
     */
    async decodeToken(token: string): Promise<AccessTokenClaims> {
        const kid = this.getAccessTokenKID(token);
        const pubKey = await this.getPublicKey(kid);
        const claims = jsonwebtoken.verify(token, pubKey, {
            audience: this.config.expectedAudience,
            issuer: `https://login.microsoftonline.com/${this.config.tenantId}/v2.0`,
            algorithms: ["RS256"],
        });
        if (typeof claims === "string") {
            throw new Error("Access token could not be decoded");
        }
        return claims as AccessTokenClaims;
    }

    /**
     * Get key id used in a given access token.
     * @param {string} accessToken - Access token
     * @returns {string} - The Key ID used in the access token
     */
    getAccessTokenKID(accessToken: string) {
        const parts = accessToken.split(".");
        const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
        if (header.kid === undefined) {
            throw new Error("Access token is missing a valid header");
        }
        return header.kid;
    }

    /**
     * Validates access token scopes.
     *
     * @param {AccessTokenClaims} claims Decoded access-token claims.
     * @returns {void} Nothing when all required claims are valid.
     * @throws {Error} When a required claim is invalid.
     */
    validateAccessTokenScopes(claims: AccessTokenClaims): void {
    const requiredScopes = this.config.scopes
        .filter((scope) => !OIDC_SCOPES.has(scope.toLowerCase()))
        .map(this.normalizeScope);

        if (requiredScopes.length === 0) {
            return;
        }

        const tokenScopes = typeof claims.scp === "string" ? claims.scp.split(" ").filter(Boolean) : [];

        const hasRequiredScope = requiredScopes.some((scope) => tokenScopes.includes(scope));

        if (!hasRequiredScope) {
            throw new Error(
                `SILAS token missing expected delegated scope. Expected one of: ${requiredScopes.join(", ")}`,
            );
        }
    }

    /**
     * Normalizes a configured OAuth scope to its final path segment.
     *
     * @param {string} scope OAuth scope to normalize.
     * @returns {string} The final segment of the scope.
     */
    normalizeScope(scope: string): string {
        const segments = scope.split("/").filter(Boolean);
        return segments.at(-1) ?? scope;
    }

}