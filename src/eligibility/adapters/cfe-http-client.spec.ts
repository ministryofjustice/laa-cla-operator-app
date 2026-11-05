import { strict as assert } from "assert";
import axios, { AxiosError, AxiosHeaders } from "axios";
import sinon from "sinon";
import { CfeHttpClient } from "./cfe-http-client.js";

describe("CfeHttpClient v6 assessment responses", () => {
  afterEach(() => sinon.restore());

  function successfulClient(data: unknown) {
    const instance = axios.create();
    const post = sinon.stub(instance, "post").resolves({ status: 200, data });
    sinon.stub(axios, "create").returns(instance);
    return {
      client: new CfeHttpClient({ baseUrl: "http://cfe.test" }),
      post,
    };
  }

  it("preserves the eligible asylum-support result when means are not calculated", async () => {
    const { client, post } = successfulClient({
      version: "6",
      success: true,
      result_summary: {
        overall_result: {
          result: "eligible",
          proceeding_types: [{ ccms_code: "IA031", result: "eligible" }],
        },
        disposable_income: {
          combined_total_disposable_income: 0,
          proceeding_types: [{ ccms_code: "IA031", result: "not_calculated" }],
        },
        capital: {
          combined_assessed_capital: 0,
          proceeding_types: [{ ccms_code: "IA031", result: "not_calculated" }],
        },
      },
    });
    const payload = {
      assessment: {
        submission_date: "2026-10-21",
        level_of_help: "controlled",
      },
      proceeding_types: [{ ccms_code: "IA031", client_involvement_type: "A" }],
      applicant: { date_of_birth: "2000-01-01", receives_asylum_support: true },
    };

    assert.deepEqual(await client.assess(payload), {
      result: "eligible",
      calculations: { disposable_income: 0, disposable_capital: 0 },
    });
    sinon.assert.calledOnceWithExactly(
      post,
      "http://cfe.test/v6/assessments",
      payload,
    );
  });

  for (const result of ["eligible", "ineligible", "contribution_required"]) {
    it(`maps the overall ${result} decision and combined means`, async () => {
      const { client } = successfulClient({
        success: true,
        result_summary: {
          overall_result: { result },
          disposable_income: {
            total_disposable_income: 100,
            combined_total_disposable_income: 250,
          },
          capital: { assessed_capital: 1000, combined_assessed_capital: 2000 },
        },
      });

      assert.deepEqual(await client.assess({}), {
        result,
        calculations: { disposable_income: 250, disposable_capital: 2000 },
      });
    });
  }

  it("allows omitted calculations for an otherwise valid overall result", async () => {
    const { client } = successfulClient({
      success: true,
      result_summary: { overall_result: { result: "eligible" } },
    });

    assert.deepEqual(await client.assess({}), {
      result: "eligible",
      calculations: {
        disposable_income: undefined,
        disposable_capital: undefined,
      },
    });
  });

  for (const result of [
    undefined,
    null,
    "",
    "not_calculated",
    "unexpected",
    1,
  ]) {
    it(`rejects an unsupported overall result: ${String(result)}`, async () => {
      const { client } = successfulClient({
        success: true,
        result_summary: { overall_result: { result } },
      });

      await assert.rejects(
        client.assess({}),
        /CFE assessment failed: Unsupported CFE assessment result:/u,
      );
    });
  }

  for (const result_summary of [undefined, {}, { overall_result: {} }]) {
    it(`rejects a missing overall result: ${JSON.stringify(result_summary)}`, async () => {
      const { client } = successfulClient({ success: true, result_summary });

      await assert.rejects(
        client.assess({}),
        /CFE assessment failed: Unsupported CFE assessment result: undefined/u,
      );
    });
  }

  for (const data of [
    null,
    {},
    {
      success: false,
      result_summary: { overall_result: { result: "eligible" } },
    },
  ]) {
    it(`rejects an unsuccessful assessment: ${JSON.stringify(data)}`, async () => {
      const { client } = successfulClient(data);

      await assert.rejects(
        client.assess({}),
        /CFE assessment failed: CFE did not return a successful assessment/u,
      );
    });
  }
});

describe("CfeHttpClient assessment errors", () => {
  afterEach(() => sinon.restore());

  function failingClient(data: unknown) {
    const instance = axios.create();
    const error = new AxiosError(
      "Request failed with status code 422",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 422,
        statusText: "Unprocessable Entity",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data,
      },
    );
    sinon.stub(instance, "post").rejects(error);
    sinon.stub(axios, "create").returns(instance);
    return {
      client: new CfeHttpClient({ baseUrl: "http://cfe.test" }),
      error,
    };
  }

  it("includes CFE validation errors and preserves the original cause", async () => {
    const { client, error } = failingClient({
      errors: [
        "The property '#/applicant' did not contain a required property of 'date_of_birth'",
      ],
    });

    await assert.rejects(client.assess({}), (failure: unknown) => {
      assert.ok(failure instanceof Error);
      assert.match(failure.message, /422.*validation errors:.*date_of_birth/u);
      assert.equal(failure.cause, error);
      return true;
    });
  });

  for (const data of [
    undefined,
    null,
    "upstream failure",
    {},
    { errors: {} },
  ]) {
    it(`preserves HTTP errors with a non-validation response: ${JSON.stringify(data)}`, async () => {
      const { client, error } = failingClient(data);

      await assert.rejects(client.assess({}), (failure: unknown) => {
        assert.ok(failure instanceof Error);
        assert.equal(
          failure.message,
          "CFE assessment failed: Request failed with status code 422",
        );
        assert.equal(failure.cause, error);
        return true;
      });
    });
  }
});
