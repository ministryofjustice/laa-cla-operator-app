import { strict as assert } from "assert";
import sinon from "sinon";
import { MemoryStore } from "express-session";
import { buildSessionConfig } from "#utils/session.js";
import type { Config } from "#types/config-types.js";

describe("session", () => {
  describe("buildSessionConfig", () => {
    let consoleLogStub: sinon.SinonStub;

    const testConfig = {
      session: {
        secret: "test-secret",
        name: "test-session-name",
        resave: false,
        saveUninitialized: false,
      },
      redis: {
        host: "",
        enabled: false
      }
    } as Config;

    beforeEach(() => {
      consoleLogStub = sinon.stub(console, "log");
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return the session config spread with a store", async () => {
      const result = await buildSessionConfig(testConfig);

      assert.equal(result.secret, testConfig.session.secret);
      assert.equal(result.name, testConfig.session.name);
      assert.equal(result.resave, testConfig.session.resave);
      assert.equal(
        result.saveUninitialized,
        testConfig.session.saveUninitialized,
      );
    });

    it("should use an in-memory session store", async () => {
      const result = await buildSessionConfig(testConfig);

      assert(
        result.store instanceof MemoryStore,
        "Should use a MemoryStore instance",
      );
    });

    it("should warn that the in-memory store is unsuitable for production", async () => {
      await buildSessionConfig(testConfig);

      assert(consoleLogStub.calledOnce, "Should log a warning");
    });
  });
});
