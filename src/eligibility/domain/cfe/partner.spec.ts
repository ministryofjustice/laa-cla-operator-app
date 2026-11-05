// Port of CCQ's partner_payload_service_spec.rb. Unlike CCQ (which fakes the
// partner's date of birth from the `partner_over_60` bracket via
// `70.years.ago`/`50.years.ago`), these fixtures supply an explicit
// `partner_date_of_birth` directly, since the TS port reads it as-is.
import { strict as assert } from "assert";
import { buildPartnerSection } from "./partner.js";
import { buildPartnerAdditionalProperties } from "./assets.js";

describe("domain/cfe/partner (port of Cfe::PartnerPayloadService)", () => {
  it("builds a full partner payload: income, outgoings, benefits, property and capitals", () => {
    const answers = {
      partner: true,
      partner_date_of_birth: "1954-06-01",
      partner_employment_status: "unemployed",
      partner_student_finance_relevant: true,
      partner_student_finance_conditional_value: 1000,
      partner_other_relevant: false,
      partner_friends_or_family_relevant: true,
      partner_friends_or_family_conditional_value: 45,
      partner_friends_or_family_frequency: "every_week",
      partner_benefits: [
        {
          benefit_type: "Child Benefit",
          benefit_amount: 100,
          benefit_frequency: "every_two_weeks",
        },
      ],
      partner_additional_property_owned: "outright",
      partner_additional_properties: [
        { house_value: 80_000, percentage_owned: 100 },
      ],
      partner_investments: 500,
      partner_valuables: 0,
      partner_bank_accounts: [{ amount: 1000 }],
    };

    const partnerSection = buildPartnerSection(
      answers,
      new Set([
        "partner_details",
        "partner_other_income",
        "partner_benefit_details",
        "partner_additional_property_details",
        "partner_assets",
      ]),
    );

    assert.deepEqual(partnerSection, {
      partner: { date_of_birth: "1954-06-01", employed: false },
      irregular_incomes: [
        { income_type: "student_loan", frequency: "annual", amount: 1000 },
      ],
      employment_details: [],
      self_employment_details: [],
      regular_transactions: [
        {
          operation: "credit",
          category: "friends_or_family",
          frequency: "weekly",
          amount: 45,
        },
        {
          operation: "credit",
          category: "benefits",
          frequency: "two_weekly",
          amount: 100,
        },
      ],
      additional_properties: [
        {
          value: 80_000,
          outstanding_mortgage: 0,
          percentage_owned: 100,
          shared_with_housing_assoc: false,
        },
      ],
      dependants: [],
      vehicles: [],
      capitals: {
        bank_accounts: [
          {
            value: 1000,
            description: "Liquid Asset",
            subject_matter_of_dispute: false,
          },
        ],
        non_liquid_capital: [
          {
            value: 500,
            description: "Non Liquid Asset",
            subject_matter_of_dispute: false,
          },
        ],
      },
    });
  });

  it("builds an all-empty partner payload when only partner_details is relevant", () => {
    const answers = { partner: true, partner_date_of_birth: "1974-06-01" };

    assert.deepEqual(
      buildPartnerSection(answers, new Set(["partner_details"])),
      {
        partner: { date_of_birth: "1974-06-01", employed: false },
        irregular_incomes: [],
        employment_details: [],
        self_employment_details: [],
        regular_transactions: [],
        additional_properties: [],
        dependants: [],
        vehicles: [],
      },
    );
  });

  it("treats a passported client's partner as not employed, regardless of their employment status", () => {
    const answers = {
      partner: true,
      partner_date_of_birth: "1974-06-01",
      passporting: true,
      partner_employment_status: "in_work",
    };

    const partnerSection = buildPartnerSection(
      answers,
      new Set(["partner_details"]),
    );
    assert.equal(partnerSection?.partner.employed, false);
  });

  it("returns undefined when the client has no partner", () => {
    assert.equal(buildPartnerSection({}, new Set()), undefined);
  });

  it("builds the partner's outgoings", () => {
    const answers = {
      partner: true,
      partner_date_of_birth: "1974-06-01",
      partner_maintenance_payments_relevant: true,
      partner_maintenance_payments_conditional_value: 34,
      partner_maintenance_payments_frequency: "total",
    };

    const partnerSection = buildPartnerSection(
      answers,
      new Set(["partner_details", "partner_outgoings"]),
    );
    assert.deepEqual(partnerSection?.regular_transactions, [
      {
        operation: "debit",
        category: "maintenance_out",
        frequency: "three_monthly",
        amount: 34,
      },
    ]);
  });

  it("builds the partner's additional properties with different ownership statuses, and no dispute key", () => {
    const answers = {
      partner_additional_property_owned: "with_mortgage",
      partner_additional_properties: [
        { house_value: 100_000, mortgage: 40_000, percentage_owned: 100 },
        {
          house_value: 50_000,
          percentage_owned: 100,
          inline_owned_with_mortgage: false,
        },
      ],
    };

    assert.deepEqual(buildPartnerAdditionalProperties(answers), [
      {
        value: 100_000,
        outstanding_mortgage: 40_000,
        percentage_owned: 100,
        shared_with_housing_assoc: false,
      },
      {
        value: 50_000,
        outstanding_mortgage: 0,
        percentage_owned: 100,
        shared_with_housing_assoc: false,
      },
    ]);
  });

  it("builds no employment data when the partner's income is not relevant", () => {
    const answers = { partner: true, partner_date_of_birth: "1974-06-01" };
    const partnerSection = buildPartnerSection(
      answers,
      new Set(["partner_details"]),
    );
    assert.deepEqual(partnerSection?.employment_details, []);
    assert.deepEqual(partnerSection?.self_employment_details, []);
  });

  it("splits the partner's employment and self-employment rows", () => {
    const answers = {
      partner: true,
      partner_date_of_birth: "1974-06-01",
      partner_employment_status: "in_work",
      partner_incomes: [
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

    const partnerSection = buildPartnerSection(
      answers,
      new Set(["partner_details", "partner_income"]),
    );

    assert.equal(partnerSection?.partner.employed, true);
    assert.deepEqual(partnerSection?.employment_details, [
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
    assert.deepEqual(partnerSection?.self_employment_details, [
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
});
