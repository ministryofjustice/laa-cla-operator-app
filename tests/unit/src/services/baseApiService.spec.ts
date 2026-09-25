/**
 * Base API Service Tests
 *
 * Tests for the BaseApiService class extracted from MCC patterns.
 * Verifies HTTP client configuration, logging, and error handling functionality.
 */

import { strict as assert } from "assert";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import config from "#config.js";
import {
  configureAxiosInstance,
  handleApiCall,
} from "#src/services/api/baseApiService.js";

describe("baseApiService", () => {
  const apiConfig = config.api as { baseUrl: unknown };
  let originalBaseUrl: unknown;

  beforeEach(() => {
    originalBaseUrl = apiConfig.baseUrl;
  });

  afterEach(() => {
    apiConfig.baseUrl = originalBaseUrl;
  });

  describe("handleApiCall", () => {
    it("returns the API response when the call succeeds", async () => {
      const payload = { id: 1, status: "ok" };

      const result = await handleApiCall(async () => payload, "fetching data");

      assert.deepStrictEqual(result, payload);
    });

    it("wraps failures with a user-facing message and preserves cause", async () => {
      const originalError = new Error("backend down");

      await assert.rejects(
        () =>
          handleApiCall(
            async () => Promise.reject(originalError),
            "loading cases",
          ),
        (error: unknown) => {
          assert(error instanceof Error);
          assert.strictEqual(
            error.message,
            "An unexpected error occurred. Please try again.",
          );
          assert.strictEqual(error.cause, originalError);
          return true;
        },
      );
    });
  });

  describe("configureAxiosInstance", () => {
    function createWrapper(
      baseURL = "http://existing.local",
    ): AxiosInstanceWrapper {
      return {
        axiosInstance: {
          defaults: {
            baseURL,
            headers: {
              common: {},
            },
          },
        },
      } as unknown as AxiosInstanceWrapper;
    }

    it("sets API base URL and JSON headers", () => {
      const wrapper = createWrapper();
      apiConfig.baseUrl = "https://backend.example";

      const configured = configureAxiosInstance(wrapper);

      assert.strictEqual(configured, wrapper);
      assert.strictEqual(
        wrapper.axiosInstance.defaults.baseURL,
        "https://backend.example",
      );
      assert.strictEqual(
        wrapper.axiosInstance.defaults.headers.common["Content-Type"],
        "application/json",
      );
      assert.strictEqual(
        wrapper.axiosInstance.defaults.headers.common.Accept,
        "application/json",
      );
    });

    it("keeps existing base URL when config baseUrl is not a string", () => {
      const wrapper = createWrapper("http://keep.local");
      apiConfig.baseUrl = 1234;

      configureAxiosInstance(wrapper);

      assert.strictEqual(
        wrapper.axiosInstance.defaults.baseURL,
        "http://keep.local",
      );
      assert.strictEqual(
        wrapper.axiosInstance.defaults.headers.common["Content-Type"],
        "application/json",
      );
      assert.strictEqual(
        wrapper.axiosInstance.defaults.headers.common.Accept,
        "application/json",
      );
    });
  });
});
