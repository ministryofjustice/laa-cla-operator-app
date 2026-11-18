import {
  SHARED_OWNERSHIP_HOUSING_BENEFIT_FREQUENCIES,
  SHARED_OWNERSHIP_HOUSING_COST_FREQUENCIES,
} from './controlledWorkTypes.js'

const CURRENCY_PATTERN = /^-?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?|\.\d{1,2})$/u
const ZERO = 0
const ONE_HUNDRED = 100
const WEEKS_PER_YEAR = 52
const TWO_WEEK_PERIODS_PER_YEAR = 26
const FOUR_WEEK_PERIODS_PER_YEAR = 13
const MONTHS_PER_YEAR = 12
const THREE_MONTH_PERIODS_PER_YEAR = 4
const FREQUENCY_ANNUAL_MULTIPLIERS = new Map([
  ['every_week', WEEKS_PER_YEAR],
  ['every_two_weeks', TWO_WEEK_PERIODS_PER_YEAR],
  ['every_four_weeks', FOUR_WEEK_PERIODS_PER_YEAR],
  ['monthly', MONTHS_PER_YEAR],
  ['total', THREE_MONTH_PERIODS_PER_YEAR],
])

export interface SharedHousingCostValues {
  rent: unknown
  mortgage: unknown
  combinedFrequency: unknown
  benefitFrequency: unknown
}

/**
 * Parses a currency value entered on the shared-ownership housing-costs page.
 * @param {unknown} value The submitted currency value
 * @returns {number | undefined} The numeric amount, or undefined when its format is invalid
 */
export function parseSharedOwnershipHousingCost(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const normalised = String(value).trim().replace(/^£/u, '')
  if (!CURRENCY_PATTERN.test(normalised)) return undefined
  const amount = Number(normalised.replace(/,/gu, ''))
  return Number.isFinite(amount) ? amount : undefined
}

/**
 * Checks that an amount has the currency format accepted by this page.
 * @param {unknown} value The submitted amount
 * @returns {boolean} Whether the amount is a valid number with up to two decimal places
 */
export function isValidSharedOwnershipHousingCost(value: unknown): boolean {
  return parseSharedOwnershipHousingCost(value) !== undefined
}

/**
 * Checks that a supplied amount is zero or greater.
 * @param {unknown} value The submitted amount
 * @returns {boolean} Whether the amount is valid and non-negative
 */
export function isNonNegativeSharedOwnershipHousingCost(value: unknown): boolean {
  const amount = parseSharedOwnershipHousingCost(value)
  return amount !== undefined && amount >= ZERO
}

/**
 * Checks that a supplied Housing Benefit amount is greater than zero.
 * @param {unknown} value The submitted amount
 * @returns {boolean} Whether the amount is valid and positive
 */
export function isPositiveSharedOwnershipHousingCost(value: unknown): boolean {
  const amount = parseSharedOwnershipHousingCost(value)
  return amount !== undefined && amount > ZERO
}

/**
 * Checks whether a frequency is valid when shared housing costs are positive.
 * @param {unknown} value The combined payment frequency
 * @param {unknown} rent The rent amount
 * @param {unknown} mortgage The shared-ownership mortgage amount
 * @returns {boolean} Whether the frequency is valid or not required because costs are zero
 */
export function isValidSharedHousingCostsFrequency(value: unknown, rent: unknown, mortgage: unknown): boolean {
  const rentAmount = parseSharedOwnershipHousingCost(rent) ?? ZERO
  const mortgageAmount = parseSharedOwnershipHousingCost(mortgage) ?? ZERO
  if (rentAmount + mortgageAmount <= ZERO) return true
  return (
    typeof value === 'string' &&
    SHARED_OWNERSHIP_HOUSING_COST_FREQUENCIES.some((frequency) => frequency === value)
  )
}

/**
 * Checks whether Housing Benefit does not exceed annualised rent and mortgage costs.
 * @param {unknown} benefit The Housing Benefit amount
 * @param {SharedHousingCostValues} housingCosts The rent, mortgage and payment frequencies
 * @returns {boolean} Whether the annualised benefit does not exceed annualised housing costs
 */
export function isHousingBenefitWithinSharedHousingCosts(
  benefit: unknown,
  housingCosts: SharedHousingCostValues,
): boolean {
  const { rent, mortgage, combinedFrequency, benefitFrequency } = housingCosts
  const benefitAmount = parseSharedOwnershipHousingCost(benefit)
  const [rentAmount, mortgageAmount] = [
    parseSharedOwnershipHousingCost(rent),
    parseSharedOwnershipHousingCost(mortgage),
  ]
  const housingMultiplier = FREQUENCY_ANNUAL_MULTIPLIERS.get(String(combinedFrequency))
  const benefitMultiplier = FREQUENCY_ANNUAL_MULTIPLIERS.get(String(benefitFrequency))
  if (
    benefitAmount === undefined ||
    rentAmount === undefined ||
    mortgageAmount === undefined ||
    housingMultiplier === undefined ||
    benefitMultiplier === undefined
  ) {
    return true
  }
  const combinedCosts = Math.round((rentAmount + mortgageAmount) * ONE_HUNDRED) / ONE_HUNDRED
  return combinedCosts * housingMultiplier >= benefitAmount * benefitMultiplier
}

/**
 * Checks whether a Housing Benefit frequency is one of the supported CCQ options.
 * @param {unknown} value The submitted frequency
 * @returns {boolean} Whether the frequency is valid
 */
export function isValidSharedHousingBenefitFrequency(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    SHARED_OWNERSHIP_HOUSING_BENEFIT_FREQUENCIES.some((frequency) => frequency === value)
  )
}
