import { expect } from "chai";
import sinon from "sinon";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { callbackAction } from "../../../src/controllers/silasController.js";

function testConfig() {
  const tenantId = "test-tenant-id";
  const expectedAudience = "test-expected-audience";

  const silas = {
    authority: `https://login.microsoftonline.com/${tenantId}`,
    tenantId,
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:3000/redirect",
    postLogoutRedirectUri: "/",
    scopes: ["openid", "profile", "email"],
    expectedAudience,
  };

  return { silas };
}

const config = testConfig();
const VALID_STATE = "abc";
const OIDC_SCOPES = new Set(["openid", "profile", "offline_access"]);

function normalizeScope(scope: string): string {
  const segments = scope.split("/").filter(Boolean);
  return segments.at(-1) ?? scope;
}

const DEFAULT_SCP = config.silas.scopes
  .filter((scope) => !OIDC_SCOPES.has(scope.toLowerCase()))
  .map(normalizeScope)
  .join(" ");

function buildToken(overrides: Record<string, any> = {}) {
  const header = { alg: "RS256", typ: "JWT", kid: "" };

  const payload = {
    iss: `https://login.microsoftonline.com/${config.silas.tenantId}/v2.0`,
    aud: config.silas.expectedAudience,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    name: "Test User",
    scp: DEFAULT_SCP,
    APP_ROLE: null,
    FIRM_NAME: null,
    LAA_ACCOUNTS: null,
    USER_EMAIL: "user@example.com",
    USER_NAME: "Test User",
    ...overrides,
  };

  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}

describe("callbackAction", () => {
  let req: any;
  let res: any;
  let statusStub: sinon.SinonStub;
  let sendStub: sinon.SinonStub;
  let redirectStub: sinon.SinonStub;
  let acquireTokenStub: sinon.SinonStub;

  function validEntraResponse(accessToken: string) {
    return {
      accessToken,
      idToken: "fake-id-token",
      expiresOn: new Date(Date.now() + 60 * 60 * 1000),
      account: {
        username: "user@example.com",
        name: "Test User",
        homeAccountId: "home-account-id",
      },
    };
  }

  beforeEach(() => {
    acquireTokenStub = sinon.stub(ConfidentialClientApplication.prototype, "acquireTokenByCode");
    sendStub = sinon.stub();
    redirectStub = sinon.stub();
    statusStub = sinon.stub().returns({ send: sendStub });

    req = {
      query: {},
      session: {
        auth_nonce: VALID_STATE,
        regenerate: sinon.stub().callsFake((cb: (err: any) => void) => cb(null)),
        save: sinon.stub().callsFake((cb: (err: any) => void) => cb(null)),
      },
    };
    res = { status: statusStub, redirect: redirectStub };
  });

  afterEach(() => {
    sinon.restore();
  });


  describe("input validation", () => {
    const cases = [
      { desc: "code is missing", query: { state: "some-state" } },
      { desc: "state is missing", query: { code: "some-code" } },
    ];

    cases.forEach(({ desc, query }) => {
      it(`returns 500 when ${desc}`, async () => {
        req.query = query;
        await callbackAction(req, res);

        expect(statusStub.calledOnceWith(500)).to.be.true;
        expect(sendStub.calledOnceWith("")).to.be.true;
        expect(acquireTokenStub.called).to.be.false;
      });
    });

    it("returns 500 when state does not match the session nonce", async () => {
      req.session.auth_nonce = "different-nonce";
      req.query = { code: "auth-code", state: VALID_STATE };

      await callbackAction(req, res);

      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(sendStub.calledOnceWith("")).to.be.true;
      expect(acquireTokenStub.called).to.be.false;
    });
  });

  describe("token claim validation failure", () => {
    const cases = [
      { desc: "issuer doesn't match", token: buildToken({ iss: "https://not-microsoft.example.com" }) },
      { desc: "audience doesn't match", token: buildToken({ aud: "wrong-audience" }) },
      { desc: "malformed token can't be decoded", token: "not.a.validtoken.reallyattall" },
    ];

    cases.forEach(({ desc, token }) => {
      it(`returns 500 when the ${desc}`, async () => {
        acquireTokenStub.resolves(validEntraResponse(token));
        req.query = { code: "auth-code", state: VALID_STATE };

        await callbackAction(req, res);
        expect(statusStub.calledOnceWith(500)).to.be.true;
        expect(sendStub.calledOnceWith("Authentication failed")).to.be.true;
        expect(redirectStub.called).to.be.false;
      });
    });
  });

  describe("session handling", () => {
    it("returns 500 if session regeneration fails", async () => {
      req.session.regenerate = sinon
        .stub()
        .callsFake((cb: (err: any) => void) => cb(new Error("regen failed")));
      acquireTokenStub.resolves(validEntraResponse(buildToken()));

      req.query = { code: "auth-code", state: VALID_STATE };
      await callbackAction(req, res);
      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(sendStub.calledOnceWith("Authentication failed")).to.be.true;
      expect(redirectStub.called).to.be.false;
    });

    it("returns 500 and does not redirect if session save fails", async () => {
      req.session.save = sinon
        .stub()
        .callsFake((cb: (err: any) => void) => cb(new Error("save failed")));
      acquireTokenStub.resolves(validEntraResponse(buildToken()));

      req.query = { code: "auth-code", state: VALID_STATE };
      await callbackAction(req, res);

      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(sendStub.calledOnceWith("Authentication failed")).to.be.true;
      expect(redirectStub.called).to.be.false;
    });
  });
});




