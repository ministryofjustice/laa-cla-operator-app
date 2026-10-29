// Port of CCQ's Steps::IncomeSection (app/lib/steps/income_section.rb).
import type { Answers } from "../logic.js";
import { benefits, employed, skipIncomeQuestions } from "../logic.js";
import type { Group, Section } from "./shared.js";
import { compactGroups } from "./shared.js";

/** Every step code this section can ever produce. */
export const ALL_STEPS: readonly string[] = [
  "employment_status",
  "income",
  "benefits",
  "benefit_details",
  "other_income",
];

/**
 * The income-amount step, asked only once the client has said they are
 * employed.
 * @param {Answers} answers - the saved answers
 * @returns {Group | undefined} the employment group, if relevant
 */
function employmentSteps(answers: Answers): Group | undefined {
  return employed(answers) ? ["income"] : undefined;
}

/**
 * The benefits steps: just whether the client receives them, plus the detail
 * step if they do.
 * @param {Answers} answers - the saved answers
 * @returns {Group} the benefits group
 */
function benefitSteps(answers: Answers): Group {
  return benefits(answers) ? ["benefits", "benefit_details"] : ["benefits"];
}

/**
 * The step groups this section contributes, skipped entirely when income
 * questions are not relevant.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups, in order
 */
function groupedStepsFor(answers: Answers): Group[] {
  if (skipIncomeQuestions(answers)) return [];
  return compactGroups([
    ["employment_status"],
    employmentSteps(answers),
    benefitSteps(answers),
    ["other_income"],
  ]);
}

/** Port of CCQ's `Steps::IncomeSection`. */
export const incomeSection: Section = { allSteps: ALL_STEPS, groupedStepsFor };
