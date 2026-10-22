import type { Answers } from "../domain/logic.js";
import { STEP_ANSWER_KEYS } from "../domain/step-answer-keys.js";
import { readAmount } from "../lists/add-another.js";
import { withoutFormAliases } from "./field-aliases.js";

// Yes/no radios post "true"/"false", but the domain logic (ported from CCQ)
// expects booleans: `truthy("false")` is true.
const FORM_BOOLEANS: Readonly<Record<string, boolean>> = {
  true: true,
  false: false,
};

// Numeric values that sit directly on a step (rather than in an add-another row),
// which the CFE payload builders read as numbers: a string amount would be
// dropped from the payload. That is every step answer ending `_value`
// (`*_conditional_value`, `house_value`, `housing_benefit_value`), and these.
const NAMED_NUMERIC_ANSWER_CODES = [
  "mortgage",
  "percentage_owned",
  "housing_payments",
  "housing_loan_payments",
  "rent",
  "shared_ownership_mortgage",
  "adult_dependants_count",
  "child_dependants_count",
  "investments",
  "valuables",
  "partner_investments",
  "partner_valuables",
];

// Single-checkbox answers outside add-another rows. Forge posts a ticked box
// as `["true"]` and an unticked one as `[]`, but the CFE payload builders
// check for `true`.
const CHECKBOX_ANSWER_CODES: ReadonlySet<string> = new Set([
  "investments_in_dispute",
  "valuables_in_dispute",
]);
const NUMERIC_ANSWER_CODES: ReadonlySet<string> = new Set([
  ...Object.values(STEP_ANSWER_KEYS)
    .flat()
    .filter((code) => code.endsWith("_value")),
  ...NAMED_NUMERIC_ANSWER_CODES,
]);

/**
 * Converts answers as Forge holds them into the shape the domain expects.
 * @param {Answers} formAnswers - answers keyed by field code, as posted
 * @returns {Answers} the same answers with yes/no strings as booleans, amounts as numbers and aliased fields under their answer keys
 */
export function toDomainAnswers(formAnswers: Answers): Answers {
  return Object.fromEntries(
    Object.entries(withoutFormAliases(formAnswers)).map(([key, value]) => {
      if (NUMERIC_ANSWER_CODES.has(key)) return [key, readAmount(value)];
      if (CHECKBOX_ANSWER_CODES.has(key)) return [key, readCheckbox(value)];
      return [
        key,
        typeof value === "string" && value in FORM_BOOLEANS
          ? FORM_BOOLEANS[value]
          : value,
      ];
    }),
  );
}

/**
 * Reads a single checkbox's answer as a boolean.
 * @param {unknown} value - the answer as posted, or as saved
 * @returns {boolean | undefined} whether the box is ticked, or undefined when the field was not asked
 */
function readCheckbox(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.includes("true");
  return value === true || value === "true";
}

/**
 * Converts a saved domain answer back into the value its form field posts.
 * @param {unknown} value - a saved answer
 * @returns {unknown} the value as Forge's field expects it
 */
function toFormValue(value: unknown): unknown {
  return typeof value === "boolean" || typeof value === "number"
    ? String(value)
    : value;
}

/**
 * Converts a saved answer back into the value its form field posts, ticking
 * a single checkbox the way Forge expects: as the list of ticked options.
 * @param {string} key - the answer's field code
 * @param {unknown} value - a saved answer
 * @returns {unknown} the value as Forge's field expects it, or undefined for an unticked checkbox
 */
export function toFormAnswer(key: string, value: unknown): unknown {
  if (CHECKBOX_ANSWER_CODES.has(key)) {
    return readCheckbox(value) === true ? ["true"] : undefined;
  }
  return toFormValue(value);
}
