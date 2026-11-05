// Port of CCQ's regular_transactions_payload_service_spec.rb. CCQ's "invalid
// frequency" case (which asserts `HousingCostsForm` raises a validation
// error) is not ported: this module trusts that a step is only relevant once
// its form has already been validated, so it has no validation layer of its
// own to exercise.
import { strict as assert } from "assert";
import {
  buildRegularTransactionsSection,
  roundToPence,
} from "./regular-transactions.js";

describe("domain/cfe/regular-transactions (port of Cfe::RegularTransactionsPayloadService)", () => {
  const fullIncomeAndOutgoings = {
    friends_or_family_relevant: true,
    friends_or_family_conditional_value: 45,
    friends_or_family_frequency: "every_week",
    maintenance_relevant: true,
    maintenance_conditional_value: 56,
    maintenance_frequency: "every_two_weeks",
    property_or_lodger_relevant: true,
    property_or_lodger_conditional_value: 67,
    property_or_lodger_frequency: "every_four_weeks",
    pension_relevant: true,
    pension_conditional_value: 78,
    pension_frequency: "monthly",
    childcare_payments_relevant: true,
    childcare_payments_conditional_value: 23,
    childcare_payments_frequency: "every_two_weeks",
    maintenance_payments_relevant: true,
    maintenance_payments_conditional_value: 34,
    maintenance_payments_frequency: "total",
    legal_aid_payments_relevant: true,
    legal_aid_payments_conditional_value: 46,
    legal_aid_payments_frequency: "monthly",
  };

  it("builds income and outgoings payments in category order", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        fullIncomeAndOutgoings,
        new Set(["other_income", "outgoings"]),
      ),
      [
        {
          operation: "credit",
          category: "friends_or_family",
          frequency: "weekly",
          amount: 45,
        },
        {
          operation: "credit",
          category: "maintenance_in",
          frequency: "two_weekly",
          amount: 56,
        },
        {
          operation: "credit",
          category: "property_or_lodger",
          frequency: "four_weekly",
          amount: 67,
        },
        {
          operation: "credit",
          category: "pension",
          frequency: "monthly",
          amount: 78,
        },
        {
          operation: "debit",
          category: "child_care",
          frequency: "two_weekly",
          amount: 23,
        },
        {
          operation: "debit",
          category: "maintenance_out",
          frequency: "three_monthly",
          amount: 34,
        },
        {
          operation: "debit",
          category: "legal_aid",
          frequency: "monthly",
          amount: 46,
        },
      ],
    );
  });

  it("builds the same payments with amounts below a pound", () => {
    const answers = {
      ...fullIncomeAndOutgoings,
      friends_or_family_conditional_value: 0.99,
      maintenance_conditional_value: 0.98,
      property_or_lodger_conditional_value: 0.97,
      pension_conditional_value: 0.96,
      childcare_payments_conditional_value: 0.95,
      maintenance_payments_conditional_value: 0.94,
      legal_aid_payments_conditional_value: 0.93,
    };
    const transactions = buildRegularTransactionsSection(
      answers,
      new Set(["other_income", "outgoings"]),
    );
    assert.deepEqual(
      transactions?.map((transaction) => transaction.amount),
      [0.99, 0.98, 0.97, 0.96, 0.95, 0.94, 0.93],
    );
  });

  it("adds no payments when every question was answered no", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          friends_or_family_relevant: false,
          maintenance_relevant: false,
          property_or_lodger_relevant: false,
          pension_relevant: false,
        },
        new Set(["other_income"]),
      ),
      [],
    );
  });

  it("adds benefit payments", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          benefits: [
            {
              benefit_type: "Child Benefit",
              benefit_amount: 100,
              benefit_frequency: "every_two_weeks",
            },
            {
              benefit_type: "Tax Credit",
              benefit_amount: 50,
              benefit_frequency: "every_week",
            },
          ],
        },
        new Set(["benefit_details"]),
      ),
      [
        {
          operation: "credit",
          category: "benefits",
          frequency: "two_weekly",
          amount: 100,
        },
        {
          operation: "credit",
          category: "benefits",
          frequency: "weekly",
          amount: 50,
        },
      ],
    );
  });

  it("returns undefined when the client is passported and never saw any of these forms", () => {
    assert.equal(
      buildRegularTransactionsSection({ passporting: true }, new Set()),
      undefined,
    );
  });

  it("adds the housing payment and housing benefit from the housing_costs form", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          housing_payments: 120,
          housing_payments_frequency: "monthly",
          housing_benefit_relevant: true,
          housing_benefit_value: 119,
          housing_benefit_frequency: "monthly",
        },
        new Set(["housing_costs"]),
      ),
      [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "monthly",
          amount: 120,
        },
        {
          operation: "credit",
          category: "housing_benefit",
          frequency: "monthly",
          amount: 119,
        },
      ],
    );
  });

  it("adds nothing when housing costs are zero", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        { housing_payments: 0, housing_benefit_relevant: false },
        new Set(["housing_costs"]),
      ),
      [],
    );
  });

  it("adds the housing payment from the mortgage_or_loan_payment form, with no housing benefit", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          housing_loan_payments: 140,
          housing_payments_loan_frequency: "monthly",
        },
        new Set(["mortgage_or_loan_payment"]),
      ),
      [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "monthly",
          amount: 140,
        },
      ],
    );
  });

  it("adds nothing when the mortgage or loan payment is zero", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          housing_loan_payments: 0,
          housing_payments_loan_frequency: "monthly",
        },
        new Set(["mortgage_or_loan_payment"]),
      ),
      [],
    );
  });

  it("never adds a housing benefit payment for the mortgage_or_loan_payment form", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          housing_loan_payments: 140,
          housing_payments_loan_frequency: "monthly",
          housing_benefit_relevant: true,
          housing_benefit_value: 10,
          housing_benefit_frequency: "monthly",
        },
        new Set(["mortgage_or_loan_payment"]),
      ),
      [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "monthly",
          amount: 140,
        },
      ],
    );
  });

  it("combines rent and mortgage from the shared_ownership_housing_costs form", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          rent: 140,
          shared_ownership_mortgage: 140,
          combined_frequency: "monthly",
        },
        new Set(["shared_ownership_housing_costs"]),
      ),
      [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "monthly",
          amount: 280,
        },
      ],
    );
  });

  it("adds housing benefit alongside the combined shared-ownership payment", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          shared_ownership_mortgage: 20,
          rent: 20,
          combined_frequency: "monthly",
          housing_benefit_relevant: true,
          housing_benefit_value: 10,
          housing_benefit_frequency: "monthly",
        },
        new Set(["shared_ownership_housing_costs"]),
      ),
      [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "monthly",
          amount: 40,
        },
        {
          operation: "credit",
          category: "housing_benefit",
          frequency: "monthly",
          amount: 10,
        },
      ],
    );
  });

  it("adds nothing when the combined rent and mortgage is zero", () => {
    assert.deepEqual(
      buildRegularTransactionsSection(
        {
          rent: 0,
          shared_ownership_mortgage: 0,
          combined_frequency: "monthly",
          housing_benefit_relevant: false,
        },
        new Set(["shared_ownership_housing_costs"]),
      ),
      [],
    );
  });

  describe("roundToPence", () => {
    it("rounds a combined rent-and-mortgage figure to the nearest penny", () => {
      assert.equal(roundToPence(1.236), 1.24);
      assert.equal(roundToPence(0), 0);
    });
  });
});
