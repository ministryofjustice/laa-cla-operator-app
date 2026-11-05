import { strict as assert } from "assert";
import type { Answers } from "./logic.js";
import { eligibleForChildcareCosts } from "./childcare-eligibility.js";

const TODAY = new Date(Date.UTC(2024, 5, 1));

const employment = { income_type: "employment" };
const statutoryPay = { income_type: "statutory_pay" };

const client = (overrides: Answers = {}): Answers => ({
  level_of_help: "controlled",
  date_of_birth: "1980-01-01",
  immigration_or_asylum: false,
  partner: false,
  passporting: false,
  child_dependants: true,
  employment_status: "in_work",
  incomes: [employment],
  student_finance_relevant: false,
  ...overrides,
});

const withPartner = (overrides: Answers = {}): Answers =>
  client({
    partner: true,
    partner_employment_status: "in_work",
    partner_incomes: [employment],
    partner_student_finance_relevant: false,
    ...overrides,
  });

describe("domain/childcare-eligibility", () => {
  it("is eligible for a working client with child dependants", () => {
    assert.equal(eligibleForChildcareCosts(client(), TODAY), true);
  });

  it("is not eligible without child dependants", () => {
    assert.equal(
      eligibleForChildcareCosts(client({ child_dependants: false }), TODAY),
      false,
    );
    assert.equal(
      eligibleForChildcareCosts(client({ child_dependants: undefined }), TODAY),
      false,
    );
  });

  it("is not eligible when the only income is statutory pay", () => {
    assert.equal(
      eligibleForChildcareCosts(client({ incomes: [statutoryPay] }), TODAY),
      false,
    );
  });

  it("is eligible when statutory pay is alongside other employment income", () => {
    assert.equal(
      eligibleForChildcareCosts(
        client({ incomes: [statutoryPay, employment] }),
        TODAY,
      ),
      true,
    );
  });

  it("is eligible for a client out of work who gets student finance", () => {
    assert.equal(
      eligibleForChildcareCosts(
        client({
          employment_status: "unemployed",
          student_finance_relevant: true,
        }),
        TODAY,
      ),
      true,
    );
  });

  it("ignores incomes saved before the client stopped being in work", () => {
    assert.equal(
      eligibleForChildcareCosts(
        client({ employment_status: "unemployed" }),
        TODAY,
      ),
      false,
    );
  });

  it("ignores child dependants when the dependants step is not relevant", () => {
    assert.equal(
      eligibleForChildcareCosts(client({ passporting: true }), TODAY),
      false,
    );
  });

  it("needs the partner to be eligible too", () => {
    assert.equal(eligibleForChildcareCosts(withPartner(), TODAY), true);
    assert.equal(
      eligibleForChildcareCosts(
        withPartner({ partner_incomes: [statutoryPay] }),
        TODAY,
      ),
      false,
    );
    assert.equal(
      eligibleForChildcareCosts(
        withPartner({ partner_employment_status: "unemployed" }),
        TODAY,
      ),
      false,
    );
  });

  it("counts the partner's student finance", () => {
    assert.equal(
      eligibleForChildcareCosts(
        withPartner({
          partner_employment_status: "unemployed",
          partner_student_finance_relevant: true,
        }),
        TODAY,
      ),
      true,
    );
  });

  it("does not let the partner make an ineligible client eligible", () => {
    assert.equal(
      eligibleForChildcareCosts(
        withPartner({ employment_status: "unemployed" }),
        TODAY,
      ),
      false,
    );
  });
});
