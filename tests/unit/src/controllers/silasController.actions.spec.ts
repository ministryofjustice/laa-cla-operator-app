import {
  callbackAction,
  loginAction,
  logOut,
  processUATRedirect,
} from "#src/controllers/silasController.js";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import type { Request, Response } from "express";
import { createTestRequest, createTestResponse } from "./index.js";
import { SilasService } from "#src/services/api/silasService.js";
import config from "#config.js";

const EPHEMERAL_SUFFIX =
  "laa-cla-operator-app.cloud-platform.service.justice.gov.uk";
const VALID_RETURN_TO = `https://pr-123.${EPHEMERAL_SUFFIX}/redirect`;

// ---------------------------------------------------------------------------
// Config override helper (restored after every test via restoreConfig())
// ---------------------------------------------------------------------------
const configRestorers: Array<() => void> = [];

function overrideConfig(target: any, key: string, value: unknown): void {
  const had = Object.prototype.hasOwnProperty.call(target, key);
  const original = target[key];
  target[key] = value;
  configRestorers.push(() => {
    if (had) {
      target[key] = original;
    } else {
      delete target[key];
    }
  });
}

function restoreConfig(): void {
  while (configRestorers.length > 0) {
    configRestorers.pop()?.();
  }
}

describe("silasController:processUATRedirect", () => {
  let sandbox: sinon.SinonSandbox;
  let req: Request;
  let res: Response;
  let redirectStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    req = createTestRequest();
    req.session.id = "1";
    res = createTestResponse();
    redirectStub = res.redirect as sinon.SinonStub;
  });

  afterEach(() => {
    sandbox.restore();
    restoreConfig();
  });

  describe("login", () => {
    it("ephemeral: should redirect to main uat when SERVICE_URL is set", async () => {
      overrideConfig(config.app, "environment", "Ephemeral");
      overrideConfig(config, "SERVICE_URL", "pr-123.example.service");

      const redirected = await processUATRedirect("login", req, res);

      assert.equal(redirected, true, "should report the user was redirected");
      const nonce = req.session.auth_nonce;
      assert.ok(nonce, "should store a nonce in the session");
      const domain = new URL(config.silas.redirectUri).origin;
      assert.equal(
        redirectStub.firstCall.args[0],
        `${domain}/login?return_to=https://pr-123.example.service/redirect&nonce=${nonce}`,
      );
    });

    it("ephemeral: should not redirect when SERVICE_URL is undefined", async () => {
      overrideConfig(config.app, "environment", "ephemeral");
      overrideConfig(config, "SERVICE_URL", undefined);

      const redirected = await processUATRedirect("login", req, res);

      assert.equal(redirected, false);
      assert.equal(redirectStub.called, false);
    });

    it("uat: should store return_to and nonce from the query string", async () => {
      overrideConfig(config.app, "environment", "UAT");
      req.query.return_to = VALID_RETURN_TO;
      req.query.nonce = "abc-nonce";

      const redirected = await processUATRedirect("login", req, res);

      assert.equal(redirected, false);
      assert.equal(req.session.return_to, VALID_RETURN_TO);
      assert.equal(req.session.auth_nonce, "abc-nonce");
      assert.equal(redirectStub.called, false);
    });

    it("uat: should store return_to without touching auth_nonce when no nonce is supplied", async () => {
      overrideConfig(config.app, "environment", "uat");
      req.session.auth_nonce = "existing-nonce";
      req.query.return_to = VALID_RETURN_TO;

      const redirected = await processUATRedirect("login", req, res);

      assert.equal(redirected, false);
      assert.equal(req.session.return_to, VALID_RETURN_TO);
      assert.equal(req.session.auth_nonce, "existing-nonce");
    });

    it("uat: should set auth_nonce to undefined when nonce is not a string", async () => {
      overrideConfig(config.app, "environment", "uat");
      req.session.auth_nonce = "existing-nonce";
      req.query.return_to = VALID_RETURN_TO;
      req.query.nonce = ["a", "b"] as any;

      await processUATRedirect("login", req, res);

      assert.equal(req.session.auth_nonce, undefined);
    });

    it("uat: should throw when return_to is not in our namespace", async () => {
      overrideConfig(config.app, "environment", "uat");
      req.query.return_to = "https://evil.example.com/redirect";

      await assert.rejects(
        processUATRedirect("login", req, res),
        /Return to does not belong to our namespace: https:\/\/evil\.example\.com\/redirect/,
      );
      assert.equal(req.session.return_to, undefined);
    });

    it("uat: should do nothing when return_to is missing", async () => {
      overrideConfig(config.app, "environment", "uat");

      const redirected = await processUATRedirect("login", req, res);

      assert.equal(redirected, false);
      assert.equal(req.session.return_to, undefined);
    });

    it("uat: should treat a non-string return_to as missing", async () => {
      overrideConfig(config.app, "environment", "uat");
      req.query.return_to = ["a", "b"] as any;

      const redirected = await processUATRedirect("login", req, res);

      assert.equal(redirected, false);
      assert.equal(req.session.return_to, undefined);
    });

    it("other environments: should do nothing", async () => {
      overrideConfig(config.app, "environment", "production");
      req.query.return_to = VALID_RETURN_TO;

      const redirected = await processUATRedirect("login", req, res);

      assert.equal(redirected, false);
      assert.equal(redirectStub.called, false);
      assert.equal(req.session.return_to, undefined);
    });
  });

  describe("redirect", () => {
    it("uat: should proxy the callback to the ephemeral environment", async () => {
      overrideConfig(config.app, "environment", "UAT");
      req.session.return_to = VALID_RETURN_TO;
      req.query.code = "the-code";
      req.query.state = "the-state";

      const redirected = await processUATRedirect("redirect", req, res);

      const expectedQuery = new URLSearchParams(
        req.query as Record<string, string>,
      ).toString();
      assert.equal(redirected, true);
      assert.equal(
        redirectStub.firstCall.args[0],
        `${VALID_RETURN_TO}?${expectedQuery}`,
      );
    });

    it("uat: should not redirect when there is no return_to in the session", async () => {
      overrideConfig(config.app, "environment", "uat");

      const redirected = await processUATRedirect("redirect", req, res);

      assert.equal(redirected, false);
      assert.equal(redirectStub.called, false);
    });

    it("other environments: should not redirect even with return_to in the session", async () => {
      overrideConfig(config.app, "environment", "production");
      req.session.return_to = VALID_RETURN_TO;

      const redirected = await processUATRedirect("redirect", req, res);

      assert.equal(redirected, false);
      assert.equal(redirectStub.called, false);
    });
  });
});

describe("silasController:loginAction", () => {
  let sandbox: sinon.SinonSandbox;
  let mockSilasService: {
    getAuthCodeUrl: sinon.SinonStub;
  };
  let req: Request;
  let res: Response;
  beforeEach(() => {
    req = createTestRequest();
    req.session.id = "1";
    res = createTestResponse();
    mockSilasService = {
      getAuthCodeUrl: sinon
        .stub()
        .returns("http://test.service.justice.gov.uk"),
    };
    sandbox = sinon.createSandbox();
    sandbox
      .stub(SilasService, "factory")
      .returns(mockSilasService as unknown as SilasService);
  });
  afterEach(() => {
    sandbox.restore();
    restoreConfig();
  });

  it("should redirect user to entra", async () => {
    const redirectStub = res.redirect as sinon.SinonStub;
    await loginAction(req, res);
    assert.equal(
      redirectStub.calledWith("http://test.service.justice.gov.uk"),
      true,
    );
  });

  it("should stop after the uat redirect without calling entra", async () => {
    overrideConfig(config.app, "environment", "ephemeral");
    overrideConfig(config, "SERVICE_URL", "pr-123.example.service");
    const redirectStub = res.redirect as sinon.SinonStub;

    await loginAction(req, res);

    assert.equal(redirectStub.calledOnce, true, "should redirect once only");
    assert.notEqual(
      redirectStub.firstCall.args[0],
      "http://test.service.justice.gov.uk",
      "should redirect to main uat, not entra",
    );
    assert.equal(
      mockSilasService.getAuthCodeUrl.called,
      false,
      "should not request an auth code url",
    );
  });
});

describe("silasController:callbackAction", () => {
  let sandbox: sinon.SinonSandbox;
  const acquireTokenByCodeReturnValue = {
    accessToken: "test-access-token",
    idToken: "test-id-token",
    account: {
      username: "test.user@justice.gov.uk",
      name: "Test user",
      homeAccountId: "1",
    },
  };
  let mockSilasService: {
    getAuthCodeUrl: sinon.SinonStub;
    acquireTokenByCode: sinon.SinonStub;
  };
  let req: Request;
  let res: Response;
  beforeEach(() => {
    req = createTestRequest();
    req.session.id = "1";
    res = createTestResponse();
    mockSilasService = {
      getAuthCodeUrl: sinon
        .stub()
        .returns("http://test.service.justice.gov.uk"),
      acquireTokenByCode: sinon.stub().returns(acquireTokenByCodeReturnValue),
    };
    sandbox = sinon.createSandbox();
    sandbox
      .stub(SilasService, "factory")
      .returns(mockSilasService as unknown as SilasService);
  });
  afterEach(() => {
    sandbox.restore();
    restoreConfig();
  });

  it("should stop after the uat redirect without exchanging the code", async () => {
    overrideConfig(config.app, "environment", "uat");
    req.session.return_to = VALID_RETURN_TO;
    req.query.code = "the-code";
    req.query.state = "the-state";
    const redirectStub = res.redirect as sinon.SinonStub;

    await callbackAction(req, res);

    assert.equal(redirectStub.calledOnce, true);
    assert.equal(
      (redirectStub.firstCall.args[0] as string).startsWith(
        `${VALID_RETURN_TO}?`,
      ),
      true,
      "should proxy to the ephemeral environment",
    );
    assert.equal(
      mockSilasService.acquireTokenByCode.called,
      false,
      "should not exchange the code on uat when proxying",
    );
  });

  it("should reject missing state", async () => {
    req.query.code = "1";
    const redirectStub = res.redirect as sinon.SinonStub;

    await callbackAction(req, res);
    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in for missing state",
    );
    assert.equal(
      req.session.flashError,
      "Validation code failed",
      "should flash a validation error for missing state",
    );

    req.query.state = "";
    redirectStub.resetHistory();
    req.session.flashError = undefined;
    await callbackAction(req, res);
    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in for empty state",
    );
    assert.equal(
      req.session.flashError,
      "Validation code failed",
      "should flash a validation error for empty state",
    );
  });

  it("should reject missing code", async () => {
    req.query.state = "1111";
    req.session.auth_nonce = "1111";
    const redirectStub = res.redirect as sinon.SinonStub;

    await callbackAction(req, res);
    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in for missing code",
    );
    assert.equal(
      req.session.flashError,
      "Validation code failed",
      "should flash a validation error for missing code",
    );

    req.query.code = "";
    redirectStub.resetHistory();
    req.session.flashError = undefined;
    await callbackAction(req, res);
    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in for empty code",
    );
    assert.equal(
      req.session.flashError,
      "Validation code failed",
      "should flash a validation error for empty code",
    );
  });

  it("should reject invalid session auth_nonce", async () => {
    req.query.state = "1111";
    req.query.code = "1111";
    const redirectStub = res.redirect as sinon.SinonStub;

    // session.auth_nonce is unset
    await callbackAction(req, res);
    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in for missing auth_nonce",
    );
    assert.equal(
      req.session.flashError,
      "Validation code failed",
      "should flash a validation error for missing auth_nonce",
    );

    // session.auth_nonce is empty
    req.session.auth_nonce = "";
    redirectStub.resetHistory();
    req.session.flashError = undefined;
    await callbackAction(req, res);
    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in for empty auth_nonce",
    );
    assert.equal(
      req.session.flashError,
      "Validation code failed",
      "should flash a validation error for empty auth_nonce",
    );

    // session.auth_nonce does not match state
    req.session.auth_nonce = "2222";
    redirectStub.resetHistory();
    req.session.flashError = undefined;
    await callbackAction(req, res);
    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in for auth_nonce and state mismatch",
    );
    assert.equal(
      req.session.flashError,
      "Validation code failed",
      "should flash a validation error for auth_nonce and state mismatch",
    );
  });

  it("should validate token response body", async () => {
    req.query.state = "1111";
    req.query.code = "1111";
    req.session.auth_nonce = "1111";
    const redirectStub = res.redirect as sinon.SinonStub;
    mockSilasService.acquireTokenByCode.returns({
      accessToken: "",
      idToken: "",
      account: {},
    });

    await callbackAction(req, res);

    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in for an invalid token response",
    );
    assert.equal(
      req.session.flashError,
      "Failed to save session",
      "should flash a session error for an invalid token response",
    );
    assert.notEqual(
      req.session.isAuthenticated,
      true,
      "user should not be authenticated",
    );
  });

  const invalidResponses: Array<[string, Record<string, unknown>]> = [
    [
      "empty access token",
      { ...acquireTokenByCodeReturnValue, accessToken: "" },
    ],
    ["empty id token", { ...acquireTokenByCodeReturnValue, idToken: "" }],
    ["null account", { ...acquireTokenByCodeReturnValue, account: null }],
    [
      "empty username",
      {
        ...acquireTokenByCodeReturnValue,
        account: { ...acquireTokenByCodeReturnValue.account, username: "" },
      },
    ],
    [
      "empty name",
      {
        ...acquireTokenByCodeReturnValue,
        account: { ...acquireTokenByCodeReturnValue.account, name: "" },
      },
    ],
    [
      "undefined name",
      {
        ...acquireTokenByCodeReturnValue,
        account: { ...acquireTokenByCodeReturnValue.account, name: undefined },
      },
    ],
    [
      "empty homeAccountId",
      {
        ...acquireTokenByCodeReturnValue,
        account: {
          ...acquireTokenByCodeReturnValue.account,
          homeAccountId: "",
        },
      },
    ],
  ];

  for (const [description, response] of invalidResponses) {
    it(`should reject token response with ${description}`, async () => {
      req.query.state = "1111";
      req.query.code = "2222";
      req.session.auth_nonce = "1111";
      const redirectStub = res.redirect as sinon.SinonStub;
      mockSilasService.acquireTokenByCode.returns(response);

      await callbackAction(req, res);

      assert.equal(redirectStub.calledWith("/sign-in"), true);
      assert.equal(req.session.flashError, "Failed to save session");
      assert.notEqual(req.session.isAuthenticated, true);
    });
  }

  it("should exchange code for access token", async () => {
    req.query.state = "1111";
    req.query.code = "2222";
    req.session.auth_nonce = "1111";
    const redirectStub = res.redirect as sinon.SinonStub;
    await callbackAction(req, res);
    assert.deepEqual(
      req.session.account,
      acquireTokenByCodeReturnValue.account,
      "session account should equal account returned from entra",
    );
    assert.equal(
      req.session.auth_nonce,
      undefined,
      "auth nonce should be reset",
    );
    assert.equal(
      req.session.isAuthenticated,
      true,
      "user should be authenticated",
    );
    assert.equal(
      redirectStub.calledWith("/dashboard"),
      true,
      "user should be redirect after successful login",
    );
  });

  it("should flash an error and redirect to sign-in when the code exchange fails", async () => {
    req.query.state = "1111";
    req.query.code = "2222";
    req.session.auth_nonce = "1111";
    const redirectStub = res.redirect as sinon.SinonStub;
    mockSilasService.acquireTokenByCode.rejects(
      new Error("acquireTokenByCode has failed"),
    );

    await callbackAction(req, res);

    assert.equal(
      redirectStub.calledWith("/sign-in"),
      true,
      "should redirect to sign-in when the exchange throws",
    );
    assert.equal(
      redirectStub.calledWith("/dashboard"),
      false,
      "should not redirect to the dashboard",
    );
    assert.equal(
      req.session.flashError,
      "Office code does not match",
      "should flash the office code error",
    );
    assert.notEqual(
      req.session.isAuthenticated,
      true,
      "user should not be authenticated",
    );
  });
});

describe("silasController:logoutAction", () => {
  it("should log user out", async () => {
    const req = createTestRequest();
    const res = createTestResponse();
    const destroySessionStub = req.session.destroy as sinon.SinonStub;
    const redirectStub = res.redirect as sinon.SinonStub;
    await logOut(req, res);
    assert.equal(
      destroySessionStub.called,
      true,
      "should destroy the session when logging out",
    );
    assert.equal(
      redirectStub.called,
      true,
      "should redirect the user when logging out",
    );
    assert.equal(
      redirectStub.firstCall.args[0],
      `https://login.microsoftonline.com/${config.silas.tenantId}/oauth2/v2.0/logout`,
    );
  });

  it("should still redirect to the provider logout when destroying the session fails", async () => {
    const req = createTestRequest();
    const res = createTestResponse();
    const destroySessionStub = req.session.destroy as sinon.SinonStub;
    destroySessionStub.yields(new Error("destroy failed"));
    const redirectStub = res.redirect as sinon.SinonStub;

    await logOut(req, res);

    assert.equal(destroySessionStub.called, true, "should try to destroy");
    assert.equal(
      redirectStub.calledOnce,
      true,
      "should still redirect when session cleanup fails",
    );
    assert.equal(
      redirectStub.firstCall.args[0],
      `https://login.microsoftonline.com/${config.silas.tenantId}/oauth2/v2.0/logout`,
    );
  });
});
