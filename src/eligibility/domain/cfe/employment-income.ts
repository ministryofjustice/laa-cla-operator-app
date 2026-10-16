// Port of CCQ's `Cfe::EmploymentIncomePayloadService` +
// `CfeParamBuilders::Employment` + `CfeParamBuilders::SelfEmployment`.
// `buildEmploymentDetails`/`buildSelfEmploymentDetails` are shared: the
// client's `income` step and the partner's `partner_income` step both save
// the same row shape, so partner.ts calls these directly rather than
// duplicating the frequency table and sign-flipping logic.
import type { Answers } from "../logic.js";
import { asArray } from "./types.js";
import type { EmploymentDetail, IncomeItem } from "./types.js";

const ZERO = 0;
const NEGATIVE_SIGN = -1;
const SELF_EMPLOYMENT = "self_employment";
const STATUTORY_PAY = "statutory_pay";

/** Ported from `CfeParamBuilders::Employment::FREQUENCY_TRANSLATIONS`. Also
 * reused by dependants.ts for dependants' own income frequencies. */
export const FREQUENCY_TRANSLATIONS: Readonly<Record<string, string>> = {
  every_week: "weekly",
  every_two_weeks: "two_weekly",
  every_four_weeks: "four_weekly",
  monthly: "monthly",
  three_months: "three_monthly",
  year: "annually",
};

/**
 * Translates a CCQ income frequency to the equivalent CFE frequency.
 * @param {string} frequency - a CCQ income frequency
 * @returns {string} the equivalent CFE frequency
 */
export function translateEmploymentFrequency(frequency: string): string {
  return FREQUENCY_TRANSLATIONS[frequency];
}

/**
 * Ported from `CfeParamBuilders::Employment.express_as_negative_figure`.
 * @param {number} figure - a non-negative amount
 * @returns {number} the amount, negated
 */
function expressAsNegativeFigure(figure: number): number {
  return figure * NEGATIVE_SIGN;
}

/**
 * Builds the employment (non-self-employment) income rows from a client's
 * or partner's income list. Ported from `CfeParamBuilders::Employment.call`.
 * @param {IncomeItem[]} incomes - the saved income rows
 * @returns {EmploymentDetail[]} the employment income rows
 */
export function buildEmploymentDetails(
  incomes: IncomeItem[],
): EmploymentDetail[] {
  return incomes
    .filter((item) => item.income_type !== SELF_EMPLOYMENT)
    .map((item) => ({
      income: {
        frequency: translateEmploymentFrequency(item.income_frequency),
        gross: item.gross_income,
        benefits_in_kind: ZERO,
        tax: expressAsNegativeFigure(item.income_tax),
        national_insurance: expressAsNegativeFigure(item.national_insurance),
        receiving_only_statutory_sick_or_maternity_pay:
          item.income_type === STATUTORY_PAY,
      },
    }));
}

/**
 * Builds the self-employment income rows from a client's or partner's
 * income list. Ported from `CfeParamBuilders::SelfEmployment.call`.
 * @param {IncomeItem[]} incomes - the saved income rows
 * @returns {EmploymentDetail[]} the self-employment income rows
 */
export function buildSelfEmploymentDetails(
  incomes: IncomeItem[],
): EmploymentDetail[] {
  return incomes
    .filter((item) => item.income_type === SELF_EMPLOYMENT)
    .map((item) => ({
      income: {
        frequency: translateEmploymentFrequency(item.income_frequency),
        gross: item.gross_income,
        tax: expressAsNegativeFigure(item.income_tax),
        national_insurance: expressAsNegativeFigure(item.national_insurance),
      },
    }));
}

/** The client's employment and self-employment income sections. */
export interface EmploymentIncomeSections {
  employment_details?: EmploymentDetail[];
  self_employment_details?: EmploymentDetail[];
}

/**
 * Builds the client's `employment_details` and `self_employment_details`
 * sections of a CFE payload, if the client's income is relevant. Ported
 * from `Cfe::EmploymentIncomePayloadService`.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {EmploymentIncomeSections} the employment income sections, if relevant
 */
export function buildEmploymentIncomeSections(
  answers: Answers,
  relevantSteps: Set<string>,
): EmploymentIncomeSections {
  if (!relevantSteps.has("income")) return {};
  const incomes = asArray<IncomeItem>(answers.incomes);
  return {
    employment_details: buildEmploymentDetails(incomes),
    self_employment_details: buildSelfEmploymentDetails(incomes),
  };
}
