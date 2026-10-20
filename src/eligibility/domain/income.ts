// Income rules the employment income form checks across its fields.

const ZERO = 0;

/**
 * Reads a posted amount, treating anything that is not a number as absent.
 * @param {unknown} value - a posted amount
 * @returns {number | undefined} the amount, or undefined
 */
function asAmount(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

/**
 * Whether income left after tax and National Insurance is positive. Ported
 * from `IncomeModel#net_income_must_be_positive`. This only judges a usable
 * gross income: a missing or non-positive gross is already reported by its
 * own checks, and a tax or National Insurance amount that is not a number
 * counts as nothing for the same reason.
 * @param {unknown} gross - the income before deductions
 * @param {unknown} tax - the income tax
 * @param {unknown} nationalInsurance - the National Insurance
 * @returns {boolean} whether net income is positive, or cannot be judged yet
 */
export function netIncomeIsPositive(
  gross: unknown,
  tax: unknown,
  nationalInsurance: unknown,
): boolean {
  const grossAmount = asAmount(gross);
  if (grossAmount === undefined || grossAmount <= ZERO) return true;
  return (
    grossAmount -
      (asAmount(tax) ?? ZERO) -
      (asAmount(nationalInsurance) ?? ZERO) >
    ZERO
  );
}
