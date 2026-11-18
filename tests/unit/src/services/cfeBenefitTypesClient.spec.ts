import assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
  CfeClientError,
  DEFAULT_CFE_STAGING_ORIGIN,
} from "#src/services/cfeClient.js";
import { getBenefitTypeSuggestions } from "#src/services/cfeBenefitTypesClient.js";

const response = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("CFE benefit type client", () => {
  it("loads applicable unique benefit names from the staging reference endpoint", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const benefitTypes = [
      { name: "Child Benefit", label: "child_benefit" },
      { name: "Universal Credit", label: "universal_credit" },
      {
        name: "Excluded benefit",
        label: "other",
        exclude_from_gross_income: true,
      },
      { name: "Child Benefit", label: "child_benefit_alias" },
    ];

    const suggestions = await getBenefitTypeSuggestions({
      baseUrl: DEFAULT_CFE_STAGING_ORIGIN,
      fetchImpl: async (input, init) => {
        calls.push({ input, init });
        return response(benefitTypes);
      },
    });

    assert.deepEqual(suggestions, ["Child Benefit"]);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].input,
      `${DEFAULT_CFE_STAGING_ORIGIN}/state_benefit_type`,
    );
    assert.equal(calls[0].init?.method, "GET");
    assert.deepEqual(calls[0].init?.headers, { Accept: "application/json" });
  });

  it("rejects malformed state-benefit reference responses", async () => {
    await assert.rejects(
      getBenefitTypeSuggestions({
        baseUrl: DEFAULT_CFE_STAGING_ORIGIN,
        fetchImpl: async () => response([{ name: "Child Benefit" }]),
      }),
      (error: unknown) =>
        error instanceof CfeClientError && error.code === "invalid-response",
    );
  });

  it("rejects hosts other than the CFE staging origin", async () => {
    await assert.rejects(
      getBenefitTypeSuggestions({
        baseUrl: "https://cfe.example.test",
        fetchImpl: async () => response([]),
      }),
      (error: unknown) =>
        error instanceof CfeClientError && error.code === "configuration",
    );
  });
});
