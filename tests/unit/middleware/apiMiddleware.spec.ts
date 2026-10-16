import { strict as assert } from "assert";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { Request, Response, NextFunction } from "express";
import sinon from "sinon";
import {
  requireAuth,
  setAuthStatus,
  axiosMiddleware,
  createApiMiddleware,
} from "#src/middleware/apiMiddleware.js";
import { SilasService } from "#src/services/api/silasService.js";
import { MS_PER_SECOND } from "#src/constants.js";
import {
  createTestRequest,
  createTestResponse,
} from "../src/controllers/index.js";

describe("axiosMiddleware", async () => {
  let sandbox = sinon.createSandbox();
  beforeEach(() => {
    const acquireDownstreamAccessTokenStub = sandbox
      .stub()
      .returns("test-access-token");
    const MockSilasService = {
      acquireDownstreamAccessToken: acquireDownstreamAccessTokenStub,
    };
    sandbox
      .stub(SilasService, "factory")
      .returns(MockSilasService as unknown as SilasService);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("attaches axios middleware to request and calls next", async () => {
    const req = { session: {}, path: "/api" } as unknown as Request;
    const res = {} as Response;
    let nextCalled = false;

    await axiosMiddleware(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true, "Call next method");
    assert.ok(req.axiosMiddleware);
    assert.equal(typeof req.axiosMiddleware.get, "function");
    assert.ok(req.state);
    assert.strictEqual(req.state.authenticatedAxios, req.axiosMiddleware);
  });
});

describe("apiMiddleware", () => {
  const server = setupServer();
  let sandbox = sinon.createSandbox();

  before(() => {
    server.listen({ onUnhandledRequest: "error" });
  });
  beforeEach(() => {
    const MockSilasService = {
      acquireDownstreamAccessToken: sandbox.stub().returns("test-access-token"),
      refreshToken: sandbox.stub(),
    };
    sandbox
      .stub(SilasService, "factory")
      .returns(MockSilasService as unknown as SilasService);
  });
  afterEach(() => {
    sandbox.restore();
    server.resetHandlers();
  });

  after(() => {
    server.close();
  });

  it("skip adding token headers for auth exempt urls", async () => {
    const req = createTestRequest({ path: "/sign-in" });
    const res = createTestResponse();
    const middleware = createApiMiddleware();
    let nextCalled = false;
    await middleware(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, true, "should call next middleware");
  });

  it("adds the SILAS session token from session by default", async () => {
    const middleware = createApiMiddleware();
    const req = {
      path: "/api",
      session: {
        id: "1",
        account: {
          homeAccountId: "1",
        },
      },
    } as unknown as Request;
    const res = {} as Response;

    await middleware(req, res, (() => undefined) as NextFunction);

    server.use(
      http.get("http://api.test/session-auth", ({ request }) => {
        assert.equal(
          request.headers.get("authorization"),
          "Bearer test-access-token",
        );
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await req.axiosMiddleware.get(
      "http://api.test/session-auth",
    );

    assert.equal(response.status, 200);
  });

  it("adds authorization header from authService", async () => {
    const middleware = createApiMiddleware({
      enableLogging: false,
      authService: {
        getAuthHeader: async () => "Bearer test-token",
        clearTokens: () => undefined,
      },
    });

    const req = {
      path: "/api",
      session: {
        id: "1",
        account: {
          homeAccountId: "1",
        },
      },
    } as unknown as Request;
    const res = {} as Response;

    await middleware(req, res, (() => undefined) as NextFunction);

    server.use(
      http.get("http://api.test/auth-header", ({ request }) => {
        const authHeader = request.headers.get("authorization");

        if (authHeader === "Bearer test-token") {
          return HttpResponse.json({ ok: true });
        }

        return new HttpResponse(null, { status: 401 });
      }),
    );

    const response = await req.axiosMiddleware.get(
      "http://api.test/auth-header",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { ok: true });
  });

  it("clears tokens on 401 responses", async () => {
    let clearTokensCalls = 0;

    const middleware = createApiMiddleware({
      enableLogging: false,
      authService: {
        getAuthHeader: async () => "Bearer expired-token",
        clearTokens: () => {
          clearTokensCalls += 1;
        },
      },
    });

    const req = { session: {} } as unknown as Request;
    const res = {} as Response;

    await middleware(req, res, (() => undefined) as NextFunction);

    server.use(
      http.get("http://api.test/unauthorized", () => {
        return new HttpResponse(null, { status: 401 });
      }),
    );

    await assert.rejects(async () => {
      await req.axiosMiddleware.get("http://api.test/unauthorized");
    });

    assert.equal(clearTokensCalls, 1);
  });

  it("does not throw when getAuthHeader fails", async () => {
    let called = 0;

    const middleware = createApiMiddleware({
      enableLogging: false,
      authService: {
        getAuthHeader: async () => {
          called += 1;
          throw new Error("header unavailable");
        },
        clearTokens: () => undefined,
      },
    });

    const req = { session: {} } as unknown as Request;
    const res = {} as Response;

    await middleware(req, res, (() => undefined) as NextFunction);

    server.use(
      http.get("http://api.test/no-auth-required", () => {
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await req.axiosMiddleware.get(
      "http://api.test/no-auth-required",
    );

    assert.equal(called, 1);
    assert.equal(response.status, 200);
  });
});

describe("requireAuth", () => {
  let sandbox: sinon.SinonSandbox;
  let MockSilasService = {
    acquireDownstreamAccessToken: sinon.stub(),
    acquireTokenSilent: sinon.stub(),
  };
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    MockSilasService = {
      acquireDownstreamAccessToken: sandbox.stub().returns("test-access-token"),
      acquireTokenSilent: sandbox.stub().returns({
        account: {
          name: "Test user",
        },
      }),
    };
    sandbox
      .stub(SilasService, "factory")
      .returns(MockSilasService as unknown as SilasService);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("skip adding token headers for auth exempt urls", async () => {
    const req = createTestRequest({ path: "/sign-in" });
    const res = createTestResponse();
    let nextCalled = false;
    await requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true, "should call next middleware");
  });

  it("redirects to sign-in when sessiong is missing", async () => {
    const req = createTestRequest();
    const res = createTestResponse();
    const redirectStub = res.redirect as sinon.SinonStub;
    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(redirectStub.called, true, "should redirect user");
    assert.equal(
      redirectStub.firstCall.firstArg,
      "/sign-in",
      "should redirect user to /sign-in",
    );
  });

  it("calls next when silasAuth token is valid", async () => {
    const ONE_HOUR_SECONDS = 3600;
    const EXPIRE = Math.floor(Date.now() / MS_PER_SECOND) + ONE_HOUR_SECONDS; // one hour from now
    const res = createTestResponse();
    const req = createTestRequest({
      session: {
        id: "1",
        account: {
          homeAccountId: "1",
          idToken: {},
          idTokenClaims: {
            exp: EXPIRE,
          },
        },
      },
    });
    let nextCalled = false;
    await requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true, "next should be called");
  });

  it("refresh token after token has expired", async () => {
    const ONE_HOUR_SECONDS = 3600;
    const EXPIRE = Math.floor(Date.now() / MS_PER_SECOND) - ONE_HOUR_SECONDS; // one hour ago
    const req = createTestRequest({
      session: {
        id: "1",
        account: {
          homeAccountId: "1",
          idToken: {},
          idTokenClaims: {
            exp: EXPIRE,
          },
        },
      },
    });

    const res = createTestResponse();

    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, "expect next function to be called");
    assert.equal(
      MockSilasService.acquireTokenSilent.called,
      true,
      "expect acquireTokenSilent to be called",
    );
  });

  it("should redirect to sign in page when unable to refresh token", async () => {
    MockSilasService.acquireTokenSilent.returns({
      account: null,
    });
    const ONE_HOUR_SECONDS = 3600;
    const EXPIRE = Math.floor(Date.now() / MS_PER_SECOND) - ONE_HOUR_SECONDS; // one hour ago
    const req = createTestRequest({
      session: {
        id: "1",
        account: {
          homeAccountId: "1",
          idToken: {},
          idTokenClaims: {
            exp: EXPIRE,
          },
        },
      },
    });
    const res = createTestResponse();
    const redirectStub = res.redirect as sinon.SinonStub;
    await requireAuth(req, res, () => {});
    assert.equal(redirectStub.called, true, "should redirect user");
    assert.equal(
      redirectStub.firstCall.firstArg,
      "/sign-in",
      "should redirect user",
    );
  });
});

describe("setAuthStatus", () => {
  it("sets locals for unauthenticated users without silasAuth in session", () => {
    const req = {
      session: {
        isAuthenticated: false,
      },
    } as unknown as Request;
    const res = { locals: {} as Record<string, unknown> } as Response;

    let nextCalled = false;

    setAuthStatus(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.locals.isAuthenticated, false);
    assert.equal(res.locals.userEmail, null);
    assert.equal(res.locals.userName, null);
    assert.equal(nextCalled, true);
  });

  it("sets locals for authenticated users", () => {
    const req = {
      session: {
        isAuthenticated: true,
        account: {
          username: "user@example.com",
          name: "User",
        },
      },
    } as unknown as Request;

    const res = { locals: {} as Record<string, unknown> } as Response;

    setAuthStatus(req, res, (() => undefined) as NextFunction);

    assert.equal(res.locals.isAuthenticated, true);
    assert.equal(res.locals.userEmail, "user@example.com");
    assert.equal(res.locals.userName, "User");
  });
});
