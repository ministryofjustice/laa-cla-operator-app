// Frequency option lists for the income forms. The values are CCQ's, and the
// labels are CCQ's `question_flow.*.frequencies` copy. Which options apply
// depends on the level of help, so the lists are built here (where they are
// unit tested) and published to the forms rather than hard-coded in each block.
import type { Answers } from "./logic.js";
import { controlled } from "./logic.js";

export interface FrequencyOption {
  value: string;
  text: string;
}

const STANDARD_FREQUENCIES: readonly FrequencyOption[] = [
  { value: "every_week", text: "Every week" },
  { value: "every_two_weeks", text: "Every 2 weeks" },
  { value: "every_four_weeks", text: "Every 4 weeks" },
  { value: "monthly", text: "Every month" },
];

const THREE_MONTHS: FrequencyOption = {
  value: "three_months",
  text: "Total in last 3 months",
};
const YEAR: FrequencyOption = { value: "year", text: "Total in the last year" };
const TOTAL: FrequencyOption = {
  value: "total",
  text: "Total in last 3 months",
};

/**
 * The frequencies a benefit can be received at. Ported from
 * `BenefitModel::FREQUENCY_OPTIONS`.
 * @returns {FrequencyOption[]} the benefit frequencies
 */
export function benefitFrequencyOptions(): FrequencyOption[] {
  return [...STANDARD_FREQUENCIES];
}

/**
 * The frequencies employment income can be received at. The yearly total is
 * not available for controlled work. Ported from
 * `IncomeModel#relevant_frequency_options`.
 * @param {boolean} isControlled - whether the check is for controlled work
 * @returns {FrequencyOption[]} the income frequencies
 */
export function incomeFrequencyOptions(
  isControlled: boolean,
): FrequencyOption[] {
  return isControlled
    ? [...STANDARD_FREQUENCIES, THREE_MONTHS]
    : [...STANDARD_FREQUENCIES, THREE_MONTHS, YEAR];
}

/**
 * The frequencies other income can be received at. The 3-month total is not
 * available for controlled work. Ported from `OtherIncomeForm#frequencies`.
 * @param {boolean} isControlled - whether the check is for controlled work
 * @returns {FrequencyOption[]} the other income frequencies
 */
export function otherIncomeFrequencyOptions(
  isControlled: boolean,
): FrequencyOption[] {
  return isControlled
    ? [...STANDARD_FREQUENCIES]
    : [...STANDARD_FREQUENCIES, TOTAL];
}

/** The frequency options each income form reads, for one check. */
export interface FrequencyOptionSets {
  benefit: FrequencyOption[];
  income: FrequencyOption[];
  otherIncome: FrequencyOption[];
}

/**
 * Builds every frequency list for a check from its saved answers.
 * @param {Answers} answers - the saved answers
 * @returns {FrequencyOptionSets} the frequency lists for the level of help
 */
export function frequencyOptionsFor(answers: Answers): FrequencyOptionSets {
  const isControlled = controlled(answers);
  return {
    benefit: benefitFrequencyOptions(),
    income: incomeFrequencyOptions(isControlled),
    otherIncome: otherIncomeFrequencyOptions(isControlled),
  };
}

/**
 * The label for a saved frequency, whichever form it came from. Every form
 * labels a value the same way, so this does not need the level of help.
 * @param {unknown} value - a saved frequency value
 * @returns {string | undefined} the label, if the value is a known frequency
 */
export function frequencyLabel(value: unknown): string | undefined {
  return [
    ...incomeFrequencyOptions(false),
    ...otherIncomeFrequencyOptions(false),
  ].find((option) => option.value === value)?.text;
}
