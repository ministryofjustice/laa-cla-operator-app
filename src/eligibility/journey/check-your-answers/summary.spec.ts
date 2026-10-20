import { strict as assert } from "assert";
import { summaryRows } from "./summary.js";
import { levelOfHelpStep } from "../level-of-help/step.js";
import { applicantStep } from "../applicant/step.js";
import { assetsStep } from "../assets/step.js";
import { partnerAssetsStep } from "../partner-assets/step.js";
import { vehiclesStep, vehicleDetailsStep } from "../vehicles-steps.js";
import { propertyEntryStep } from "../property-entry/step.js";
import { propertyStep } from "../property/step.js";
import {
  additionalPropertyStep,
  partnerAdditionalPropertyStep,
} from "../additional-property/index.js";
import {
  additionalPropertyDetailsStep,
  partnerAdditionalPropertyDetailsStep,
} from "../additional-property-steps.js";
import { outgoingsStep } from "../outgoings/step.js";
import { dependantIncomeDetailsStep } from "../dependants/index.js";
import { incomeStep } from "../income/step.js";
import { benefitDetailsStep } from "../benefit-details/step.js";
import { otherIncomeStep } from "../other-income/step.js";
import { partnerDetailsStep } from "../partner-details/step.js";
import { partnerOutgoingsStep } from "../partner-outgoings/step.js";
import { housingCostsStep } from "../housing-costs/step.js";
import { mortgageOrLoanPaymentStep } from "../mortgage-or-loan-payment/step.js";
import { sharedOwnershipHousingCostsStep } from "../shared-ownership-housing-costs/step.js";

const steps = [
  levelOfHelpStep,
  applicantStep,
  assetsStep,
  partnerAssetsStep,
  vehiclesStep,
  vehicleDetailsStep,
  propertyEntryStep,
  propertyStep,
  additionalPropertyStep,
  additionalPropertyDetailsStep,
  partnerAdditionalPropertyStep,
  partnerAdditionalPropertyDetailsStep,
  outgoingsStep,
  dependantIncomeDetailsStep,
  incomeStep,
  benefitDetailsStep,
  otherIncomeStep,
  partnerOutgoingsStep,
  housingCostsStep,
  mortgageOrLoanPaymentStep,
  sharedOwnershipHousingCostsStep,
];

describe("check your answers summary", () => {
  it("uses actual form questions and choice labels, not the CFE answer-key mapping", () => {
    const rows = summaryRows(steps, ["level_of_help", "applicant"], {
      level_of_help: "controlled",
      partner: false,
      passporting: true,
      date_of_birth: "1990-01-01",
    });

    assert.deepEqual(rows, [
      {
        key: { text: "What type of legal aid is needed?" },
        value: { text: "Controlled work (advice only)" },
        actions: {
          items: [
            {
              href: "level-of-help#level_of_help",
              text: "Change",
              visuallyHiddenText: "What type of legal aid is needed?",
            },
          ],
        },
      },
      {
        key: { text: "Does your client have a partner?" },
        value: { text: "No" },
        actions: {
          items: [
            {
              href: "applicant#partner",
              text: "Change",
              visuallyHiddenText: "Does your client have a partner?",
            },
          ],
        },
      },
      {
        key: { text: "Does your client receive a passporting benefit?" },
        value: { text: "Yes" },
        actions: {
          items: [
            {
              href: "applicant#passporting",
              text: "Change",
              visuallyHiddenText:
                "Does your client receive a passporting benefit?",
            },
          ],
        },
      },
    ]);
  });

  it("summarises a partner's date of birth using its field code", () => {
    const rows = summaryRows(
      [...steps, partnerDetailsStep],
      ["partner_details"],
      { partner_date_of_birth: "1980-01-01" },
    );

    assert.deepEqual(rows, [
      {
        key: { text: "What is the partner's date of birth?" },
        value: { text: "1980-01-01" },
        actions: {
          items: [
            {
              href: "partner-details#partner_date_of_birth",
              text: "Change",
              visuallyHiddenText: "What is the partner's date of birth?",
            },
          ],
        },
      },
    ]);
  });

  it("omits unanswered optional fields and answers on obsolete branches", () => {
    const rows = summaryRows(steps, ["assets"], {
      dependant_incomes: [{ amount: 1000, frequency: "monthly" }],
      investments_relevant: false,
      investments: "",
      investments_in_dispute: [],
      valuables_relevant: null,
      valuables: undefined,
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [["Does your client have any investments?", "No"]],
    );
  });

  it("preserves zero and free-text answers", () => {
    const rows = summaryRows(
      steps,
      ["property_entry", "dependant_income_details"],
      {
        house_value: 0,
        dependant_incomes: [{ amount: 1234.56, frequency: "monthly" }],
      },
    );

    assert.deepEqual(
      rows.map((row) => row.value?.text),
      ["0", "£1,234.56", "Every month"],
    );
  });

  it("summarises additional-property rows with editable field links", () => {
    const rows = summaryRows(steps, ["additional_property_details"], {
      additional_properties: [
        {
          house_value: 80000,
          mortgage: 20000,
          percentage_owned: "50",
          house_in_dispute: true,
        },
      ],
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [
        ["Other property 1: Estimated value", "£80,000.00"],
        ["Other property 1: Mortgage amount", "£20,000.00"],
        ["Other property 1: Percentage owned", "50"],
        ["Other property 1: Subject matter of dispute", "Yes"],
      ],
    );
  });

  it("formats checkbox selections and payment frequencies using option labels", () => {
    const rows = summaryRows(steps, ["assets", "outgoings"], {
      investments_in_dispute: true,
      childcare_payments_frequency: "every_four_weeks",
    });

    assert.deepEqual(
      rows.map((row) => row.value?.text),
      ["This asset is a subject matter of dispute", "Every 4 weeks"],
    );
  });

  it("summarises the client's assets: bank accounts, then each asset question", () => {
    const rows = summaryRows(steps, ["assets"], {
      bank_accounts: [
        { amount: 125.5, account_in_dispute: true },
        { amount: 0 },
      ],
      investments_relevant: true,
      investments: 1000,
      investments_in_dispute: true,
      valuables_relevant: true,
      valuables: 750,
      valuables_in_dispute: false,
    });

    assert.deepEqual(
      rows.map((row) => [
        row.key.text,
        row.value?.text,
        (row.actions as { items: { href: string }[] }).items[0].href,
      ]),
      [
        ["Bank account 1: Amount", "£125.50", "assets#bank_accounts_0_amount"],
        [
          "Bank account 1: Subject matter of dispute",
          "Yes",
          "assets#bank_accounts_0_account_in_dispute",
        ],
        ["Bank account 2: Amount", "£0.00", "assets#bank_accounts_1_amount"],
        [
          "Does your client have any investments?",
          "Yes",
          "assets#investments_relevant",
        ],
        ["Total of all investments", "1000", "assets#investments"],
        [
          "Investments: subject matter of dispute",
          "This asset is a subject matter of dispute",
          "assets#investments_in_dispute",
        ],
        [
          "Does your client have valuable items worth £500 or more?",
          "Yes",
          "assets#valuables_relevant",
        ],
        ["Total of all valuable items", "750", "assets#valuables"],
      ],
    );
  });

  it("summarises the partner's assets with partner field codes", () => {
    const rows = summaryRows(steps, ["partner_assets"], {
      partner_bank_accounts: [{ amount: 300 }],
      partner_investments_relevant: false,
      partner_valuables_relevant: true,
      partner_valuables: 600,
    });

    assert.deepEqual(
      rows.map((row) => [
        row.key.text,
        row.value?.text,
        (row.actions as { items: { href: string }[] }).items[0].href,
      ]),
      [
        [
          "Partner's bank account 1: Amount",
          "£300.00",
          "partner-assets#partner_bank_accounts_0_amount",
        ],
        [
          "Does the partner have any investments?",
          "No",
          "partner-assets#partner_investments_relevant",
        ],
        [
          "Does the partner have valuable items worth £500 or more?",
          "Yes",
          "partner-assets#partner_valuables_relevant",
        ],
        [
          "Total of all valuable items",
          "600",
          "partner-assets#partner_valuables",
        ],
      ],
    );
  });

  for (const partner of [false, true]) {
    it(`words the vehicle question ${partner ? "with" : "without"} a partner`, () => {
      const rows = summaryRows(steps, ["vehicle"], {
        partner,
        vehicle_owned: true,
      });

      assert.deepEqual(
        rows.map((row) => [row.key.text, row.value?.text]),
        [
          [
            partner
              ? "Does your client or their partner own a vehicle?"
              : "Does your client own a vehicle?",
            "Yes",
          ],
        ],
      );
    });
  }

  it("summarises each vehicle's details", () => {
    const rows = summaryRows(steps, ["vehicles_details"], {
      vehicles: [
        {
          vehicle_value: 5000,
          vehicle_pcp: true,
          vehicle_finance: 1200,
          vehicle_over_3_years_ago: false,
          vehicle_in_regular_use: true,
          vehicle_in_dispute: true,
        },
      ],
    });

    assert.deepEqual(
      rows.map((row) => [
        row.key.text,
        row.value?.text,
        (row.actions as { items: { href: string }[] }).items[0].href,
      ]),
      [
        [
          "Vehicle 1: Estimated value",
          "£5,000.00",
          "vehicles-details#vehicles_0_vehicle_value",
        ],
        [
          "Vehicle 1: Payments left",
          "Yes",
          "vehicles-details#vehicles_0_vehicle_pcp",
        ],
        [
          "Vehicle 1: Value of payments left",
          "£1,200.00",
          "vehicles-details#vehicles_0_vehicle_finance",
        ],
        [
          "Vehicle 1: Bought over 3 years ago",
          "No",
          "vehicles-details#vehicles_0_vehicle_over_3_years_ago",
        ],
        [
          "Vehicle 1: In regular use",
          "Yes",
          "vehicles-details#vehicles_0_vehicle_in_regular_use",
        ],
        [
          "Vehicle 1: Subject matter of dispute",
          "Yes",
          "vehicles-details#vehicles_0_vehicle_in_dispute",
        ],
      ],
    );
  });

  it("keeps user-entered markup as text for the summary component to escape", () => {
    const rows = summaryRows(steps, ["dependant_income_details"], {
      dependant_incomes: [{ frequency: "<script>alert('test')</script>" }],
    });
    assert.deepEqual(rows[0].value, {
      text: "<script>alert('test')</script>",
    });
  });

  it("summarises add-another rows, one line per answered field", () => {
    const rows = summaryRows(steps, ["income", "benefit_details"], {
      incomes: [
        {
          income_type: "self_employment",
          income_frequency: "year",
          gross_income: 24000,
          income_tax: 0,
          national_insurance: 0,
        },
      ],
      benefits: [
        {
          benefit_type: "Child Benefit",
          benefit_amount: 25.6,
          benefit_frequency: "every_four_weeks",
        },
      ],
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [
        ["Employment income 1: Type", "Self-employment income"],
        ["Employment income 1: Frequency", "Total in the last year"],
        ["Employment income 1: Income before deductions", "£24,000.00"],
        ["Employment income 1: Income tax", "£0.00"],
        ["Employment income 1: National Insurance", "£0.00"],
        ["Benefit 1: Name", "Child Benefit"],
        ["Benefit 1: Amount", "£25.60"],
        ["Benefit 1: Frequency", "Every 4 weeks"],
      ],
    );
    assert.deepEqual(
      (rows[0].actions as { items: { href: string }[] }).items.map(
        (item) => item.href,
      ),
      ["income#incomes_0_income_type"],
    );
  });

  it("labels other income amounts and frequencies by the income they are for", () => {
    const rows = summaryRows(steps, ["other_income"], {
      pension_relevant: true,
      pension_conditional_value: 120,
      pension_frequency: "every_two_weeks",
      other_relevant: false,
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [
        ["Does your client get income from pensions?", "Yes"],
        ["Income from pensions: amount", "120"],
        ["Income from pensions: frequency", "Every 2 weeks"],
        ["Does your client get income from other sources?", "No"],
      ],
    );
  });

  it("labels outgoings amounts and frequencies by the outgoing they are for", () => {
    const rows = summaryRows(steps, ["outgoings", "partner_outgoings"], {
      childcare_payments_relevant: true,
      childcare_payments_conditional_value: 300,
      childcare_payments_frequency: "monthly",
      maintenance_payments_relevant: false,
      legal_aid_payments_relevant: false,
      partner_maintenance_payments_relevant: true,
      partner_maintenance_payments_conditional_value: 50,
      partner_maintenance_payments_frequency: "every_week",
      partner_legal_aid_payments_relevant: false,
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [
        ["Does your client pay for childcare?", "Yes"],
        ["Childcare payments: amount", "300"],
        ["Childcare payments: frequency", "Every month"],
        ["Does your client pay maintenance to a former partner?", "No"],
        [
          "Does your client make payments towards legal aid for a criminal case?",
          "No",
        ],
        ["Does the partner pay maintenance to a former partner?", "Yes"],
        ["Maintenance payments to a former partner: amount", "50"],
        ["Maintenance payments to a former partner: frequency", "Every week"],
        [
          "Does the partner make payments towards legal aid for a criminal case?",
          "No",
        ],
      ],
    );
    assert.equal(
      (rows[1].actions as { items: { href: string }[] }).items[0].href,
      "outgoings#childcare_payments_conditional_value",
    );
  });

  it("summarises the housing costs step", () => {
    const rows = summaryRows(steps, ["housing_costs"], {
      housing_payments: 1200,
      housing_payments_frequency: "total",
      housing_benefit_relevant: true,
      housing_benefit_value: 100,
      housing_benefit_frequency: "every_two_weeks",
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [
        ["Housing payments", "1200"],
        ["Housing payments: frequency", "Total in last 3 months"],
        ["Is Housing Benefit claimed for the home?", "Yes"],
        ["Housing Benefit: amount", "100"],
        ["Housing Benefit: frequency", "Every 2 weeks"],
      ],
    );
  });

  it("summarises the mortgage or loan payment step", () => {
    const rows = summaryRows(steps, ["mortgage_or_loan_payment"], {
      housing_loan_payments: 0,
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [["Mortgage or loan payments", "0"]],
    );
  });

  it("summarises the shared ownership housing costs step", () => {
    const rows = summaryRows(steps, ["shared_ownership_housing_costs"], {
      combined_frequency: "monthly",
      rent: 400,
      shared_ownership_mortgage: 350.5,
      shared_ownership_housing_benefit_relevant: "false",
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [
        ["Mortgage and rent payments: frequency", "Every month"],
        ["Rent", "400"],
        ["Mortgage payment", "350.5"],
        ["Is Housing Benefit claimed for the home?", "No"],
      ],
    );
  });

  it("fails explicitly if a relevant step has no registered definition", () => {
    assert.throws(
      () => summaryRows(steps, ["missing"], {}),
      /Missing eligibility step: missing/u,
    );
  });
});
