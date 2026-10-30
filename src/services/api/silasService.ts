/* c8 ignore next */
import type { Request } from "express";
import type { RedisClientType } from "redis";
import {
  type AuthenticationResult,
  ConfidentialClientApplication,
  type ICachePlugin,
  type TokenCacheContext,
  type AccountInfo,
} from "@azure/msal-node";
import type { SilasConfig } from "#types/config-types.js";
import { saveSession } from "#src/helpers/session.js";

import { randomBytes } from "node:crypto";
import { createRedisClient } from "#utils/redis.js";
import config from "#config.js";
import { EMPTY_LENGTH, ZERO , ALLOWED_LAA_ACCOUNTS} from "#src/constants.js";
import jsonwebtoken, {
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
} from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { error } from "node:console";

const NONCE_BYTES = 32;
const ENTRA_KEY_CACHE_TTL_MS = 3600000; // 1 hour

/**
 * Builds the Redis key used to persist an MSAL cache blob for a session.
 * @param {string} sessionId - The express-session ID.
 * @returns {string} - Redis key for this session's MSAL token cache.
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
   * @param {RedisClientType} redisClient - The Redis client instance.
   * @param {string} sessionId - The express-session ID to use as the cache key suffix.
   * @param {number} ttlSeconds - The TTL for the Redis key (should match session TTL).
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
   * @param {TokenCacheContext} cacheContext - The MSAL token cache context.
   */
  async afterCacheAccess(cacheContext: TokenCacheContext): Promise<void> {
    /* c8 ignore start */
    if (cacheContext.cacheHasChanged) {
      await this.redisClient.set(
        this.key,
        cacheContext.tokenCache.serialize(),
        {
          EX: this.ttlSeconds,
        },
      );
    }
    /* c8 ignore stop */
  }

  /**
   * Called by MSAL before it accesses the cache.
   * Retrieves the serialized cache blob from Redis and deserializes it into the cache context.
   * @param {TokenCacheContext} cacheContext - The MSAL token cache context.
   */
  async beforeCacheAccess(cacheContext: TokenCacheContext): Promise<void> {
    const cached = await this.redisClient.get(this.key);
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- Checks if truthy
    if (cached) {
      cacheContext.tokenCache.deserialize(cached);
      await this.redisClient.expire(this.key, this.ttlSeconds);
    }
  }
}

/**
 * Silas service for acquiring tokens. Built on ConfidentialClientApplication
 */
export class SilasService {
  private readonly config: SilasConfig;
  private readonly msalClient: ConfidentialClientApplication;

  /**
   * Constructor
   * @param {SilasConfig} silasConfig -- The silas config
   * @param {RedisCachePlugin} cachePlugin - A redis cache plugin to cache the access token
   */
  constructor(silasConfig: SilasConfig, cachePlugin?: RedisCachePlugin) {
    this.config = { ...silasConfig };
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: silasConfig.clientId,
        authority: silasConfig.authority,
        clientSecret: silasConfig.clientSecret,
      },
      cache: {
        cachePlugin,
      },
    });
  }

  /**
   * Creates an instance of this service.
   * @param {string} sessionId - The session id, if provided then a redis cache can be used
   * @returns {SilasService} - An instance of this service
   */
  static factory(sessionId?: string): SilasService {
    if (sessionId !== undefined && config.redis.enabled) {
      const redisClient = createRedisClient(config.redis);
      const cachePlugin = this.createRedisCachePlugin(redisClient, sessionId);
      return new SilasService(config.silas, cachePlugin);
    }
    return new SilasService(config.silas);
  }

  /**
   * Create redis cache plugin
   * @param {RedisClientType} redisClient -- Redis client
   * @param {string} sessionId -- the sesssion id
   * @returns {RedisCachePlugin} an instance of RedisCachePlugin
   */
  static createRedisCachePlugin(
    redisClient: RedisClientType,
    sessionId: string,
  ): RedisCachePlugin {
    return new RedisCachePlugin(redisClient, sessionId, config.redis.maxAge);
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
      authNonce = this.generateNonce();
      req.session.auth_nonce = authNonce;
      await saveSession(req);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- nonce will be a string
    return authNonce as string;
  }

  /**
   * Generate a nonce
   * @returns {string} - Generated nonce
   */
  private generateNonce(): string {
    return randomBytes(NONCE_BYTES).toString("base64url");
  }

  /**
   * Creates the URL of the authorization request
   * @param {Request} req - The express request
   * @returns {string} - The url to redirect the user to autheticate with entra
   */
  async getAuthCodeUrl(req: Request): Promise<string> {
    const authNonce = await this.getAuthNonce(req);
    const authUrl = await this.msalClient.getAuthCodeUrl({
      scopes: this.config.scopes,
      redirectUri: this.config.redirectUri,
      state: authNonce,
    });
    return authUrl;
  }

  /**
   * Acquires a token by exchanging the Authorization Code received from the first step of OAuth2.0
   * Authorization Code flow.
   * @param {string} code - The code received
   * @returns {AuthenticationResult} - The authentication result consisting of the access token and refresh token
   */
  async acquireTokenByCode(code: string): Promise<AuthenticationResult> {
    const result = await this.msalClient.acquireTokenByCode({
      code,
      scopes: this.config.scopes,
      redirectUri: this.config.redirectUri,
    });
    await this.verify(result.accessToken);
    return result;
  }

  /**
   * Acquire a downstream API access token using the MSAL account resolved from
   * the session-scoped token cache partition.
   *
   * @param {string} homeAccountId - Session-persisted MSAL homeAccountId reference.
   * @returns {string} - The access token
   */
  async acquireDownstreamAccessToken(homeAccountId: string): Promise<string> {
    const result = await this.acquireTokenSilent(homeAccountId);
    return result.accessToken;
  }

  /**
   * Acquires token silently either from cache or using the refresh token
   * @param {string} homeAccountId - The home account id
   * @returns {AuthenticationResult} - The authentication result consisting of the access token and refresh token
   */
  async acquireTokenSilent(
    homeAccountId: string,
  ): Promise<AuthenticationResult> {
    if (homeAccountId.trim().length === EMPTY_LENGTH) {
      throw new Error(
        "The authenticated session has no MSAL account reference",
      );
    }
    const account = await this.msalClient
      .getTokenCache()
      .getAccountByHomeId(homeAccountId);
    if (account === null) {
      throw new Error("Could not find account to refresh");
    }

    try {
      return await this.msalClient.acquireTokenSilent({
        account,
        scopes: [...this.config.scopes],
      });
    } catch (err) {
      throw new Error("Could not refresh token", { cause: err });
    }
  }

  /* c8 ignore start */
  /**
   * Get public key for given key id.
   * @param {string} kid - Key ID
   * @returns {string} - The entra public key for the given key id
   */
  async getPublicKey(kid: string): Promise<string> {
    // we do not want to call this in our unit test as this will make request entra
    const client = this.getJwksClient();
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
  }
  /* c8 ignore stop */

  /* c8 ignore start */
  /**
   * Makes easier to mock the signing key
   * @returns {jwksClient.JwksClient} - Gets a jwksClient
   */
  getJwksClient(): jwksClient.JwksClient {
    // we do not want to call this in our unit test as this will make request entra
    return jwksClient({
      jwksUri: `https://login.microsoftonline.com/${this.config.tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: ENTRA_KEY_CACHE_TTL_MS,
    });
  }
  /* c8 ignore stop */

  /**
   * Decodes the claims portion of a JWT access token.
   * @param {string} token JWT access token to decode.
   * @throws {JsonWebTokenError | TokenExpiredError | NotBeforeError | Error}
   */
 /**
   * Decodes the claims portion of a JWT access token.
   * @param {string} token JWT access token to decode.
   * @throws {JsonWebTokenError | TokenExpiredError | NotBeforeError | Error}
   */
  async verify(token: string): Promise<void> {
    const kid = this.getAccessTokenKID(token);
    const pubKey = await this.getPublicKey(kid);
    const payload = jsonwebtoken.verify(token, pubKey, {
      audience: this.config.expectedAudience,
      issuer: `https://login.microsoftonline.com/${this.config.tenantId}/v2.0`,
      algorithms: ["RS256"],
    }) as jsonwebtoken.JwtPayload;

  //cover all edge cases- future proof 
  const laaAccounts = [payload.LAA_ACCOUNTS]
  .flat(Infinity)
  .filter((x) => ["string", "number", "bigint", "boolean"].includes(typeof x) && x !== "" && x === x)
  .map((x) => (typeof x === "boolean" ? String(+x) : String(x)));
   
    //Check if it's inside the constant
    const allAllowed =
      laaAccounts.length > EMPTY_LENGTH &&
      laaAccounts.every((account) => ALLOWED_LAA_ACCOUNTS.includes(account));

    if (!allAllowed) {
      throw new Error("LAA_ACCOUNTS not in the allowed list");
    }
  }

  /**
   * Get key id used in a given access token.
   * @param {string} accessToken - Access token
   * @returns {string} - The Key ID used in the access token
   */
  getAccessTokenKID(accessToken: string): string {
    const parts = accessToken.split(".");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- this returns an object
    const header = JSON.parse(
      Buffer.from(parts[ZERO], "base64url").toString(),
    ) as Record<string, string>;
    return header.kid;
  }
  /* c8 ignore next */
}

