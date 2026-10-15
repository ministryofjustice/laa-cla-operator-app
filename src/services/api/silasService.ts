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
import { EMPTY_LENGTH } from "#src/constants.js";

const NONCE_BYTES = 32;

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
    this.config = silasConfig;
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
    console.log("I should not be here");
    if (sessionId !== undefined && config.redis.enabled) {
      console.log(`factory called with sesssionId: ${sessionId}`);
      const redisClient = createRedisClient(config.redis);
      const cachePlugin = new RedisCachePlugin(
        redisClient,
        sessionId,
        config.redis.maxAge,
      );
      return new SilasService(config.silas, cachePlugin);
    }
    return new SilasService(config.silas);
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
    console.log("I SHOULD NOT BE HERE");
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
}
