import {
  callbackAction,
  loginAction,
  logOut,
} from "#src/controllers/silasController.js";
import assert from "node:assert/strict";
import { describe } from "mocha";
import sinon from "sinon";
import type { Request, Response } from "express";
import { createTestRequest, createTestResponse } from "./index.js";
import { SilasService } from "#src/services/api/silasService.js";
import { INTERNAL_SERVER_ERROR } from "#src/constants.js";
import config from "#config.js";

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
  });
  it("should redirect user to entra", async () => {
    const redirectStub = res.redirect as sinon.SinonStub;
    await loginAction(req, res);
    assert.equal(
      redirectStub.calledWith("http://test.service.justice.gov.uk"),
      true,
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
  });
  it("should reject missing state", async () => {
    req.query.code = "1";
    const statusStub = res.status as sinon.SinonStub;
    await callbackAction(req, res);
    assert.equal(
      statusStub.calledWith(INTERNAL_SERVER_ERROR),
      true,
      "should return 500 error for missing state",
    );

    req.query.state = "";
    statusStub.reset();
    statusStub.returns(res);
    await callbackAction(req, res);
    assert.equal(
      statusStub.calledWith(INTERNAL_SERVER_ERROR),
      true,
      "should return 500 error for empty state",
    );
  });

  it("should reject missing code", async () => {
    req.query.state = "1111";
    req.session.auth_nonce = "1111";
    const statusStub = res.status as sinon.SinonStub;
    await callbackAction(req, res);
    assert.equal(
      statusStub.calledWith(INTERNAL_SERVER_ERROR),
      true,
      "should return 500 error for missing code",
    );

    req.query.code = "";
    statusStub.reset();
    statusStub.returns(res);
    await callbackAction(req, res);
    assert.equal(
      statusStub.calledWith(INTERNAL_SERVER_ERROR),
      true,
      "should return 500 error for empty code",
    );
  });

  it("should reject invalid sesssion auth_nonce", async () => {
    req.query.state = "1111";
    req.query.code = "1111";
    const statusStub = res.status as sinon.SinonStub;
    await callbackAction(req, res);
    assert.equal(
      statusStub.calledWith(INTERNAL_SERVER_ERROR),
      true,
      "should return 500 error for missing auth_nonce",
    );

    req.query.auth_nonce = "";
    statusStub.reset();
    statusStub.returns(res);
    await callbackAction(req, res);
    assert.equal(
      statusStub.calledWith(INTERNAL_SERVER_ERROR),
      true,
      "should return 500 error for empty auth_nonce",
    );

    req.query.auth_nonce = "2222";
    statusStub.reset();
    statusStub.returns(res);
    await callbackAction(req, res);
    assert.equal(
      statusStub.calledWith(INTERNAL_SERVER_ERROR),
      true,
      "should return 500 error for auth_nonce and state mismatch",
    );
  });

  it("should validate token response body", async () => {
    req.query.state = "1111";
    req.query.code = "1111";
    req.session.auth_nonce = "1111";
    const statusStub = res.status as sinon.SinonStub;
    mockSilasService.acquireTokenByCode.returns({
      accessToken: "",
      idToken: "",
      account: {},
    });
    await callbackAction(req, res);
    assert.equal(
      statusStub.calledWith(INTERNAL_SERVER_ERROR),
      true,
      "should return 500 error for missing auth_nonce",
    );
  });

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
});

describe("silasController:logoutAction", async () => {
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
});
