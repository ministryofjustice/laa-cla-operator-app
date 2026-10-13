import {Request} from "express"
import type { RedisClientType } from "redis";
import { AuthenticationResult, ConfidentialClientApplication, ICachePlugin, TokenCacheContext, AccountInfo } from "@azure/msal-node";
import { RedisConfig, SilasConfig } from "#types/config-types.js";
import { saveSession } from "#src/helpers/session.js";

import type { AccessTokenClaims } from "#types/auth-types.js";
import jsonwebtoken from "jsonwebtoken";
import jwksClient from "jwks-rsa";

import { randomBytes } from "node:crypto";
import { createRedisClient } from "#utils/redis.js";
import config from "#config.js";
import { EMPTY_LENGTH } from "#src/constants.js";

const NONCE_BYTES = 32;
const ENTRA_KEY_CACHE_TTL_MS = 3600000; // 1 hour
const OIDC_SCOPES = new Set(["openid", "profile", "offline_access"]);

/**
 * Builds the Redis key used to persist an MSAL cache blob for a session.
 * @param sessionId - The express-session ID.
 * @returns Redis key for this session's MSAL token cache.
 */
export function getMsalCacheKey(sessionId: string): string {
  return `msal:${sessionId}`;
}

export interface TokenExchangeResult {
  accessToken: string;
  account: AccountInfo | null;
  idToken: string;
}


/**
 * MSAL cache plugin that persists the token cache to Redis.
 * Implements the ICachePlugin interface to intercept MSAL cache operations
 * and store the serialized cache blob in Redis keyed by session ID.
 */
export class RedisCachePlugin implements ICachePlugin {
  private readonly key: string;

  /**
   * Creates a RedisCachePlugin instance.
   * @param redisClient - The Redis client instance.
   * @param sessionId - The express-session ID to use as the cache key suffix.
   * @param ttlSeconds - The TTL for the Redis key (should match session TTL).
   */
  constructor(
    private readonly redisClient: RedisClientType,
    sessionId: string,
    private readonly ttlSeconds: number,
  ) {
    this.key = getMsalCacheKey(sessionId);
  }

  /**
   * Called by MSAL after it accesses the cache.
   * If the cache has changed, serializes it and stores in Redis with the configured TTL.
   * @param cacheContext - The MSAL token cache context.
   */
  async afterCacheAccess(cacheContext: TokenCacheContext): Promise<void> {
    if (cacheContext.cacheHasChanged) {
      await this.redisClient.set(
        this.key,
        cacheContext.tokenCache.serialize(),
        {
          EX: this.ttlSeconds,
        },
      );
    }
  }

  /**
   * Called by MSAL before it accesses the cache.
   * Retrieves the serialized cache blob from Redis and deserializes it into the cache context.
   * @param cacheContext - The MSAL token cache context.
   */
  async beforeCacheAccess(cacheContext: TokenCacheContext): Promise<void> {
    const cached = await this.redisClient.get(this.key);
    if (cached) {
      cacheContext.tokenCache.deserialize(cached);
      await this.redisClient.expire(this.key, this.ttlSeconds);
    }
  }
}


export class SilasService {
    private config: SilasConfig
    private msalClient: ConfidentialClientApplication

    constructor(silasConfig: SilasConfig, cachePlugin?: RedisCachePlugin) {
        this.config = silasConfig
        this.msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: silasConfig.clientId,
                authority: silasConfig.authority,
                clientSecret: silasConfig.clientSecret
            },
            cache: {
                cachePlugin: cachePlugin
            }
        });
    }

    static factory(sessionId?: string): SilasService {
        if(sessionId !== undefined && config.redis.enabled) {
            console.log(`factory called with sesssionId: ${sessionId}`)
            const redisClient = createRedisClient(config.redis)
            const cachePlugin = new RedisCachePlugin(redisClient, sessionId, config.redis.maxAge)
            return new SilasService(config.silas, cachePlugin)
        }
        return new SilasService(config.silas)
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
   * Acquire a downstream API access token using the MSAL account resolved from
   * the session-scoped token cache partition.
   *
   * @param homeAccountId - Session-persisted MSAL homeAccountId reference.
   * @returns {string} - The access token
   */
  async acquireDownstreamAccessToken(homeAccountId: string): Promise<string> {
    const result = await this.refreshToken(homeAccountId)
    return result.accessToken
  }

    async refreshToken(homeAccountId: string): Promise<AuthenticationResult> {
        if (homeAccountId.trim().length === EMPTY_LENGTH) {
            throw new Error("The authenticated session has no MSAL account reference")
        }
        const account = await this.msalClient.getTokenCache().getAccountByHomeId(homeAccountId)
        if(account === null) {
            throw new Error("Could not find account to refresh")
        }

        try {
            return await this.msalClient.acquireTokenSilent({account, scopes: [...this.config.scopes]})
        }
        catch(err) {
            throw new Error("Could not refresh token", {cause: err})
        }
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