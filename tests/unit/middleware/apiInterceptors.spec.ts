import { strict as assert } from "assert";
import sinon from "sinon";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import {
  addAuthServiceInterceptors,
  addLoggingInterceptors,
  addSessionSilasTokenInterceptor,
} from "#src/middleware/apiInterceptors.js";

describe("apiInterceptors", () => {
  afterEach(() => {
    sinon.restore();
  });

  function createWrapperWithInterceptorStubs(): {
    wrapper: AxiosInstanceWrapper;
    requestUse: sinon.SinonStub;
    responseUse: sinon.SinonStub;
  } {
    const requestUse = sinon.stub();
    const responseUse = sinon.stub();

    const wrapper = {
      axiosInstance: {
        interceptors: {
          request: { use: requestUse },
          response: { use: responseUse },
        },
      },
    } as unknown as AxiosInstanceWrapper;

    return { wrapper, requestUse, responseUse };
  }

  it("addLoggingInterceptors registers request and response interceptors", () => {
    const { wrapper, requestUse, responseUse } =
      createWrapperWithInterceptorStubs();

    addLoggingInterceptors(wrapper);

    assert.equal(requestUse.calledOnce, true);
    assert.equal(responseUse.calledOnce, true);
  });

  it("addAuthServiceInterceptors sets Authorization header from authService", async () => {
    const { wrapper, requestUse } = createWrapperWithInterceptorStubs();
    const authService = {
      getAuthHeader: sinon.stub().resolves("Bearer jwt-token"),
      clearTokens: sinon.stub(),
    };

    addAuthServiceInterceptors(wrapper, authService, false);

    const requestFulfilled = requestUse.firstCall.args[0] as (config: {
      headers: Record<string, string>;
    }) => Promise<{ headers: Record<string, string> }>;
    const config = { headers: {} };

    const result = await requestFulfilled(config);

    assert.equal(result.headers.Authorization, "Bearer jwt-token");
    assert.equal(authService.getAuthHeader.calledOnce, true);
  });

  it("addAuthServiceInterceptors logs when auth header is added and logging is enabled", async () => {
    const { wrapper, requestUse } = createWrapperWithInterceptorStubs();
    const consoleLogStub = sinon.stub(console, "log");
    const authService = {
      getAuthHeader: sinon.stub().resolves("Bearer jwt-token"),
      clearTokens: sinon.stub(),
    };

    addAuthServiceInterceptors(wrapper, authService, true);

    const requestFulfilled = requestUse.firstCall.args[0] as (config: {
      headers: Record<string, string>;
    }) => Promise<{ headers: Record<string, string> }>;
    const config = { headers: {} };

    await requestFulfilled(config);

    assert.equal(
      consoleLogStub.calledWithMatch(
        "Added JWT authorization header to API request",
      ),
      true,
    );
  });

  it("addAuthServiceInterceptors handles getAuthHeader failures without throwing", async () => {
    const { wrapper, requestUse } = createWrapperWithInterceptorStubs();
    const consoleErrorStub = sinon.stub(console, "error");
    const authService = {
      getAuthHeader: sinon.stub().rejects(new Error("token fetch failed")),
      clearTokens: sinon.stub(),
    };

    addAuthServiceInterceptors(wrapper, authService, false);

    const requestFulfilled = requestUse.firstCall.args[0] as (config: {
      headers: Record<string, string>;
    }) => Promise<{ headers: Record<string, string> }>;
    const config = { headers: {} };

    const result = await requestFulfilled(config);

    assert.deepEqual(result, config);
    assert.equal(
      consoleErrorStub.calledWithMatch(
        "Failed to add JWT authorization header: token fetch failed",
      ),
      true,
    );
  });

  it("addAuthServiceInterceptors clears tokens on 401 responses", async () => {
    const { wrapper, responseUse } = createWrapperWithInterceptorStubs();
    const authService = {
      getAuthHeader: sinon.stub().resolves("Bearer jwt-token"),
      clearTokens: sinon.stub(),
    };

    addAuthServiceInterceptors(wrapper, authService, false);

    const responseRejected = responseUse.firstCall.args[1] as (
      error: unknown,
    ) => Promise<never>;

    await assert.rejects(async () => {
      await responseRejected({ response: { status: 401 } });
    });

    assert.equal(authService.clearTokens.calledOnce, true);
  });

  it("addAuthServiceInterceptors logs and clears tokens on 401 when logging enabled", async () => {
    const { wrapper, responseUse } = createWrapperWithInterceptorStubs();
    const consoleErrorStub = sinon.stub(console, "error");
    const authService = {
      getAuthHeader: sinon.stub().resolves("Bearer jwt-token"),
      clearTokens: sinon.stub(),
    };

    addAuthServiceInterceptors(wrapper, authService, true);

    const responseRejected = responseUse.firstCall.args[1] as (
      error: unknown,
    ) => Promise<never>;

    await assert.rejects(async () => {
      await responseRejected({ response: { status: 401 } });
    });

    assert.equal(authService.clearTokens.calledOnce, true);
    assert.equal(
      consoleErrorStub.calledWithMatch(
        "API returned 401 Unauthorized - clearing cached tokens",
      ),
      true,
    );
  });

  it("addSessionSilasTokenInterceptor sets bearer token on request config", () => {
    const { wrapper, requestUse } = createWrapperWithInterceptorStubs();

    addSessionSilasTokenInterceptor(wrapper, "session-token", false);

    const requestFulfilled = requestUse.firstCall.args[0] as (config: {
      headers: Record<string, string>;
    }) => { headers: Record<string, string> };
    const config = { headers: {} };

    const result = requestFulfilled(config);

    assert.equal(result.headers.Authorization, "Bearer session-token");
  });

  it("addSessionSilasTokenInterceptor logs when logging is enabled", () => {
    const { wrapper, requestUse } = createWrapperWithInterceptorStubs();
    const consoleLogStub = sinon.stub(console, "log");

    addSessionSilasTokenInterceptor(wrapper, "session-token", true);

    const requestFulfilled = requestUse.firstCall.args[0] as (config: {
      headers: Record<string, string>;
    }) => { headers: Record<string, string> };
    requestFulfilled({ headers: {} });

    assert.equal(
      consoleLogStub.calledWithMatch("Added SILAS bearer token to API request"),
      true,
    );
  });

  it("addLoggingInterceptors logs request and response details", async () => {
    const { wrapper, requestUse, responseUse } =
      createWrapperWithInterceptorStubs();
    const consoleLogStub = sinon.stub(console, "log");

    addLoggingInterceptors(wrapper);

    const requestFulfilled = requestUse.firstCall.args[0] as (config: {
      method?: string;
      baseURL?: string;
      url?: string;
    }) => unknown;

    const responseFulfilled = responseUse.firstCall.args[0] as (response: {
      status: number;
      config: { method?: string; url?: string };
    }) => unknown;

    requestFulfilled({
      method: "get",
      baseURL: "http://api.test",
      url: "/cases",
    });
    responseFulfilled({
      status: 200,
      config: { method: "get", url: "/cases" },
    });

    assert.equal(consoleLogStub.called, true);
    assert.equal(
      consoleLogStub.calledWithMatch("API Request: GET http://api.test/cases"),
      true,
    );
    assert.equal(
      consoleLogStub.calledWithMatch("API Response: 200 GET /cases"),
      true,
    );
  });

  it("addLoggingInterceptors wraps request interceptor errors into Error", async () => {
    const { wrapper, requestUse } = createWrapperWithInterceptorStubs();
    const consoleErrorStub = sinon.stub(console, "error");

    addLoggingInterceptors(wrapper);

    const requestRejected = requestUse.firstCall.args[1] as (
      error: unknown,
    ) => Promise<never>;

    await assert.rejects(
      async () => {
        await requestRejected("request failed");
      },
      (error: unknown) => {
        assert(error instanceof Error);
        assert.equal(error.message, "request failed");
        return true;
      },
    );

    assert.equal(
      consoleErrorStub.calledWithMatch("API Request Error: request failed"),
      true,
    );
  });

  it("addLoggingInterceptors logs API HTTP response errors", async () => {
    const { wrapper, responseUse } = createWrapperWithInterceptorStubs();
    const consoleErrorStub = sinon.stub(console, "error");

    addLoggingInterceptors(wrapper);

    const responseRejected = responseUse.firstCall.args[1] as (
      error: unknown,
    ) => Promise<never>;

    await assert.rejects(async () => {
      await responseRejected({
        response: { status: 503 },
        config: { method: "get", url: "/cases" },
      });
    });

    assert.equal(
      consoleErrorStub.calledWithMatch("API Response Error: 503 GET /cases"),
      true,
    );
  });

  it("addLoggingInterceptors logs API network errors for non-axios failures", async () => {
    const { wrapper, responseUse } = createWrapperWithInterceptorStubs();
    const consoleErrorStub = sinon.stub(console, "error");

    addLoggingInterceptors(wrapper);

    const responseRejected = responseUse.firstCall.args[1] as (
      error: unknown,
    ) => Promise<never>;

    await assert.rejects(async () => {
      await responseRejected("network down");
    });

    assert.equal(
      consoleErrorStub.calledWithMatch("API Network Error: network down"),
      true,
    );
  });
});
