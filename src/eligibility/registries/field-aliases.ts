// Forge clears the answer to every field code declared on a step the journey
// cannot reach, even when the step being answered declares the same code. CCQ's
// housing costs and shared ownership housing costs steps both save the
// Housing Benefit answers, and only one is ever reachable, so the shared
// ownership step's fields use their own codes in the form. They are saved
// under CCQ's keys, which is all the domain and the CFE payload see.
import type { Answers } from "../domain/logic.js";

export const SHARED_OWNERSHIP_FIELD_PREFIX = "shared_ownership_";

const SHARED_HOUSING_BENEFIT_KEYS = [
  "housing_benefit_relevant",
  "housing_benefit_value",
  "housing_benefit_frequency",
] as const;

/** Form field code → the answer key it is saved as. */
export const FORM_FIELD_ALIASES: Readonly<Record<string, string>> =
  Object.fromEntries(
    SHARED_HOUSING_BENEFIT_KEYS.map((key) => [
      `${SHARED_OWNERSHIP_FIELD_PREFIX}${key}`,
      key,
    ]),
  );

/**
 * Adds each aliased form field's value, from the answer key it is saved as.
 * @param {Answers} answers - saved answers
 * @returns {Answers} the answers, plus a value for each aliased field
 */
export function withFormAliases(answers: Answers): Answers {
  const aliased = Object.entries(FORM_FIELD_ALIASES).flatMap(
    ([fieldCode, answerKey]) =>
      answers[answerKey] === undefined
        ? []
        : [[fieldCode, answers[answerKey]] as const],
  );
  return { ...answers, ...Object.fromEntries(aliased) };
}

/**
 * Saves each aliased form field under its answer key. Forge has cleared
 * the fields of whichever of the two steps is unreachable, so an aliased
 * field with a value is the reachable one and takes precedence.
 * @param {Answers} formAnswers - Forge's answers
 * @returns {Answers} the answers keyed as the domain reads them
 */
export function withoutFormAliases(formAnswers: Answers): Answers {
  const answers: Answers = {};
  for (const [key, value] of Object.entries(formAnswers)) {
    if (!Object.hasOwn(FORM_FIELD_ALIASES, key)) answers[key] = value;
  }
  for (const [fieldCode, answerKey] of Object.entries(FORM_FIELD_ALIASES)) {
    const cleared =
      Object.hasOwn(formAnswers, fieldCode) && answers[answerKey] === undefined;
    if (formAnswers[fieldCode] !== undefined || cleared) {
      answers[answerKey] = formAnswers[fieldCode];
    }
  }
  return answers;
}
