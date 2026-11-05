// The housing-benefit check CCQ makes on its housing costs forms: Housing
// Benefit cannot be more than the housing costs it helps with. Ported from
// `BaseHousingCostsForm#housing_benefit_does_not_exceed_costs` and the
// `total_annual_housing_costs` of `HousingCostsForm` and
// `SharedOwnershipHousingCostsForm`.

const WEEKS_PER_YEAR = 52;
const TWO_WEEKS_PER_YEAR = 26;
const FOUR_WEEKS_PER_YEAR = 13;
const MONTHS_PER_YEAR = 12;
const THREE_MONTHS_PER_YEAR = 4;
const PENCE_PER_POUND = 100;
const ZERO = 0;

/**
 * How many times a year a payment at this frequency is made. Ported from
 * `BaseHousingCostsForm#annual_multiplier`.
 * @param {string} frequency - a CCQ frequency value
 * @returns {number} payments per year
 */
export function annualMultiplier(frequency: string): number {
  switch (frequency) {
    case "every_week":
      return WEEKS_PER_YEAR;
    case "every_two_weeks":
      return TWO_WEEKS_PER_YEAR;
    case "every_four_weeks":
      return FOUR_WEEKS_PER_YEAR;
    case "monthly":
      return MONTHS_PER_YEAR;
    default:
      return THREE_MONTHS_PER_YEAR;
  }
}

/**
 * Reads an amount as a form posts it or the domain saves it.
 * @param {unknown} value - the posted or saved amount
 * @returns {number | undefined} the amount, if it is a number
 */
function amountOf(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

/**
 * Whether a frequency was chosen.
 * @param {unknown} frequency - the posted or saved frequency
 * @returns {frequency is string} whether there is one
 */
function present(frequency: unknown): frequency is string {
  return typeof frequency === "string" && frequency !== "";
}

/**
 * The annual housing payments on the housing costs step: nothing until both
 * the amount and its frequency are given.
 * @param {unknown} payments - the housing payments amount
 * @param {unknown} frequency - how often they are paid
 * @returns {number} the annual housing costs
 */
export function annualHousingPayments(
  payments: unknown,
  frequency: unknown,
): number {
  const amount = amountOf(payments);
  if (amount === undefined || !present(frequency)) return ZERO;
  return amount * annualMultiplier(frequency);
}

/**
 * The rent and mortgage on a shared ownership home, rounded to pence.
 * Ported from `SharedOwnershipHousingCostsForm#combined_rent_and_mortgage`.
 * @param {unknown} rent - the rent amount
 * @param {unknown} mortgage - the mortgage payment
 * @returns {number} the combined payment
 */
export function combinedRentAndMortgage(
  rent: unknown,
  mortgage: unknown,
): number {
  const total = (amountOf(rent) ?? ZERO) + (amountOf(mortgage) ?? ZERO);
  return Math.round(total * PENCE_PER_POUND) / PENCE_PER_POUND;
}

/**
 * Whether the shared ownership payments need a frequency: whenever there is
 * any payment. CCQ only asks from a whole pound (`to_i.positive?`), which
 * lets a payment under £1 reach CFE with no frequency.
 * @param {unknown} rent - the rent amount
 * @param {unknown} mortgage - the mortgage payment
 * @returns {boolean} whether a frequency is required
 */
export function combinedPaymentNeedsFrequency(
  rent: unknown,
  mortgage: unknown,
): boolean {
  return combinedRentAndMortgage(rent, mortgage) > ZERO;
}

/**
 * The annual rent and mortgage on a shared ownership home: nothing until a
 * frequency is given.
 * @param {unknown} rent - the rent amount
 * @param {unknown} mortgage - the mortgage payment
 * @param {unknown} frequency - how often both are paid
 * @returns {number} the annual housing costs
 */
export function annualSharedOwnershipPayments(
  rent: unknown,
  mortgage: unknown,
  frequency: unknown,
): number {
  if (!present(frequency)) return ZERO;
  return combinedRentAndMortgage(rent, mortgage) * annualMultiplier(frequency);
}

/**
 * Whether the Housing Benefit is no more than the annual housing costs. As
 * in CCQ, there is nothing to compare until the benefit has a positive
 * amount and a frequency, or while the housing costs are nothing.
 * @param {unknown} benefitValue - the Housing Benefit amount
 * @param {unknown} benefitFrequency - how often it is paid
 * @param {number} annualHousingCosts - the annual housing costs
 * @returns {boolean} whether the benefit is within the costs
 */
export function housingBenefitWithinCosts(
  benefitValue: unknown,
  benefitFrequency: unknown,
  annualHousingCosts: number,
): boolean {
  const benefit = amountOf(benefitValue);
  if (benefit === undefined || benefit <= ZERO || !present(benefitFrequency)) {
    return true;
  }
  if (annualHousingCosts === ZERO) return true;
  // In pence, so floating point does not tip an equal amount over the costs
  // (CCQ's amounts are BigDecimal).
  const annualBenefitPence = Math.round(
    benefit * annualMultiplier(benefitFrequency) * PENCE_PER_POUND,
  );
  return (
    annualBenefitPence <= Math.round(annualHousingCosts * PENCE_PER_POUND)
  );
}
