// Port of CCQ's irregular_income_payload_service_spec.rb.
import { strict as assert } from "assert";
import { buildIrregularIncomeSection } from "./irregular-income.js";

describe("domain/cfe/irregular-income (port of Cfe::IrregularIncomePayloadService)", () => {
  it("adds no payments when the client answered no to everything", () => {
    assert.deepEqual(
      buildIrregularIncomeSection(
        { student_finance_relevant: false, other_relevant: false },
        new Set(["other_income"]),
      ),
      { payments: [] },
    );
  });

  it("returns undefined when the client is passported and never saw the form", () => {
    assert.equal(
      buildIrregularIncomeSection({ passporting: true }, new Set()),
      undefined,
    );
  });

  it("adds student finance (annual) and other income (quarterly, default) payments", () => {
    assert.deepEqual(
      buildIrregularIncomeSection(
        {
          student_finance_relevant: true,
          other_relevant: true,
          student_finance_conditional_value: 100,
          other_conditional_value: 200,
        },
        new Set(["other_income"]),
      ),
      {
        payments: [
          { income_type: "student_loan", frequency: "annual", amount: 100 },
          { income_type: "unspecified_source", frequency: "quarterly", amount: 200 },
        ],
      },
    );
  });

  it("uses a monthly frequency for other income on a controlled check", () => {
    assert.deepEqual(
      buildIrregularIncomeSection(
        {
          student_finance_relevant: true,
          other_relevant: true,
          student_finance_conditional_value: 100,
          other_conditional_value: 200,
          level_of_help: "controlled",
        },
        new Set(["other_income"]),
      ),
      {
        payments: [
          { income_type: "student_loan", frequency: "annual", amount: 100 },
          { income_type: "unspecified_source", frequency: "monthly", amount: 200 },
        ],
      },
    );
  });
});
