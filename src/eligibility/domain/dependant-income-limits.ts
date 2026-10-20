const MONTHLY_LIMIT = 381.86;
const PENCE_PER_POUND = 100;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
const TWO_WEEKS = 2;
const THREE_MONTHS = 3;
const FOUR_WEEKS = 4;

const WEEKLY_LIMIT = (MONTHLY_LIMIT * MONTHS_PER_YEAR) / WEEKS_PER_YEAR;

export const DEPENDANT_INCOME_UPPER_LIMITS: Readonly<Record<string, number>> = {
  every_week: Math.round(WEEKLY_LIMIT * PENCE_PER_POUND) / PENCE_PER_POUND,
  every_two_weeks:
    Math.round(WEEKLY_LIMIT * TWO_WEEKS * PENCE_PER_POUND) / PENCE_PER_POUND,
  every_four_weeks:
    Math.round(WEEKLY_LIMIT * FOUR_WEEKS * PENCE_PER_POUND) / PENCE_PER_POUND,
  monthly: MONTHLY_LIMIT,
  three_months:
    Math.round(MONTHLY_LIMIT * THREE_MONTHS * PENCE_PER_POUND) /
    PENCE_PER_POUND,
};

/**
 * Whether an income is below the CCQ limit for its frequency.
 * @param {unknown} amount - the entered amount
 * @param {unknown} frequency - the selected frequency code
 * @returns {boolean} whether the amount is below the applicable limit
 */
export function dependantIncomeBelowLimit(
  amount: unknown,
  frequency: unknown,
): boolean {
  const numericAmount =
    typeof amount === "number"
      ? amount
      : typeof amount === "string" && amount.trim() !== ""
        ? Number(amount)
        : Number.NaN;
  if (!Number.isFinite(numericAmount)) return false;
  if (typeof frequency !== "string") return false;
  const { [frequency]: limit } = DEPENDANT_INCOME_UPPER_LIMITS;
  return typeof limit === "number" && numericAmount < limit;
}

/** The monthly equivalent limit used in CCQ's validation message. */
export const DEPENDANT_MONTHLY_INCOME_LIMIT = MONTHLY_LIMIT;
