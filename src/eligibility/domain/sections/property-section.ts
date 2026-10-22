// Port of CCQ's Steps::PropertySection (app/lib/steps/property_section.rb).
import type { Answers } from "../logic.js";
import {
  ownsAdditionalProperty,
  ownsProperty,
  partner,
  partnerOwnsAdditionalProperty,
  skipCapitalQuestions,
} from "../logic.js";
import type { Group, Section } from "./shared.js";
import { compactGroups } from "./shared.js";

/** Steps for the client's own main property. */
export const PROPERTY_STEPS: readonly string[] = [
  "property",
  "property_landlord",
  "property_entry",
];
/** Steps for a client's additional property. */
export const ADDITIONAL_PROPERTY_STEPS: readonly string[] = [
  "additional_property",
  "additional_property_details",
];
/** Steps for a partner's additional property. */
export const ADDITIONAL_PARTNER_PROPERTY_STEPS: readonly string[] = [
  "partner_additional_property",
  "partner_additional_property_details",
];
/** Housing-costs steps, also produced by `OutgoingsSection`; listed here too for parity with CCQ. */
export const HOUSING_COSTS_STEPS: readonly string[] = [
  "housing_costs",
  "shared_ownership_housing_costs",
  "mortgage_or_loan_payment",
];

/** Every step code this section can ever produce. */
export const ALL_STEPS: readonly string[] = [
  ...PROPERTY_STEPS,
  ...ADDITIONAL_PROPERTY_STEPS,
  ...ADDITIONAL_PARTNER_PROPERTY_STEPS,
  ...HOUSING_COSTS_STEPS,
];

/**
 * Whether additional-property details are asked for, on top of the initial
 * yes/no question.
 * @param {Answers} answers - the saved answers
 * @returns {Group} the additional-property group
 */
function additionalPropertySteps(answers: Answers): Group {
  return ownsAdditionalProperty(answers)
    ? ADDITIONAL_PROPERTY_STEPS
    : ["additional_property"];
}

/**
 * The partner's additional-property group, skipped entirely without a
 * partner.
 * @param {Answers} answers - the saved answers
 * @returns {Group | undefined} the partner additional-property group, if relevant
 */
function partnerAdditionalPropertyGroup(answers: Answers): Group | undefined {
  if (!partner(answers)) return undefined;
  return partnerOwnsAdditionalProperty(answers)
    ? ADDITIONAL_PARTNER_PROPERTY_STEPS
    : ["partner_additional_property"];
}

/**
 * The step groups this section contributes, skipped entirely when capital
 * questions are not relevant.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups, in order
 */
function groupedStepsFor(answers: Answers): Group[] {
  if (skipCapitalQuestions(answers)) return [];
  return compactGroups([
    ownsProperty(answers) ? ["property_entry"] : undefined,
    additionalPropertySteps(answers),
    partnerAdditionalPropertyGroup(answers),
  ]);
}

/** Port of CCQ's `Steps::PropertySection`. */
export const propertySection: Section = {
  allSteps: ALL_STEPS,
  groupedStepsFor,
};
