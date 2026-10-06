// Port of CCQ's Steps::Helper (app/lib/steps/helper.rb): turns each
// section's grouped steps into the flat, ordered step list, and answers
// questions about where a given step sits in it.
import type { Answers } from "./logic.js";
import { skipIncomeQuestions } from "./logic.js";
import type { Group } from "./sections/shared.js";
import { nonFinancialSection } from "./sections/non-financial-section.js";
import { incomeSection } from "./sections/income-section.js";
import { partnerSection } from "./sections/partner-section.js";
import { outgoingsSection } from "./sections/outgoings-section.js";
import { propertySection } from "./sections/property-section.js";
import { assetsAndVehiclesSection } from "./sections/assets-and-vehicles-section.js";

const INDEX_NOT_FOUND = -1;
const FIRST_INDEX = 0;
const ADJACENT_INDEX_OFFSET = 1;

const ALL_SECTIONS = [
  nonFinancialSection,
  incomeSection,
  partnerSection,
  outgoingsSection,
  propertySection,
  assetsAndVehiclesSection,
];

/**
 * Every step code any section can ever produce, deduplicated. Only used in
 * tests, matching CCQ's own comment on `all_possible_steps`.
 * @returns {string[]} every step code across all sections
 */
export function allPossibleSteps(): string[] {
  const steps = ALL_SECTIONS.flatMap((section) => section.allSteps);
  return [...new Set(steps)];
}

/**
 * Every section's step groups, in the fixed section order CCQ uses.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups, in order
 */
function stepGroupsFor(answers: Answers): Group[] {
  return ALL_SECTIONS.flatMap((section) => section.groupedStepsFor(answers));
}

/**
 * The flat, ordered list of step codes that apply to this set of answers.
 * @param {Answers} answers - the saved answers
 * @returns {string[]} the relevant step codes, in order
 */
export function stepsFor(answers: Answers): string[] {
  return stepGroupsFor(answers).flatMap((stepGroup) => stepGroup);
}

/**
 * Filters a set of saved answers down to only the ones for steps that are
 * still relevant, dropping answers left over from a branch the client is no
 * longer on (e.g. after changing an earlier answer). Not a direct CCQ port:
 * CCQ never needs this because it recomputes answered state from session
 * data shaped like its own steps, but this module needs an explicit filter
 * before sending answers on to CFE.
 * @param {Answers} answers - the saved answers
 * @returns {Answers} only the answers for currently relevant steps
 */
export function relevantAnswers(answers: Answers): Answers {
  const relevant = new Set(stepsFor(answers));
  return Object.fromEntries(
    Object.entries(answers).filter(([code]) => relevant.has(code)),
  );
}

/**
 * The step codes strictly after the given one, in order. Returns an empty
 * list if the step is not relevant or is the last relevant step.
 * @param {readonly string[]} steps - the relevant step codes, in order
 * @param {string} step - the current step code
 * @returns {string[]} the remaining step codes, in order
 */
function stepsAfter(steps: readonly string[], step: string): string[] {
  const index = steps.indexOf(step);
  if (index === INDEX_NOT_FOUND) return [];
  return steps.slice(index + ADJACENT_INDEX_OFFSET);
}

/**
 * The step codes strictly before the given one, in order.
 * @param {readonly string[]} steps - the relevant step codes, in order
 * @param {string} step - the current step code
 * @returns {string[]} the preceding step codes, in order
 */
function stepsBefore(steps: readonly string[], step: string): string[] {
  const index = steps.indexOf(step);
  return index === INDEX_NOT_FOUND
    ? [...steps]
    : steps.slice(FIRST_INDEX, index);
}

/**
 * The step code immediately before the given one, if any.
 * @param {readonly string[]} steps - the relevant step codes, in order
 * @param {string} step - the current step code
 * @returns {string | undefined} the preceding step code, if any
 */
function stepBefore(
  steps: readonly string[],
  step: string,
): string | undefined {
  const index = steps.indexOf(step);
  if (index <= FIRST_INDEX) return undefined;
  return steps[index - ADJACENT_INDEX_OFFSET];
}

/**
 * All steps still to come after the given one, in order.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the current step code
 * @returns {string[]} the remaining step codes, in order
 */
export function remainingSteps(answers: Answers, step: string): string[] {
  return stepsAfter(stepsFor(answers), step);
}

/**
 * The step after the given one, or undefined if it is the last relevant
 * step.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the current step code
 * @returns {string | undefined} the next step code, if any
 */
export function nextStep(answers: Answers, step: string): string | undefined {
  return remainingSteps(answers, step)[FIRST_INDEX];
}

/**
 * The step before the given one, or undefined if it is the first relevant
 * step.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the current step code
 * @returns {string | undefined} the previous step code, if any
 */
export function previousStep(
  answers: Answers,
  step: string,
): string | undefined {
  return stepBefore(stepsFor(answers), step);
}

/**
 * This step and every step before it, in order.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the current step code
 * @returns {string[]} the completed step codes, in order, including this one
 */
export function completedStepsFor(answers: Answers, step: string): string[] {
  return [...stepsBefore(stepsFor(answers), step), step];
}

/**
 * Whether the given step is the last one in its change-answers group.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code to check
 * @returns {boolean} whether this is the last step in its group
 */
export function lastStepInGroup(answers: Answers, step: string): boolean {
  const stepGroup = stepGroupsFor(answers).find((candidate) =>
    candidate.includes(step),
  );
  if (stepGroup === undefined) return false;
  return stepGroup[stepGroup.length - ADJACENT_INDEX_OFFSET] === step;
}

/**
 * Whether the given step code is relevant to this set of answers.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code to check
 * @returns {boolean} whether the step is relevant
 */
export function validStep(answers: Answers, step: string): boolean {
  return stepsFor(answers).includes(step);
}

/**
 * The first relevant step.
 * @param {Answers} answers - the saved answers
 * @returns {string | undefined} the first step code, if any
 */
export function firstStep(answers: Answers): string | undefined {
  return stepsFor(answers)[FIRST_INDEX];
}

/**
 * The last relevant step.
 * @param {Answers} answers - the saved answers
 * @returns {string | undefined} the last step code, if any
 */
export function lastStep(answers: Answers): string | undefined {
  const steps = stepsFor(answers);
  return steps[steps.length - ADJACENT_INDEX_OFFSET];
}

/**
 * Whether the client answered that they do not own their main property
 * outright or with a mortgage (an unsupported route in CCQ).
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code just answered
 * @returns {boolean} whether this blocks use of the service
 */
function cannotUseServiceMainProperty(answers: Answers, step: string): boolean {
  return step === "property_landlord" && answers.property_landlord === false;
}

/**
 * Whether the client's additional property is shared ownership (an
 * unsupported route in CCQ).
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code just answered
 * @returns {boolean} whether this blocks use of the service
 */
function additionalPropertySharedOwnership(
  answers: Answers,
  step: string,
): boolean {
  return (
    step === "additional_property" &&
    answers.additional_property_owned === "shared_ownership"
  );
}

/**
 * Whether the client's partner's additional property is shared ownership
 * (an unsupported route in CCQ).
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code just answered
 * @returns {boolean} whether this blocks use of the service
 */
function partnerAdditionalPropertySharedOwnership(
  answers: Answers,
  step: string,
): boolean {
  return (
    step === "partner_additional_property" &&
    answers.partner_additional_property_owned === "shared_ownership"
  );
}

/**
 * Whether either the client's or their partner's additional property is
 * shared ownership (an unsupported route in CCQ).
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code just answered
 * @returns {boolean} whether this blocks use of the service
 */
function cannotUseServiceAdditionalProperty(
  answers: Answers,
  step: string,
): boolean {
  return (
    additionalPropertySharedOwnership(answers, step) ||
    partnerAdditionalPropertySharedOwnership(answers, step)
  );
}

/**
 * Whether the client cannot use this service at all, having just answered a
 * step that puts them on an unsupported route.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code just answered
 * @returns {boolean} whether the client cannot use this service
 */
export function cannotUseService(answers: Answers, step: string): boolean {
  return (
    cannotUseServiceMainProperty(answers, step) ||
    cannotUseServiceAdditionalProperty(answers, step)
  );
}

/**
 * Whether this is the housing-costs step shown to a passported
 * shared-ownership client under the property-entry heading.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code to check
 * @returns {boolean} whether this matches that case
 */
function passportedSharedOwnership(answers: Answers, step: string): boolean {
  return step === "property_landlord" && skipIncomeQuestions(answers);
}

/**
 * Whether this is the shared-ownership housing-costs step itself.
 * @param {string} step - the step code to check
 * @returns {boolean} whether this matches that case
 */
function nonPassportedSharedOwnership(step: string): boolean {
  return step === "shared_ownership_housing_costs";
}

/**
 * Whether to display the property-entry heading when reviewing answers for
 * this step.
 * @param {Answers} answers - the saved answers
 * @param {string} step - the step code to check
 * @returns {boolean} whether to display the property-entry heading
 */
export function displayPropertyEntryInChangeAnswers(
  answers: Answers,
  step: string,
): boolean {
  return (
    passportedSharedOwnership(answers, step) ||
    nonPassportedSharedOwnership(step)
  );
}
