import { HOUSING_LOAN_PAYMENT_FREQUENCIES, type ControlledWorkAnswerCode, type ControlledWorkAnswers } from './controlledWorkTypes.js'
import { parseSharedOwnershipHousingCost } from './sharedOwnershipHousingCostsValidation.js'

const ZERO = 0
const MORTGAGE_OR_LOAN_PAYMENT_ANSWER_CODES = ['housing_loan_payments', 'housing_payments_loan_frequency'] as const

export type MortgageOrLoanPaymentAnswerCode = (typeof MORTGAGE_OR_LOAN_PAYMENT_ANSWER_CODES)[number]

/**
 * Checks whether a controlled-work answer belongs to the mortgage or loan payment page.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @returns {boolean} Whether the answer code belongs to this page
 */
export function isMortgageOrLoanPaymentAnswerCode(code: ControlledWorkAnswerCode): code is MortgageOrLoanPaymentAnswerCode {
  return MORTGAGE_OR_LOAN_PAYMENT_ANSWER_CODES.some((answerCode) => answerCode === code)
}

/**
 * Checks that a mortgage or loan payment is a currency amount of zero or more.
 * @param {unknown} value The submitted or stored amount
 * @returns {boolean} Whether the amount is valid
 */
export function isValidMortgageOrLoanPayment(value: unknown): boolean {
  const amount = parseSharedOwnershipHousingCost(value)
  return amount !== undefined && amount >= ZERO
}

/**
 * Checks whether a payment frequency is needed because the mortgage or loan payment is above zero.
 * @param {unknown} payment The mortgage or loan payment amount
 * @returns {boolean} Whether a frequency is required
 */
export function hasPositiveMortgageOrLoanPayment(payment: unknown): boolean {
  const amount = parseSharedOwnershipHousingCost(payment)
  return amount !== undefined && amount > ZERO
}

/**
 * Checks whether a frequency is valid, or not needed because the payment is not above zero.
 * @param {unknown} value The submitted frequency
 * @param {unknown} payment The submitted mortgage or loan payment amount
 * @returns {boolean} Whether the frequency passes validation
 */
export function isValidMortgageOrLoanPaymentFrequency(value: unknown, payment: unknown): boolean {
  if (!hasPositiveMortgageOrLoanPayment(payment)) return true
  return typeof value === 'string' && HOUSING_LOAN_PAYMENT_FREQUENCIES.some((frequency) => frequency === value)
}

/**
 * Checks whether a mortgage or loan payment answer is relevant, and therefore required, for the resolved answers.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @param {ControlledWorkAnswers} answers The answers resolved so far
 * @returns {boolean} Whether the answer remains relevant
 */
export function isMortgageOrLoanPaymentAnswerRelevant(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (code === 'housing_payments_loan_frequency') return hasPositiveMortgageOrLoanPayment(answers.housing_loan_payments)
  return true
}
