import assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
  CfeClient,
  CfeClientError,
  DEFAULT_CFE_STAGING_ORIGIN,
  type CfeAssessmentResponse,
} from "#src/services/cfeClient.js";
import { createSyntheticCfeAssessment } from "#src/services/cfeSyntheticFixture.js";

const proceedingResult = {
  ccms_code: "DA001",
  client_involvement_type: "A",
  upper_threshold: 10000,
  lower_threshold: 0,
  result: "eligible",
} as const;

const validResponse: CfeAssessmentResponse = {
  timestamp: "2026-11-05T00:00:00Z",
  version: "7",
  success: true,
  result_summary: {
    overall_result: {
      result: "eligible",
      capital_contribution: 0,
      income_contribution: 0,
      proceeding_types: [proceedingResult],
    },
    gross_income: {
      total_gross_income: 0,
      combined_total_gross_income: 0,
      proceeding_types: [proceedingResult],
    },
    disposable_income: { total_disposable_income: 0 },
    capital: { assessed_capital: 0 },
  },
  assessment: {
    id: "synthetic-test-id",
    level_of_help: "controlled",
    remarks: {},
  },
};

const response = (
  body: unknown,
  status = 200,
  contentType = "application/json",
): Response =>
  new Response(
    contentType === "application/json" ? JSON.stringify(body) : String(body),
    {
      status,
      headers: { "Content-Type": contentType },
    },
  );

describe("CfeClient", () => {
  it("submits only the synthetic v7 controlled-work fixture to staging", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ input, init });
      return response(validResponse);
    };
    const client = new CfeClient({ fetchImpl });
    const request = createSyntheticCfeAssessment("2026-11-05");

    const result = await client.submitAssessment(request);

    assert.deepEqual(result, validResponse);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].input,
      `${DEFAULT_CFE_STAGING_ORIGIN}/v7/assessments`,
    );
    assert.equal(calls[0].init?.method, "POST");
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), request);
    assert.deepEqual(calls[0].init?.headers, {
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    assert.equal(request.assessment.level_of_help, "controlled");
    assert.equal(request.applicant.date_of_birth, "1980-01-01");
    assert.equal("client_reference_id" in request.assessment, false);
  });

  it("rejects hosts other than the CFE staging origin", () => {
    assert.throws(
      () => new CfeClient({ baseUrl: "https://cfe.example.test" }),
      (error: unknown) =>
        error instanceof CfeClientError && error.code === "configuration",
    );
  });

  it("reports unexpected HTTP statuses without parsing a result", async () => {
    const client = new CfeClient({
      fetchImpl: async () => response({ detail: "invalid" }, 422),
    });

    await assert.rejects(
      client.submitAssessment(createSyntheticCfeAssessment()),
      (error: unknown) =>
        error instanceof CfeClientError &&
        error.code === "http" &&
        error.status === 422,
    );
  });

  it("reports network failures explicitly", async () => {
    const client = new CfeClient({
      fetchImpl: async () => {
        throw new TypeError("network unavailable");
      },
    });

    await assert.rejects(
      client.submitAssessment(createSyntheticCfeAssessment()),
      (error: unknown) =>
        error instanceof CfeClientError && error.code === "network",
    );
  });

  it("reports timeouts explicitly", async () => {
    const client = new CfeClient({
      fetchImpl: async () => {
        throw new DOMException("timed out", "TimeoutError");
      },
    });

    await assert.rejects(
      client.submitAssessment(createSyntheticCfeAssessment()),
      (error: unknown) =>
        error instanceof CfeClientError && error.code === "timeout",
    );
  });

  it("rejects malformed or incomplete v7 responses", async () => {
    const client = new CfeClient({
      fetchImpl: async () =>
        response({
          ...validResponse,
          result_summary: {
            ...validResponse.result_summary,
            overall_result: {
              ...validResponse.result_summary.overall_result,
              result: "success",
            },
          },
        }),
    });

    await assert.rejects(
      client.submitAssessment(createSyntheticCfeAssessment()),
      (error: unknown) =>
        error instanceof CfeClientError && error.code === "invalid-response",
    );
  });

  it("reports invalid JSON responses explicitly", async () => {
    const client = new CfeClient({
      fetchImpl: async () => response("not json", 200, "text/plain"),
    });

    await assert.rejects(
      client.submitAssessment(createSyntheticCfeAssessment()),
      (error: unknown) =>
        error instanceof CfeClientError && error.code === "invalid-response",
    );
  });
});
