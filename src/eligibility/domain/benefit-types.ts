// Port of CCQ's `BenefitDetailsForm#benefit_list`: which of CFE's state
// benefit types the operator can pick from. Benefits that are passporting, or
// that CFE already excludes from gross income, are asked about elsewhere or
// not at all, so they are not offered.
import type { StateBenefitType } from "../ports/assessor.js";

const BENEFITS_TO_OMIT: ReadonlySet<string> = new Set([
  "age_related_payment",
  "universal_credit",
  "income_support",
  "jobseekers_allowance",
  "employment_support_allowance",
  "pension_credit",
  "guaranteed_min_pension",
  "state_pension",
  "state_second_pension",
]);

export interface BenefitTypeOption {
  value: string;
  text: string;
}

/**
 * Filters CFE's state benefit types to the names an operator can choose.
 * Each name is offered once, in CFE's order.
 * @param {StateBenefitType[]} benefitTypes - CFE's state benefit types
 * @returns {BenefitTypeOption[]} the select options, with CFE's `name` as the value
 */
export function benefitTypeOptions(
  benefitTypes: readonly StateBenefitType[],
): BenefitTypeOption[] {
  const names = benefitTypes
    .filter(
      (benefitType) =>
        !benefitType.exclude_from_gross_income &&
        !BENEFITS_TO_OMIT.has(benefitType.label),
    )
    .map((benefitType) => benefitType.name);

  return [...new Set(names)].map((name) => ({ value: name, text: name }));
}
