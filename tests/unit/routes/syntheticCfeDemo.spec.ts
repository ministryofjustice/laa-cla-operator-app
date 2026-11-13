import assert from "node:assert/strict";
import express from "express";
import { describe, it } from "mocha";
import request from "supertest";
import syntheticCfeDemoRouter, {
  isSyntheticCfeDemoEnabled,
} from "#routes/syntheticCfeDemo.js";

describe("synthetic CFE demonstration access gate", () => {
  it("is disabled when the feature flag is absent or false", () => {
    assert.equal(isSyntheticCfeDemoEnabled("development", undefined), false);
    assert.equal(isSyntheticCfeDemoEnabled("development", "false"), false);
    assert.equal(isSyntheticCfeDemoEnabled("test", undefined), false);
  });

  it("is enabled only by an explicit non-production flag", () => {
    assert.equal(isSyntheticCfeDemoEnabled("development", "true"), true);
    assert.equal(isSyntheticCfeDemoEnabled("test", "true"), true);
    assert.equal(isSyntheticCfeDemoEnabled("production", "true"), false);
  });

  it("does not hide unrelated routes when the demo is disabled", async () => {
    const previousEnvironment = process.env.NODE_ENV;
    const previousFlag = process.env.CFE_SYNTHETIC_DEMO_ENABLED;
    process.env.NODE_ENV = "development";
    process.env.CFE_SYNTHETIC_DEMO_ENABLED = "false";

    const app = express();
    app.use(syntheticCfeDemoRouter);
    app.get("/unrelated", (_req, res) => {
      res.sendStatus(204);
    });

    try {
      const demoResponse = await request(app).get(
        "/dev/cfe-synthetic-assessment",
      );
      const unrelatedResponse = await request(app).get("/unrelated");

      assert.equal(demoResponse.status, 404);
      assert.equal(unrelatedResponse.status, 204);
    } finally {
      if (previousEnvironment === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousEnvironment;
      }

      if (previousFlag === undefined) {
        delete process.env.CFE_SYNTHETIC_DEMO_ENABLED;
      } else {
        process.env.CFE_SYNTHETIC_DEMO_ENABLED = previousFlag;
      }
    }
  });
});
