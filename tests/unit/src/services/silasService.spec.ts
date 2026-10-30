import assert from "node:assert/strict";
import config from "#config.js";
import {
  RedisCachePlugin,
  SilasService,
} from "#src/services/api/silasService.js";
import { afterEach, describe, it } from "mocha";
import sinon from "sinon";
import { createTestRequest } from "../controllers/index.js";
import type { AuthenticationResult } from "@azure/msal-node";
import { createCachedMsalBlob } from "./silasService.cachedata.spec.js";
import type { RedisClientType } from "#node_modules/redis/dist/index.js";
import crypto from "node:crypto";
import jsonwebtoken, {
  JsonWebTokenError,
  SignOptions,
  TokenExpiredError,
} from "jsonwebtoken";
import { ALLOWED_LAA_ACCOUNTS } from "#src/constants.js";

interface GenerateAccessTokenOptions {
  tenantId: string;
  expires?: string;
  audience?: string;
  issuer?: string;
  algorithm?: string;
  laaAccounts?: string | string[];
}

const TEST_TENANT_ID = "test-tenant-id";
const TEST_AUDIENCE = "test-audience";
const ALLOWED_ACCOUNT = ALLOWED_LAA_ACCOUNTS[0];

function assertAuthCodeUrl(url: URL, expectedNonceValue?: string) {
  if (expectedNonceValue !== undefined) {
    assert.equal(
      url.searchParams.get("state"),
      expectedNonceValue,
      "redirect url should contain generated state",
    );
  } else {
    assert.equal(
      url.searchParams.get("state") !== undefined,
      true,
      "redirect url should contain generated state",
    );
  }
  assert.equal(url.origin, "https://login.microsoftonline.com");
  assert.equal(
    url.pathname,
    `/${config.silas.tenantId}/oauth2/v2.0/authorize`,
    "redirect url should contain authorisation path",
  );
  assert.equal(
    url.searchParams.get("client_id"),
    config.silas.clientId,
    "redirect url should contain the client id",
  );
  assert.equal(
    url.searchParams.get("redirect_uri"),
    config.silas.redirectUri,
    "redirect should contain redirect uri",
  );

  const actualScopes = url.searchParams.get("scope")?.split(" ");
  if (actualScopes === undefined) {
    assert.fail("redirect url should contain a scope");
  }
  assert.ok(
    config.silas.scopes.every((scope) => actualScopes.includes(scope)),
    "all scopes should be should be in the redirect url",
  );
}

function generateAccessToken(
  args: GenerateAccessTokenOptions,
): Record<string, string> {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const payload = {
    name: "Test user",
    username: "test.user@justice.gov.uk",
    LAA_ACCOUNTS: args.laaAccounts ?? ALLOWED_ACCOUNT,
  };
  const options = {
    algorithm: args.algorithm ?? "RS256",
    issuer:
      args.issuer ?? `https://login.microsoftonline.com/${args.tenantId}/v2.0`,
    audience: args.audience ?? TEST_AUDIENCE,
    expiresIn: args.expires ?? "1h",
    header: {
      kid: "rsa-key-2026-01",
      alg: args.algorithm ?? "RS256",
    },
  } as SignOptions;
  const accessToken = jsonwebtoken.sign(payload, privateKey, options);
  return { accessToken, publicKey };
}

/**
 * Builds a SilasService configured with the test tenant and audience.
 * @returns {SilasService} service instance
 */
function buildVerifyService(): SilasService {
  const silasConfig = { ...config.silas };
  Object.assign(silasConfig, {
    tenantId: TEST_TENANT_ID,
    expectedAudience: TEST_AUDIENCE,
  });
  return new SilasService(silasConfig);
}

/**
 * Runs service.verify with jsonwebtoken.verify stubbed to return the given
 * payload. Needed for payload shapes that cannot survive real JWT JSON
 * serialisation (NaN, bigint, undefined, plain string payloads, etc.).
 * @param {unknown} payload - The value jsonwebtoken.verify should return
 */
async function verifyWithStubbedPayload(payload: unknown): Promise<void> {
  const service = buildVerifyService();
  const { accessToken, publicKey } = generateAccessToken({
    tenantId: TEST_TENANT_ID,
  });
  sinon.stub(service, "getPublicKey").resolves(publicKey);
  sinon.stub(jsonwebtoken, "verify").returns(payload as any);
  await service.verify(accessToken);
}

const NOT_ALLOWED_PATTERN = /LAA_ACCOUNTS not in the allowed list/;

describe("Silas Service", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("factory:should return service instance without cache", () => {
    sinon.stub(config.redis, "enabled").value(false);
    const createRedisCachePluginStub = sinon.stub(
      SilasService,
      "createRedisCachePlugin",
    );
    SilasService.factory();
    assert.equal(
      createRedisCachePluginStub.called,
      false,
      "should not use redis cache plugin when redis is disabled",
    );

    SilasService.factory("session-id-1111");
    assert.equal(
      createRedisCachePluginStub.called,
      false,
      "should not use redis cache plugin when redis is disabled",
    );
  });

  it("factory:should return service instance with cache", () => {
    sinon.stub(config.redis, "enabled").value(true);
    const createRedisCachePluginSpy = sinon.spy(
      SilasService,
      "createRedisCachePlugin",
    );
    SilasService.factory("session-id-1111");
    assert.equal(
      createRedisCachePluginSpy.called,
      true,
      "should use redis cache plugin when redis is enabled",
    );
  });

  it("getAuthCodeUrl: should return authorisation url", async () => {
    const service = SilasService.factory();
    const req = createTestRequest();
    req.session.auth_nonce = "test-session-auth-nonce";
    const url = new URL(await service.getAuthCodeUrl(req));
    assertAuthCodeUrl(url, "test-session-auth-nonce");
  });

  it("getAuthCodeUrl: should generate nonce when generating authorisation url", async () => {
    const service = SilasService.factory();
    const generateNonce = sinon.spy(service, <any>"generateNonce");
    const req = createTestRequest();
    const url = new URL(await service.getAuthCodeUrl(req));
    assert.equal(generateNonce.called, true, "should generate nonce");
    assertAuthCodeUrl(url);
  });

  it("acquireTokenByCode: should exchange code for acces token", async () => {
    const service = SilasService.factory();
    const verifyStub = sinon.stub(service, "verify").resolves();
    const acquireTokenByCodeStub = sinon.stub().resolves({
      accessToken: "test-access-token",
    });
    sinon.stub(service, <any>"msalClient").value({
      acquireTokenByCode: acquireTokenByCodeStub,
    });
    await service.acquireTokenByCode("this-is-a-code");
    assert.equal(
      acquireTokenByCodeStub.called,
      true,
      "should call the msal client's acquireTokenByCode",
    );
    assert.deepEqual(
      acquireTokenByCodeStub.firstCall.args[0],
      {
        code: "this-is-a-code",
        scopes: config.silas.scopes,
        redirectUri: config.silas.redirectUri,
      },
      "should msal client with correct arguments",
    );
    assert.equal(
      verifyStub.called,
      true,
      "should verify the access token after exchange",
    );
    assert.equal(
      verifyStub.firstCall.firstArg,
      "test-access-token",
      "should verify the access token after exchange",
    );
  });

  it("acquireDownstreamAccessToken: should get an access token for down stream clients", async () => {
    const service = SilasService.factory();
    const acquireTokenSilentStub = sinon
      .stub(service, "acquireTokenSilent")
      .resolves({
        accessToken: "test-access-token",
      } as unknown as AuthenticationResult);
    const homeAccountId = "home-account-id-1";
    const accessToken =
      await service.acquireDownstreamAccessToken(homeAccountId);
    assert.equal(
      accessToken,
      "test-access-token",
      "return access token should match one return from acquireTokenSilent",
    );
    assert.equal(
      acquireTokenSilentStub.called,
      true,
      "acquireTokenSilent should be called",
    );
    assert.equal(
      acquireTokenSilentStub.firstCall.args[0],
      homeAccountId,
      `acquireTokenSilent should be called with ${homeAccountId}`,
    );
  });

  it("acquireTokenSilent: should reject empty home account id", async () => {
    const service = SilasService.factory();
    await assert.rejects(service.acquireTokenSilent(""), (error: Error) => {
      assert.equal(
        error.message,
        "The authenticated session has no MSAL account reference",
      );
      return true;
    });
  });

  it("acquireTokenSilent: should reject when account id cannot be found", async () => {
    const service = SilasService.factory();
    await assert.rejects(
      service.acquireTokenSilent("test-home-account-id"),
      (error: Error) => {
        assert.equal(error.message, "Could not find account to refresh");
        return true;
      },
    );
  });

  it("acquireTokenSilent: should reject when token cannot be refreshed", async () => {
    const service = SilasService.factory();
    sinon.stub(service, <any>"msalClient").value({
      getTokenCache: sinon.stub().returns({
        getAccountByHomeId: sinon.stub().returns({}),
      }),
      acquireTokenSilent: sinon
        .stub()
        .throws(new Error("acquireTokenSilent has failed")),
    });
    await assert.rejects(
      service.acquireTokenSilent("test-account-id"),
      (error: Error) => {
        assert.equal(error.message, "Could not refresh token");
        return true;
      },
    );
  });

  it("acquireTokenSilent: should return token from cache", async () => {
    const { homeAccountId, serializedCache } = createCachedMsalBlob({
      clientId: config.silas.clientId,
      scopes: config.silas.scopes,
    });

    const redisClient = {
      get: sinon.stub().returns(serializedCache),
      expire: sinon.stub().returns(true),
    } as unknown as RedisClientType;

    const service = new SilasService(
      config.silas,
      new RedisCachePlugin(redisClient, "test-session", 36000),
    );
    const result = await service.acquireTokenSilent(homeAccountId);
    assert.equal(result.accessToken, "not-a-real-access-token");
  });

  describe("verify", () => {
    it("verify: valid access token", async () => {
      const service = buildVerifyService();
      const { accessToken, publicKey } = generateAccessToken({
        tenantId: TEST_TENANT_ID,
      });
      sinon.stub(service, "getPublicKey").resolves(publicKey);
      await assert.doesNotReject(service.verify(accessToken));
    });

    it("verify: token has expired", async () => {
      const service = buildVerifyService();
      const { accessToken, publicKey } = generateAccessToken({
        tenantId: TEST_TENANT_ID,
        expires: "-1hr",
      });
      sinon.stub(service, "getPublicKey").resolves(publicKey);
      await assert.rejects(
        service.verify(accessToken),
        TokenExpiredError,
        "expected to raise token expired error for expired token",
      );
    });

    it("verify: token has incorrect audience", async () => {
      const service = buildVerifyService();
      const { accessToken, publicKey } = generateAccessToken({
        tenantId: TEST_TENANT_ID,
        audience: "invalid-auidence",
      });
      sinon.stub(service, "getPublicKey").resolves(publicKey);
      await assert.rejects(service.verify(accessToken), (error: Error) => {
        assert.equal(
          error instanceof JsonWebTokenError,
          true,
          "expecting JsonWebTokenError to be raised",
        );
        assert.equal(
          error.message,
          `jwt audience invalid. expected: ${TEST_AUDIENCE}`,
          "expecting error message to be raised",
        );
        return true;
      });
    });

    it("verify: token has incorrect issuer", async () => {
      const service = buildVerifyService();
      const { accessToken, publicKey } = generateAccessToken({
        tenantId: TEST_TENANT_ID,
        issuer: "invalid-issuer",
      });
      sinon.stub(service, "getPublicKey").resolves(publicKey);
      await assert.rejects(service.verify(accessToken), (error: Error) => {
        assert.equal(
          error instanceof JsonWebTokenError,
          true,
          "expecting JsonWebTokenError to be raised",
        );
        assert.equal(
          error.message,
          `jwt issuer invalid. expected: https://login.microsoftonline.com/${TEST_TENANT_ID}/v2.0`,
        );
        return true;
      });
    });

    it("verify: token has unsupported algorithm", async () => {
      const service = buildVerifyService();
      const { accessToken, publicKey } = generateAccessToken({
        tenantId: TEST_TENANT_ID,
        algorithm: "RS512",
      });
      sinon.stub(service, "getPublicKey").resolves(publicKey);
      await assert.rejects(service.verify(accessToken), (error: Error) => {
        assert.equal(
          error instanceof JsonWebTokenError,
          true,
          "expecting JsonWebTokenError to be raised",
        );
        assert.equal(error.message, "invalid algorithm");
        return true;
      });
    });

    it("verify: should reject when jsonwebtoken returns a string payload", async () => {
      await assert.rejects(
        verifyWithStubbedPayload("i-am-a-string-payload"),
        (error: Error) => {
          assert.equal(
            error.message,
            "Unexpected string payload in access token",
          );
          return true;
        },
      );
    });

    describe("LAA_ACCOUNTS claim", () => {
      it("verify: LAA_ACCOUNTS not in the allowed list", async () => {
        const service = buildVerifyService();
        const { accessToken, publicKey } = generateAccessToken({
          tenantId: TEST_TENANT_ID,
          laaAccounts: "not-allowed",
        });
        sinon.stub(service, "getPublicKey").resolves(publicKey);
        await assert.rejects(service.verify(accessToken), (error: Error) => {
          assert.equal(error.message, "LAA_ACCOUNTS not in the allowed list");
          return true;
        });
      });

      it("verify: should accept a real token whose LAA_ACCOUNTS is an array of allowed accounts", async () => {
        const service = buildVerifyService();
        const { accessToken, publicKey } = generateAccessToken({
          tenantId: TEST_TENANT_ID,
          laaAccounts: [ALLOWED_ACCOUNT, ALLOWED_ACCOUNT],
        });
        sinon.stub(service, "getPublicKey").resolves(publicKey);
        await assert.doesNotReject(service.verify(accessToken));
      });

      it("verify: should accept an array containing only allowed accounts", async () => {
        await assert.doesNotReject(
          verifyWithStubbedPayload({
            LAA_ACCOUNTS: [ALLOWED_ACCOUNT, ALLOWED_ACCOUNT],
          }),
        );
      });

      it("verify: should accept deeply nested arrays of allowed accounts", async () => {
        await assert.doesNotReject(
          verifyWithStubbedPayload({
            LAA_ACCOUNTS: [[ALLOWED_ACCOUNT], [[ALLOWED_ACCOUNT]]],
          }),
        );
      });

      it("verify: should reject when LAA_ACCOUNTS claim is missing", async () => {
        await assert.rejects(
          verifyWithStubbedPayload({ name: "no accounts claim" }),
          NOT_ALLOWED_PATTERN,
        );
      });

      it("verify: should reject when LAA_ACCOUNTS is an empty array", async () => {
        await assert.rejects(
          verifyWithStubbedPayload({ LAA_ACCOUNTS: [] }),
          NOT_ALLOWED_PATTERN,
        );
      });

      it("verify: should reject when LAA_ACCOUNTS only has values that get filtered out", async () => {
        // null, object, undefined -> fail the typeof check
        // ""                      -> fails the empty string check
        // NaN                     -> fails the NaN check
        await assert.rejects(
          verifyWithStubbedPayload({
            LAA_ACCOUNTS: [null, {}, undefined, "", Number.NaN],
          }),
          NOT_ALLOWED_PATTERN,
        );
      });

      it("verify: should reject when a mix of allowed and disallowed accounts is present", async () => {
        await assert.rejects(
          verifyWithStubbedPayload({
            LAA_ACCOUNTS: [ALLOWED_ACCOUNT, "not-allowed"],
          }),
          NOT_ALLOWED_PATTERN,
        );
      });

      it("verify: should coerce boolean, number and bigint values to strings", async () => {
        // true -> "1", false -> "0", 12345 -> "12345", 10n -> "10"
        // Runs every coercion branch (boolean ternary both sides, number, bigint).
        // If ALLOWED_LAA_ACCOUNTS ever contains one of these strings, change the values.
        await assert.rejects(
          verifyWithStubbedPayload({
            LAA_ACCOUNTS: [true, false, 12345, BigInt(10)],
          }),
          NOT_ALLOWED_PATTERN,
        );
      });

      it("verify: should ignore filtered-out values alongside an allowed account", async () => {
        // Junk is filtered away, leaving only the allowed account -> passes
        await assert.doesNotReject(
          verifyWithStubbedPayload({
            LAA_ACCOUNTS: [
              ALLOWED_ACCOUNT,
              null,
              "",
              Number.NaN,
              {},
              undefined,
            ],
          }),
        );
      });
    });
  });
});

describe("RedisCachePlugin", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("beforeCacheAccess: should not deserialize or extend TTL when nothing is cached", async () => {
    const expireStub = sinon.stub().resolves(true);
    const redisClient = {
      get: sinon.stub().resolves(null),
      expire: expireStub,
    } as unknown as RedisClientType;
    const deserialize = sinon.stub();

    const plugin = new RedisCachePlugin(redisClient, "test-session", 36000);
    await plugin.beforeCacheAccess({
      tokenCache: { deserialize },
    } as any);

    assert.equal(deserialize.called, false, "should not deserialize");
    assert.equal(expireStub.called, false, "should not refresh the TTL");
  });
});
