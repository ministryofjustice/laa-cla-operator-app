import assert from "node:assert/strict";
import config from "#config.js";
import {
  RedisCachePlugin,
  SilasService,
} from "#src/services/api/silasService.js";
import { describe, it } from "mocha";
import sinon from "sinon";
import { createTestRequest } from "../controllers/index.js";
import type { AuthenticationResult } from "@azure/msal-node";
import { createCachedMsalBlob } from "./silasService.cachedata.spec.js";
import type { RedisClientType } from "#node_modules/redis/dist/index.js";
import { ZERO } from "#src/constants.js";

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

describe("Silas Service", () => {
  it("factory:should return service instance without cache", () => {
    const redisEnabledStub = sinon.stub(config.redis, "enabled").value(false);
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
    redisEnabledStub.restore();
    createRedisCachePluginStub.restore();
  });

  it("factory:should return service instance with cache", () => {
    const redisEnabledStub = sinon.stub(config.redis, "enabled").value(true);
    const createRedisCachePluginStub = sinon.spy(
      SilasService,
      "createRedisCachePlugin",
    );
    SilasService.factory("session-id-1111");
    assert.equal(
      createRedisCachePluginStub.called,
      true,
      "should not use redis cache plugin when redis is disabled",
    );
    redisEnabledStub.restore();
    createRedisCachePluginStub.restore();
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
    const acquireTokenByCodeStub = sinon.stub();
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
});
