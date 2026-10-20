// The contract between the forms and the domain: every field a step saves is
// an answer key the domain reads (`STEP_ANSWER_KEYS`), and every key the
// domain reads from the step has a field. A field code that drifts from CCQ's
// is dropped by `relevantAnswers`, so CFE would never see it.
import { strict as assert } from "assert";
import type { StepDefinition } from "@ministryofjustice/hmpps-forge/core/authoring";
import { STEP_ANSWER_KEYS } from "../domain/step-answer-keys.js";
import { listFor } from "../lists/index.js";
import { applicantStep } from "./applicant/step.js";
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

const FIELD_STEPS: readonly [StepDefinition, string][] = [
  [applicantStep, "applicant"],
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
];

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
];

describe("journey steps: field codes match the domain's answer keys", () => {
  for (const [definition, code] of FIELD_STEPS) {
    it(`${code} has exactly the fields the domain reads`, () => {
      assert.equal(definition.code, code);
      assert.deepEqual(
        [...new Set(fieldCodes(definition.blocks))].sort(),
        [...STEP_ANSWER_KEYS[code]].sort(),
      );
    });
  }

  for (const [definition, code, listKey] of LIST_STEPS) {
    it(`${code} saves its rows under ${listKey}`, () => {
      assert.equal(definition.code, code);
      assert.deepEqual(STEP_ANSWER_KEYS[code], [listKey]);
      assert.equal(listFor(listKey).key, listKey);
    });

    it(`${code} has a field for every row attribute`, () => {
      const list = listFor(listKey);
      const row = list.describeRow(0, 1) as { codes: Record<string, string> };

      assert.deepEqual(
        Object.keys(row.codes).sort(),
        Object.keys(list.fields).sort(),
      );
    });
  }
});
