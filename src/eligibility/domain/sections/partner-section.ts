// Port of CCQ's Steps::PartnerSection (app/lib/steps/partner_section.rb).
import type { Answers } from "../logic.js";
import {
  partner,
  partnerBenefits,
  partnerEmployed,
  passported,
} from "../logic.js";
import type { Group, Section } from "./shared.js";
import { compactGroups } from "./shared.js";

/** Every step code this section can ever produce. */
export const ALL_STEPS: readonly string[] = [
  "partner_details",
  "partner_employment_status",
  "partner_income",
  "partner_benefits",
  "partner_benefit_details",
  "partner_other_income",
];

/**
 * The partner-income step, asked only once the partner has been said to be
 * employed.
 * @param {Answers} answers - the saved answers
 * @returns {Group | undefined} the partner-employment group, if relevant
 */
function employmentSteps(answers: Answers): Group | undefined {
  return partnerEmployed(answers) ? ["partner_income"] : undefined;
}

/**
 * The partner-benefits steps: just whether the partner receives them, plus
 * the detail step if they do.
 * @param {Answers} answers - the saved answers
 * @returns {Group} the partner-benefits group
 */
function benefitSteps(answers: Answers): Group {
  return partnerBenefits(answers)
    ? ["partner_benefits", "partner_benefit_details"]
    : ["partner_benefits"];
}

/**
 * The step groups this section contributes: nothing without a partner, just
 * the partner's own details if passported, otherwise the full set of
 * partner financial questions.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups, in order
 */
function groupedStepsFor(answers: Answers): Group[] {
  if (!partner(answers)) return [];
  if (passported(answers)) return [["partner_details"]];
  return compactGroups([
    ["partner_details"],
    ["partner_employment_status"],
    employmentSteps(answers),
    benefitSteps(answers),
    ["partner_other_income"],
  ]);
}

/** Port of CCQ's `Steps::PartnerSection`. */
export const partnerSection: Section = { allSteps: ALL_STEPS, groupedStepsFor };
