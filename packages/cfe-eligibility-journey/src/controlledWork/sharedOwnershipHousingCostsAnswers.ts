import {
  SHARED_OWNERSHIP_HOUSING_COST_AMOUNT_CODES,
  SHARED_OWNERSHIP_HOUSING_COST_FREQUENCIES,
  YES,
  type ControlledWorkAnswerCode,
  type ControlledWorkAnswers,
} from './controlledWorkTypes.js'
import {
  isNonNegativeSharedOwnershipHousingCost,
  isPositiveSharedOwnershipHousingCost,
  isValidSharedHousingBenefitFrequency,
  isValidSharedOwnershipHousingCost,
  parseSharedOwnershipHousingCost,
} from './sharedOwnershipHousingCostsValidation.js'

const ZERO = 0
const AMOUNT_CODE_SET = new Set<string>(SHARED_OWNERSHIP_HOUSING_COST_AMOUNT_CODES)
const HOUSING_BENEFIT_CONDITIONAL_CODE_SET = new Set<string>(['housing_benefit_value', 'housing_benefit_frequency'])
const HOUSING_COST_FREQUENCY_SET = new Set<string>(SHARED_OWNERSHIP_HOUSING_COST_FREQUENCIES)
const SHARED_OWNERSHIP_HOUSING_ANSWER_CODES = [
  ...SHARED_OWNERSHIP_HOUSING_COST_AMOUNT_CODES,
  'combined_frequency',
  'housing_benefit_relevant',
  'housing_benefit_frequency',
] as const

export type SharedOwnershipHousingAnswerCode = (typeof SHARED_OWNERSHIP_HOUSING_ANSWER_CODES)[number]

/**
 * Checks whether a controlled-work answer belongs to the shared-ownership housing-costs page.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @returns {boolean} Whether the answer code belongs to this page
 */
export function isSharedOwnershipHousingAnswerCode(
  code: ControlledWorkAnswerCode,
): code is SharedOwnershipHousingAnswerCode {
  return SHARED_OWNERSHIP_HOUSING_ANSWER_CODES.some((answerCode) => answerCode === code)
}

/**
 * Validates a shared-ownership housing-cost answer.
 * @param {SharedOwnershipHousingAnswerCode} code The answer code
 * @param {unknown} value The submitted answer
 * @returns {boolean} Whether the answer is valid for its field
 */
export function isValidSharedOwnershipHousingAnswer(
  code: SharedOwnershipHousingAnswerCode,
  value: unknown,
): boolean {
  if (AMOUNT_CODE_SET.has(code)) {
    if (code === 'housing_benefit_value') {
      return isValidSharedOwnershipHousingCost(value) && isPositiveSharedOwnershipHousingCost(value)
    }
    return isValidSharedOwnershipHousingCost(value) && isNonNegativeSharedOwnershipHousingCost(value)
  }
  if (code === 'combined_frequency') {
    return typeof value === 'string' && HOUSING_COST_FREQUENCY_SET.has(value)
  }
  if (code === 'housing_benefit_frequency') return isValidSharedHousingBenefitFrequency(value)
  return value === 'yes' || value === 'no'
}

/**
 * Checks whether a previously saved answer remains relevant to the shared-ownership page.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @param {ControlledWorkAnswers} answers The answers resolved so far
 * @returns {boolean} Whether the answer remains relevant
 */
export function isSharedOwnershipHousingAnswerRelevant(
  code: ControlledWorkAnswerCode,
  answers: ControlledWorkAnswers,
): boolean {
  if (HOUSING_BENEFIT_CONDITIONAL_CODE_SET.has(code)) return answers.housing_benefit_relevant === YES
  if (code !== 'combined_frequency') return true
  const rent = parseSharedOwnershipHousingCost(answers.rent) ?? ZERO
  const mortgage = parseSharedOwnershipHousingCost(answers.shared_ownership_mortgage) ?? ZERO
  return rent + mortgage > ZERO
}

/**
 * Checks whether a shared housing payment frequency is required after positive costs are entered.
 * @param {ControlledWorkAnswers} answers The resolved answers
 * @returns {boolean} Whether a combined payment frequency is required
 */
export function hasPositiveSharedOwnershipHousingCosts(answers: ControlledWorkAnswers): boolean {
  const rent = parseSharedOwnershipHousingCost(answers.rent) ?? ZERO
  const mortgage = parseSharedOwnershipHousingCost(answers.shared_ownership_mortgage) ?? ZERO
  return rent + mortgage > ZERO
}

/**
 * Checks whether a conditional shared-housing answer is required.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @param {ControlledWorkAnswers} answers The resolved answers
 * @returns {boolean} Whether the answer is required on the current page
 */
export function isRequiredSharedOwnershipHousingAnswer(
  code: ControlledWorkAnswerCode,
  answers: ControlledWorkAnswers,
): boolean {
  if (code === 'combined_frequency') return hasPositiveSharedOwnershipHousingCosts(answers)
  if (HOUSING_BENEFIT_CONDITIONAL_CODE_SET.has(code)) return answers.housing_benefit_relevant === YES
  return true
}
