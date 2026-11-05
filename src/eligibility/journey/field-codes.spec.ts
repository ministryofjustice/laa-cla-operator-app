// The contract between the forms and the domain: every field a step saves is
// an answer key the domain reads (`STEP_ANSWER_KEYS`), and every key the
// domain reads from the step has a field. A field code that drifts from CCQ's
// is dropped by `relevantAnswers`, so CFE would never see it.
import { strict as assert } from "assert";
import type { StepDefinition } from "@ministryofjustice/hmpps-forge/core/authoring";
import { STEP_ANSWER_KEYS } from "../domain/step-answer-keys.js";
import { listFor } from "../lists/index.js";
import { FORM_FIELD_ALIASES } from "../registries/field-aliases.js";
import { applicantStep } from "./applicant/step.js";
import {
  dependantDetailsStep,
  dependantIncomeStep,
  dependantIncomeDetailsStep,
} from "./dependants/index.js";
import { employmentStatusStep } from "./employment-status/step.js";
import { incomeStep } from "./income/step.js";
import { benefitsStep } from "./benefits/step.js";
import { benefitDetailsStep } from "./benefit-details/step.js";
import { otherIncomeStep } from "./other-income/step.js";
import { partnerEmploymentStatusStep } from "./partner-employment-status/step.js";
import { partnerIncomeStep } from "./partner-income/step.js";
import { partnerBenefitsStep } from "./partner-benefits/step.js";
import { partnerBenefitDetailsStep } from "./partner-benefit-details/step.js";
import { partnerOtherIncomeStep } from "./partner-other-income/step.js";
import { partnerDetailsStep } from "./partner-details/step.js";
import { propertyStep } from "./property/step.js";
import { propertyEntryStep } from "./property-entry/step.js";
import { additionalPropertyStep } from "./additional-property/index.js";
import { partnerAdditionalPropertyStep } from "./additional-property/index.js";
import {
  additionalPropertyDetailsStep,
  partnerAdditionalPropertyDetailsStep,
} from "./additional-property-steps.js";
import { outgoingsStep } from "./outgoings/step.js";
import { partnerOutgoingsStep } from "./partner-outgoings/step.js";
import { housingCostsStep } from "./housing-costs/step.js";
import { mortgageOrLoanPaymentStep } from "./mortgage-or-loan-payment/step.js";
import { sharedOwnershipHousingCostsStep } from "./shared-ownership-housing-costs/step.js";
import { assetsStep } from "./assets/step.js";
import { partnerAssetsStep } from "./partner-assets/step.js";
import { vehiclesStep, vehicleDetailsStep } from "./vehicles-steps.js";

const INPUT_VARIANTS = new Set([
  "govukTextInput",
  "govukRadioInput",
  "govukCheckboxInput",
  "govukSelectInput",
  "govukDateInputFull",
]);

/**
 * Collects the static field codes of a step's inputs. Inputs inside an
 * add-another row have a computed code, so are not listed.
 * @param {unknown} node - blocks, or anything nested in them
 * @returns {string[]} the field codes
 */
function fieldCodes(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(fieldCodes);
  if (node === null || typeof node !== "object") return [];
  const block = node as { variant?: string; code?: unknown };
  const own =
    block.variant !== undefined &&
    INPUT_VARIANTS.has(block.variant) &&
    typeof block.code === "string"
      ? [block.code]
      : [];
  return [...own, ...Object.values(node).flatMap(fieldCodes)];
}

/**
 * Collects the row fields an add-another row's inputs read their computed
 * codes from (`Item().path("codes.<field>")`).
 * @param {unknown} node - blocks, or anything nested in them
 * @returns {string[]} the row fields
 */
function rowFieldCodes(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(rowFieldCodes);
  if (node === null || typeof node !== "object") return [];
  const block = node as { variant?: string; code?: unknown };
  const path =
    block.variant !== undefined &&
    INPUT_VARIANTS.has(block.variant) &&
    typeof block.code === "object" &&
    block.code !== null
      ? (block.code as { path?: unknown[] }).path
      : undefined;
  const own =
    Array.isArray(path) && path.at(-2) === "codes" ? [String(path.at(-1))] : [];
  return [...own, ...Object.values(node).flatMap(rowFieldCodes)];
}

const FIELD_STEPS: readonly [StepDefinition, string][] = [
  [applicantStep, "applicant"],
  [dependantDetailsStep, "dependant_details"],
  [dependantIncomeStep, "dependant_income"],
  [partnerDetailsStep, "partner_details"],
  [employmentStatusStep, "employment_status"],
  [benefitsStep, "benefits"],
  [otherIncomeStep, "other_income"],
  [partnerEmploymentStatusStep, "partner_employment_status"],
  [partnerBenefitsStep, "partner_benefits"],
  [partnerOtherIncomeStep, "partner_other_income"],
  [propertyStep, "property"],
  [propertyEntryStep, "property_entry"],
  [additionalPropertyStep, "additional_property"],
  [partnerAdditionalPropertyStep, "partner_additional_property"],
  [outgoingsStep, "outgoings"],
  [partnerOutgoingsStep, "partner_outgoings"],
  [housingCostsStep, "housing_costs"],
  [mortgageOrLoanPaymentStep, "mortgage_or_loan_payment"],
  [sharedOwnershipHousingCostsStep, "shared_ownership_housing_costs"],
  [vehiclesStep, "vehicle"],
];

// Steps with fields of their own and an add-another list, like CCQ's assets
// forms: `bank_accounts` holds the rows, the rest are the step's own fields.
const MIXED_STEPS: readonly [StepDefinition, string, string][] = [
  [assetsStep, "assets", "bank_accounts"],
  [partnerAssetsStep, "partner_assets", "partner_bank_accounts"],
];

// CCQ's outgoings forms declare `<type>_payments_value` but never render or
// read it: the amount is saved as `<type>_payments_conditional_value`.
const UNRENDERED_KEYS = /_payments_value$/u;

const LIST_STEPS: readonly [StepDefinition, string, string][] = [
  [incomeStep, "income", "incomes"],
  [benefitDetailsStep, "benefit_details", "benefits"],
  [partnerIncomeStep, "partner_income", "partner_incomes"],
  [partnerBenefitDetailsStep, "partner_benefit_details", "partner_benefits"],
  [
    additionalPropertyDetailsStep,
    "additional_property_details",
    "additional_properties",
  ],
  [
    partnerAdditionalPropertyDetailsStep,
    "partner_additional_property_details",
    "partner_additional_properties",
  ],
  [dependantIncomeDetailsStep, "dependant_income_details", "dependant_incomes"],
  [vehicleDetailsStep, "vehicles_details", "vehicles"],
];

describe("journey steps: field codes match the domain's answer keys", () => {
  it("aliases only form fields that no step declares under the answer key", () => {
    for (const [fieldCode, answerKey] of Object.entries(FORM_FIELD_ALIASES)) {
      assert.notEqual(fieldCode, answerKey);
      assert.equal(
        Object.values(STEP_ANSWER_KEYS).some((keys) =>
          keys.includes(fieldCode),
        ),
        false,
      );
    }
  });

  for (const [definition, code] of FIELD_STEPS) {
    it(`${code} has exactly the fields the domain reads`, () => {
      assert.equal(definition.code, code);
      assert.deepEqual(
        [
          ...new Set(
            fieldCodes(definition.blocks).map(
              (fieldCode) => FORM_FIELD_ALIASES[fieldCode] ?? fieldCode,
            ),
          ),
        ].sort(),
        STEP_ANSWER_KEYS[code]
          .filter((key) => !UNRENDERED_KEYS.test(key))
          .sort(),
      );
    });
  }

  for (const [definition, code, listKey] of MIXED_STEPS) {
    it(`${code} has exactly the fields the domain reads, plus its ${listKey} rows`, () => {
      assert.equal(definition.code, code);
      assert.ok(STEP_ANSWER_KEYS[code].includes(listKey));
      assert.deepEqual(
        fieldCodes(definition.blocks).sort(),
        STEP_ANSWER_KEYS[code].filter((key) => key !== listKey).sort(),
      );
    });
  }

  for (const [definition, code, listKey] of LIST_STEPS) {
    it(`${code} saves its rows under ${listKey}`, () => {
      assert.equal(definition.code, code);
      assert.deepEqual(STEP_ANSWER_KEYS[code], [listKey]);
      assert.equal(listFor(listKey).key, listKey);
    });
  }

  for (const [definition, code, listKey] of [...LIST_STEPS, ...MIXED_STEPS]) {
    it(`${code} has a field for every row attribute`, () => {
      const list = listFor(listKey);
      const row = list.describeRow(0, 1) as { codes: Record<string, string> };

      assert.deepEqual(
        Object.keys(row.codes).sort(),
        Object.keys(list.fields).sort(),
      );
      assert.deepEqual(
        [...new Set(rowFieldCodes(definition.blocks))].sort(),
        Object.keys(list.fields).sort(),
      );
    });
  }
});
