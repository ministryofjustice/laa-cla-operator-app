import { strict as assert } from "assert";
import { summaryRows } from "./summary.js";
import { levelOfHelpStep } from "../level-of-help/step.js";
import { applicantStep } from "../applicant/step.js";
import { assetsStep } from "../assets/step.js";
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

const steps = [
  levelOfHelpStep,
  applicantStep,
  assetsStep,
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
      dependant_income_details: "1000",
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
        dependant_income_details: "1234.56",
      },
    );

    assert.deepEqual(
      rows.map((row) => row.value?.text),
      ["0", "1234.56"],
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
      investments_in_dispute: ["true"],
      childcare_payments_frequency: "four_weekly",
    });

    assert.deepEqual(
      rows.map((row) => row.value?.text),
      ["This asset is a subject matter of dispute", "Every 4 weeks"],
    );
  });

  it("keeps user-entered markup as text for the summary component to escape", () => {
    const rows = summaryRows(steps, ["dependant_income_details"], {
      dependant_income_details: "<script>alert('test')</script>",
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

  it("fails explicitly if a relevant step has no registered definition", () => {
    assert.throws(
      () => summaryRows(steps, ["missing"], {}),
      /Missing eligibility step: missing/u,
    );
  });
});
