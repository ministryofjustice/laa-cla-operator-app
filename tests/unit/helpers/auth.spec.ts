import { expect } from "chai";
import sinon from "sinon";
import { ConfidentialClientApplication } from "@azure/msal-node";
import config from "../../../config.js";
import {
  callbackAction,
  loginAction,
  logOut,
} from "../../../src/controllers/silasController.js";

const VALID_STATE = "abc";
// These are the standard OpenID Connect scopes. They are excluded because the
// controller only requires one application/delegated scope from the token.
const OIDC_SCOPES = new Set(["openid", "profile", "offline_access"]);

function normalizeScope(scope: string): string {
  const segments = scope.split("/").filter(Boolean);
  return segments.at(-1) ?? scope;
}

// Build the default `scp` claim from the same environment-backed config used by
// the controller. This keeps the test valid in CI and when run locally.
const DEFAULT_SCP = config.silas.scopes
  .filter((scope) => !OIDC_SCOPES.has(scope.toLowerCase()))
  .map(normalizeScope)
  .join(" ");

function buildToken(overrides: Record<string, any> = {}) {
  // The controller decodes the middle part of a JWT but does not verify its
  // signature, so a lightweight encoded header/payload is enough for unit tests.
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
  // These variables are replaced with fresh Sinon stubs before each test.
  // `any` keeps the Express request/response doubles small: each test supplies
  // only the properties that the controller actually reads or calls.
  let req: any;
  let res: any;
  let statusStub: sinon.SinonStub;
  let sendStub: sinon.SinonStub;
  let redirectStub: sinon.SinonStub;
  let acquireTokenStub: sinon.SinonStub;

  function validEntraResponse(accessToken: string) {
    // This is the successful shape returned by MSAL. Individual tests spread
    // over it to create invalid responses without repeating every valid field.
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

  function configureValidCallback() {
    const accessToken = buildToken();
    // Stub the prototype method because the controller creates its MSAL client
    // at module load time. Resolves() makes the fake behave like the async API.
    acquireTokenStub.resolves(validEntraResponse(accessToken));
    // callbackAction reads OAuth values from req.query and compares state with
    // the nonce stored in the session.
    req.query = { code: "auth-code", state: VALID_STATE };
    return accessToken;
  }

  beforeEach(() => {
    // Stub the MSAL prototype before each test so no network request can occur.
    acquireTokenStub = sinon.stub(ConfidentialClientApplication.prototype, "acquireTokenByCode");
    sendStub = sinon.stub();
    redirectStub = sinon.stub();
    // status() returns an object with send(), matching Express chaining.
    statusStub = sinon.stub().returns({ send: sendStub });

    // The session methods use Node-style callbacks. These default to success;
    // failure tests replace one method with a callback that returns an Error.
    req = {
      query: {},
      session: {
        auth_nonce: VALID_STATE,
        regenerate: sinon.stub().callsFake((cb: (err: any) => void) => cb(null)),
        save: sinon.stub().callsFake((cb: (err: any) => void) => cb(null)),
      },
    };
    // The response double contains only the Express methods used by the action.
    res = { status: statusStub, redirect: redirectStub };
  });

  afterEach(() => {
    // Restore every Sinon stub so tests cannot affect one another.
    sinon.restore();
  });


  describe("input validation", () => {
    // Table-driven cases keep the same expected behavior together while making
    // each missing query parameter explicit in the test output.
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
      { desc: "required scope is missing", token: buildToken({ scp: "unrelated-scope" }) },
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

  describe("MSAL response validation", () => {
    // Each partial response is merged into a valid response so the test targets
    // exactly one missing/empty account or token field at a time.
    const cases = [
      { desc: "access token is empty", response: { accessToken: "" } },
      { desc: "id token is empty", response: { idToken: "" } },
      { desc: "account is missing", response: { account: null } },
      { desc: "account username is empty", response: { account: { username: "" } } },
      { desc: "account name is empty", response: { account: { name: "" } } },
      { desc: "account id is empty", response: { account: { homeAccountId: "" } } },
    ];

    cases.forEach(({ desc, response }) => {
      it(`returns 500 when the ${desc}`, async () => {
        acquireTokenStub.resolves({
          ...validEntraResponse(buildToken()),
          ...response,
          account:
            response.account === null
              ? null
              : { ...validEntraResponse(buildToken()).account, ...response.account },
        });
        req.query = { code: "auth-code", state: VALID_STATE };

        await callbackAction(req, res);

        expect(statusStub.calledOnceWith(500)).to.be.true;
        expect(sendStub.calledOnceWith("")).to.be.true;
        expect(redirectStub.called).to.be.false;
      });
    });
  });

  it("stores authenticated user data and redirects after a valid callback", async () => {
    const accessToken = configureValidCallback();

    await callbackAction(req, res);

    expect(req.session.auth_nonce).to.be.undefined;
    expect(req.session.silasAuth).to.include({
      accessToken,
      idToken: "fake-id-token",
      email: "user@example.com",
      name: "Test User",
    });
    expect(req.session.user).to.deep.equal({
      email: "user@example.com",
      name: "Test User",
      oid: "home-account-id",
    });
    expect(req.session.regenerate.calledOnce).to.be.true;
    expect(req.session.save.calledOnce).to.be.true;
    expect(redirectStub.calledOnceWith("/receive-call")).to.be.true;
  });

  describe("session handling", () => {
    it("returns 500 if session regeneration fails", async () => {
      // Express-session reports callback errors; Sinon invokes the callback with
      // an Error to exercise the controller's catch block.
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

describe("loginAction", () => {
  it("stores a nonce, saves the session, and redirects to the authorization URL", async () => {
    // Stub the MSAL URL builder and return a deterministic URL. The controller
    // still generates the nonce, so the assertion checks that it is passed as
    // the OAuth state value rather than hard-coding a random value.
    const getAuthCodeUrlStub = sinon
      .stub(ConfidentialClientApplication.prototype, "getAuthCodeUrl")
      .resolves("https://login.example/auth");
    const saveStub = sinon.stub().callsFake((callback: (err: null) => void) => callback(null));
    // loginAction needs only session.save() on the request and redirect() on the response.
    const req: any = { session: { save: saveStub } };
    const redirectStub = sinon.stub();
    const res: any = { redirect: redirectStub };

    await loginAction(req, res);

    expect(req.session.auth_nonce).to.be.a("string").and.not.empty;
    expect(saveStub.calledOnce).to.be.true;
    expect(getAuthCodeUrlStub.calledOnceWith({
      scopes: config.silas.scopes,
      redirectUri: config.silas.redirectUri,
      state: req.session.auth_nonce,
    })).to.be.true;
    expect(redirectStub.calledOnceWith("https://login.example/auth")).to.be.true;
    sinon.restore();
  });
});

describe("logOut", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("destroys the session, clears the cookie, and redirects to SILAS logout", async () => {
    // The logout URL is built from config; the session destroy callback is made
    // successful here so the normal cleanup path can be asserted.
    const destroyStub = sinon.stub().callsFake((callback: (err: null) => void) => callback(null));
    const req: any = { session: { destroy: destroyStub } };
    const clearCookieStub = sinon.stub();
    const redirectStub = sinon.stub();
    const res: any = { clearCookie: clearCookieStub, redirect: redirectStub };

    await logOut(req, res);

    expect(destroyStub.calledOnce).to.be.true;
    expect(clearCookieStub.calledOnceWith("connect.sid")).to.be.true;
    expect(redirectStub.calledOnceWith(
      `${config.silas.authority}/oauth2/v2.0/logout`,
    )).to.be.true;
  });

  it("still clears the cookie and redirects when session destruction fails", async () => {
    // Provider logout must still happen when local session cleanup fails.
    const destroyStub = sinon
      .stub()
      .callsFake((callback: (err: Error) => void) => callback(new Error("destroy failed")));
    const req: any = { session: { destroy: destroyStub } };
    const clearCookieStub = sinon.stub();
    const redirectStub = sinon.stub();
    const res: any = { clearCookie: clearCookieStub, redirect: redirectStub };

    await logOut(req, res);

    expect(clearCookieStub.calledOnceWith("connect.sid")).to.be.true;
    expect(redirectStub.calledOnce).to.be.true;
  });
});




