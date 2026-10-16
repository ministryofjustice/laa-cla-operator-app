// Port of CCQ's employment_income_payload_service_spec.rb. CCQ's spec
// asserts on `payload[:employment]`/`payload[:self_employment]` for the
// "not employed"/"incohesive" cases, but those keys are never actually set
// by either implementation (the real keys are `employment_details`/
// `self_employment_details`) — so here we assert directly on the built
// sections being absent, which is the behaviour those assertions intended.
import { strict as assert } from "assert";
import { buildEmploymentIncomeSections } from "./employment-income.js";

describe("domain/cfe/employment-income (port of Cfe::EmploymentIncomePayloadService)", () => {
  it("builds nothing when the client is not employed", () => {
    assert.deepEqual(
      buildEmploymentIncomeSections(
        { employment_status: "unemployed" },
        new Set(["employment_status"]),
      ),
      {},
    );
  });

  it("splits employment and self-employment rows, sign-flipping tax and NI", () => {
    const answers = {
      employment_status: "in_work",
      incomes: [
        {
          income_type: "employment",
          income_frequency: "monthly",
          gross_income: 100,
          income_tax: 20,
          national_insurance: 3,
        },
        {
          income_type: "statutory_pay",
          income_frequency: "year",
          gross_income: 100,
          income_tax: 0,
          national_insurance: 0,
        },
        {
          income_type: "self_employment",
          income_frequency: "three_months",
          gross_income: 500,
          income_tax: 100,
          national_insurance: 0,
        },
      ],
    };

    const sections = buildEmploymentIncomeSections(
      answers,
      new Set(["income"]),
    );

    assert.deepEqual(sections.employment_details, [
      {
        income: {
          frequency: "monthly",
          gross: 100,
          benefits_in_kind: 0,
          tax: -20,
          national_insurance: -3,
          receiving_only_statutory_sick_or_maternity_pay: false,
        },
      },
      {
        income: {
          frequency: "annually",
          gross: 100,
          benefits_in_kind: 0,
          tax: -0,
          national_insurance: -0,
          receiving_only_statutory_sick_or_maternity_pay: true,
        },
      },
    ]);

    assert.deepEqual(sections.self_employment_details, [
      {
        income: {
          frequency: "three_monthly",
          gross: 500,
          tax: -100,
          national_insurance: -0,
        },
      },
    ]);
  });

  it("builds nothing when the income step is not relevant, even with incohesive incomes present", () => {
    assert.deepEqual(
      buildEmploymentIncomeSections(
        {
          employment_status: "unemployed",
          incomes: [
            {
              income_type: "employment",
              income_frequency: "monthly",
              gross_income: 100,
              income_tax: 20,
              national_insurance: 3,
            },
          ],
        },
        new Set(["employment_status"]),
      ),
      {},
    );
  });
});
