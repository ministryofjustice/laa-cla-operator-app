import { strict as assert } from "assert";
import axios, { AxiosError, AxiosHeaders } from "axios";
import sinon from "sinon";
import { CfeHttpClient } from "./cfe-http-client.js";

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
