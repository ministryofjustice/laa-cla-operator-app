// Frequency option lists for the income and outgoings forms. The values are CCQ's, and the
// Labels live in the eligibility locale. Which options apply depends on the
// level of help, so the domain returns codes and leaves presentation to the journey.
import type { Answers } from "./logic.js";
import { controlled } from "./logic.js";

export interface FrequencyOption {
  value: string;
}

const STANDARD_FREQUENCIES: readonly FrequencyOption[] = [
  { value: "every_week" },
  { value: "every_two_weeks" },
  { value: "every_four_weeks" },
  { value: "monthly" },
];

const THREE_MONTHS: FrequencyOption = { value: "three_months" };
const YEAR: FrequencyOption = { value: "year" };
const TOTAL: FrequencyOption = { value: "total" };
const DEPENDANT_INCOME_FREQUENCIES: readonly FrequencyOption[] = [
  ...STANDARD_FREQUENCIES,
  THREE_MONTHS,
];

/**
 * The frequencies a dependant's income can be received at. Ported from
 * `DependantIncomeModel#frequency_options`.
 * @returns {FrequencyOption[]} the dependant income frequencies
 */
export function dependantIncomeFrequencyOptions(): FrequencyOption[] {
  return [...DEPENDANT_INCOME_FREQUENCIES];
}

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

/**
 * The frequencies an outgoing or a housing payment can be paid at. The
 * 3-month total is not available for controlled work. Ported from
 * `OutgoingsForm#frequencies`, which `HousingCostsForm` and
 * `MortgageOrLoanPaymentForm` share. Housing Benefit, and shared ownership
 * rent and mortgage, use the benefit frequencies instead.
 * @param {boolean} isControlled - whether the check is for controlled work
 * @returns {FrequencyOption[]} the outgoings frequencies
 */
export function outgoingsFrequencyOptions(
  isControlled: boolean,
): FrequencyOption[] {
  return isControlled
    ? [...STANDARD_FREQUENCIES]
    : [...STANDARD_FREQUENCIES, TOTAL];
}

/** The frequency options each income and outgoings form reads, for one check. */
export interface FrequencyOptionSets {
  benefit: FrequencyOption[];
  dependantIncome: FrequencyOption[];
  income: FrequencyOption[];
  otherIncome: FrequencyOption[];
  outgoings: FrequencyOption[];
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
    dependantIncome: dependantIncomeFrequencyOptions(),
    income: incomeFrequencyOptions(isControlled),
    otherIncome: otherIncomeFrequencyOptions(isControlled),
    outgoings: outgoingsFrequencyOptions(isControlled),
  };
}
