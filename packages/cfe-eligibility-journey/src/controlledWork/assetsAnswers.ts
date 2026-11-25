import { parsePropertyEntryNumber } from './propertyEntryAnswers.js'
import type { ControlledWorkAnswerCode, ControlledWorkAnswers } from './controlledWorkTypes.js'

const ASSET_AMOUNT_PATTERN = /^-?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/u
const VALUABLES_MINIMUM = 500

/**
 * Parses a controlled-work asset amount, allowing empty input for required-field validation.
 * @param {unknown} value Submitted amount
 * @returns {boolean} Whether the amount is empty or a valid number
 */
export function isValidAssetAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (typeof value !== 'string' && typeof value !== 'number') return false
  const normalised = String(value).trim().replace(/^£/u, '')
  return ASSET_AMOUNT_PATTERN.test(normalised) && parsePropertyEntryNumber(normalised) !== undefined
}

/**
 * Checks a valid asset amount against the zero lower bound.
 * @param {unknown} value Submitted amount
 * @returns {boolean} Whether the amount is empty, invalidly formatted, or non-negative
 */
export function isNonNegativeAssetAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (!isValidAssetAmount(value)) return true
  return (parsePropertyEntryNumber(value) ?? 0) >= 0
}

/**
 * Checks whether an investment amount is positive.
 * @param {unknown} value Submitted amount
 * @returns {boolean} Whether the amount is empty, invalidly formatted, or positive
 */
export function isPositiveInvestmentAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (!isValidAssetAmount(value)) return true
  return (parsePropertyEntryNumber(value) ?? 0) > 0
}

/**
 * Checks whether valuables meet the inclusive £500 threshold.
 * @param {unknown} value Submitted amount
 * @returns {boolean} Whether the amount is empty, invalidly formatted, or at least £500
 */
export function isAtLeastValuablesThreshold(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (!isValidAssetAmount(value)) return true
  return (parsePropertyEntryNumber(value) ?? 0) >= VALUABLES_MINIMUM
}

/**
 * Checks whether an asset answer is still relevant to the selected gates.
 * @param {ControlledWorkAnswerCode} code Candidate asset answer
 * @param {ControlledWorkAnswers} answers Resolved answers
 * @returns {boolean} Whether the answer is currently applicable
 */
export function isAssetAnswerRelevant(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (code === 'investments' || code === 'investments_in_dispute') {
    return answers.investments_relevant === 'yes' &&
      (code !== 'investments_in_dispute' || answers['immigration-or-asylum'] === 'no')
  }
  if (code === 'valuables' || code === 'valuables_in_dispute') {
    return answers.valuables_relevant === 'yes' &&
      (code !== 'valuables_in_dispute' || answers['immigration-or-asylum'] === 'no')
  }
  return true
}

/**
 * Checks whether a conditional asset answer must be supplied on the assets step.
 * @param {ControlledWorkAnswerCode} code Candidate asset answer
 * @param {ControlledWorkAnswers} answers Resolved answers
 * @returns {boolean} Whether the answer is required
 */
export function isRequiredAssetAnswer(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (code === 'investments') return answers.investments_relevant === 'yes'
  if (code === 'valuables') return answers.valuables_relevant === 'yes'
  if (code === 'investments_in_dispute') {
    return answers['immigration-or-asylum'] === 'no' && answers.investments_relevant === 'yes'
  }
  if (code === 'valuables_in_dispute') {
    return answers['immigration-or-asylum'] === 'no' && answers.valuables_relevant === 'yes'
  }
  return true
}
