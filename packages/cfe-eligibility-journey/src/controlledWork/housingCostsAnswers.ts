import {
  HOUSING_COST_PAYMENT_FREQUENCIES,
  YES,
  type ControlledWorkAnswerCode,
  type ControlledWorkAnswers,
} from './controlledWorkTypes.js'
import { parseSharedOwnershipHousingCost } from './sharedOwnershipHousingCostsValidation.js'

const ZERO = 0
const HOUSING_COST_ANSWER_CODES = [
  'housing_payments',
  'housing_payments_frequency',
  'housing_benefit_relevant',
  'housing_benefit_value',
  'housing_benefit_frequency',
] as const

export type HousingCostAnswerCode = (typeof HOUSING_COST_ANSWER_CODES)[number]

export function isHousingCostAnswerCode(code: ControlledWorkAnswerCode): code is HousingCostAnswerCode {
  return HOUSING_COST_ANSWER_CODES.some((answerCode) => answerCode === code)
}

export function isValidHousingPayment(value: unknown): boolean {
  const amount = parseSharedOwnershipHousingCost(value)
  return amount !== undefined && amount >= ZERO
}

export function hasPositiveHousingPayment(answers: ControlledWorkAnswers): boolean {
  const amount = parseSharedOwnershipHousingCost(answers.housing_payments)
  return amount !== undefined && amount > ZERO
}

export function isValidHousingPaymentFrequency(value: unknown, answers: ControlledWorkAnswers): boolean {
  if (!hasPositiveHousingPayment(answers)) return true
  return typeof value === 'string' && HOUSING_COST_PAYMENT_FREQUENCIES.some((frequency) => frequency === value)
}

export function isHousingCostAnswerRelevant(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (code === 'housing_payments_frequency') return hasPositiveHousingPayment(answers)
  if (code === 'housing_benefit_value' || code === 'housing_benefit_frequency') {
    return answers.housing_benefit_relevant === YES
  }
  return true
}

export function isRequiredHousingCostAnswer(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (code === 'housing_payments_frequency') return hasPositiveHousingPayment(answers)
  if (code === 'housing_benefit_value' || code === 'housing_benefit_frequency') {
    return answers.housing_benefit_relevant === YES
  }
  return true
}
