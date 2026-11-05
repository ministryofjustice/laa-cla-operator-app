import { strict as assert } from "assert";
import type { Assessor, StateBenefitType } from "../ports/index.js";
import { loadBenefitTypeOptions } from "./benefit-types.js";

const carers: StateBenefitType = {
  name: "Carer's Allowance",
  label: "carers_allowance",
  exclude_from_gross_income: false,
};

function assessorReturning(responses: (StateBenefitType[] | Error)[]): {
  assessor: Assessor;
  calls: () => number;
} {
  let calls = 0;
  const assessor: Assessor = {
    assess: async () => ({ result: "eligible" }),
    stateBenefitTypes: async () => {
      const response = responses[Math.min(calls, responses.length - 1)];
      calls += 1;
      if (response instanceof Error) throw response;
      return response;
    },
  };
  return { assessor, calls: () => calls };
}

describe("registries/benefit-types", () => {
  it("returns the filtered options from CFE", async () => {
    const { assessor } = assessorReturning([[carers]]);

    assert.deepEqual(await loadBenefitTypeOptions(assessor), [
      { value: "Carer's Allowance", text: "Carer's Allowance" },
    ]);
  });

  it("reuses a recent successful response", async () => {
    const { assessor, calls } = assessorReturning([[carers]]);

    await loadBenefitTypeOptions(assessor, 0);
    await loadBenefitTypeOptions(assessor, 1000);

    assert.equal(calls(), 1);
  });

  it("fetches again once the cached response is old", async () => {
    const { assessor, calls } = assessorReturning([[carers]]);

    await loadBenefitTypeOptions(assessor, 0);
    await loadBenefitTypeOptions(assessor, 11 * 60 * 1000);

    assert.equal(calls(), 2);
  });

  it("throws when the call fails, and does not remember the failure", async () => {
    const { assessor, calls } = assessorReturning([
      new Error("Failed to fetch benefit types: 502"),
      [carers],
    ]);

    await assert.rejects(
      loadBenefitTypeOptions(assessor),
      /Failed to fetch benefit types: 502/u,
    );
    assert.equal((await loadBenefitTypeOptions(assessor)).length, 1);
    assert.equal(calls(), 2);
  });

  it("throws when CFE returns nothing to offer, and does not cache it", async () => {
    const { assessor, calls } = assessorReturning([[], [carers]]);

    await assert.rejects(
      loadBenefitTypeOptions(assessor),
      /no state benefit types/u,
    );
    await loadBenefitTypeOptions(assessor);

    assert.equal(calls(), 2);
  });
});
