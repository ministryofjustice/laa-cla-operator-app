// Port of CCQ's Steps::OutgoingsSection (app/lib/steps/outgoings_section.rb).
import type { Answers } from "../logic.js";
import {
  ownsPropertyOutright,
  ownsPropertySharedOwnership,
  ownsPropertyWithMortgageOrLoan,
  partner,
  skipCapitalQuestions,
  skipIncomeQuestions,
} from "../logic.js";
import type { Group, Section } from "./shared.js";
import { compactGroups } from "./shared.js";

/** Every step code this section can ever produce. */
export const ALL_STEPS: readonly string[] = [
  "outgoings",
  "partner_outgoings",
  "property",
  "property_landlord",
  "shared_ownership_housing_costs",
  "mortgage_or_loan_payment",
  "housing_costs",
];

/**
 * The property step, plus a landlord question for shared-ownership clients.
 * Public in CCQ, since it is also used directly from `PropertySection`'s
 * callers for display logic.
 * @param {Answers} answers - the saved answers
 * @returns {Group} the property group
 */
export function propertyGroup(answers: Answers): Group {
  return ownsPropertySharedOwnership(answers)
    ? ["property", "property_landlord"]
    : ["property"];
}

/**
 * Which housing-costs step applies, if any: shared ownership, mortgage or
 * loan, or standard housing costs for anyone who does not own outright.
 * @param {Answers} answers - the saved answers
 * @returns {Group | undefined} the housing-costs group, if relevant
 */
export function housingCostsGroup(answers: Answers): Group | undefined {
  if (answers.property_owned === "shared_ownership") {
    return ["shared_ownership_housing_costs"];
  }
  if (ownsPropertyWithMortgageOrLoan(answers)) {
    return ["mortgage_or_loan_payment"];
  }
  if (!ownsPropertyOutright(answers)) return ["housing_costs"];
  return undefined;
}

/**
 * The step groups this section contributes. Capital questions (property)
 * still apply even when income questions are skipped, unless both are
 * skipped; housing costs are only asked alongside income questions.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups, in order
 */
function groupedStepsFor(answers: Answers): Group[] {
  if (skipIncomeQuestions(answers)) {
    if (skipCapitalQuestions(answers)) return [];
    return compactGroups([propertyGroup(answers)]);
  }
  return compactGroups([
    ["outgoings"],
    partner(answers) ? ["partner_outgoings"] : undefined,
    propertyGroup(answers),
    housingCostsGroup(answers),
  ]);
}

/** Port of CCQ's `Steps::OutgoingsSection`. */
export const outgoingsSection: Section = {
  allSteps: ALL_STEPS,
  groupedStepsFor,
};
