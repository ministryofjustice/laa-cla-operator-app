import { NO, PROPERTY_ENTRY_VALUE_CODES } from './controlledWorkTypes.js'
import type { ControlledWorkAnswerCode, ControlledWorkAnswers } from './controlledWorkTypes.js'

const PROPERTY_ENTRY_VALUE_CODE_SET = new Set<string>(PROPERTY_ENTRY_VALUE_CODES)
const PROPERTY_ENTRY_NUMBER_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/u
const PROPERTY_ENTRY_AMOUNT_PATTERN = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/u
const ZERO = 0
const MINIMUM_OWNERSHIP_PERCENTAGE = 1
const MAXIMUM_OWNERSHIP_PERCENTAGE = 100

/**
 * Parses a property amount or percentage without accepting partially numeric input.
 * @param {unknown} value The submitted or stored value
 * @returns {number | undefined} The parsed value, when valid
 */
export function parsePropertyEntryNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined

  const normalised = value.trim().replace(/^£/u, '')
  if (!PROPERTY_ENTRY_NUMBER_PATTERN.test(normalised) && !PROPERTY_ENTRY_AMOUNT_PATTERN.test(normalised)) {
    return undefined
  }
  const parsed = Number(normalised.replace(/,/gu, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Checks whether a value contains a valid number, allowing blank values for the required check to report.
 * @param {unknown} value The submitted value
 * @returns {boolean} Whether the value is blank or numeric
 */
export function isPropertyEntryNumberOrEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || parsePropertyEntryNumber(value) !== undefined
}

/**
 * Checks whether a value is a valid, positive property amount.
 * @param {unknown} value The submitted or stored amount
 * @returns {boolean} Whether the amount is greater than zero
 */
export function isValidPropertyEntryAmount(value: unknown): boolean {
  const parsed = parsePropertyEntryNumber(value)
  return parsed !== undefined && parsed > ZERO
}

/**
 * Checks whether a value is a whole percentage from 1 to 100.
 * @param {unknown} value The submitted or stored percentage
 * @returns {boolean} Whether the percentage is within the CCQ range
 */
export function isValidPropertyEntryPercentage(value: unknown): boolean {
  const parsed = parsePropertyEntryNumber(value)
  return (
    parsed !== undefined &&
    Number.isInteger(parsed) &&
    parsed >= MINIMUM_OWNERSHIP_PERCENTAGE &&
    parsed <= MAXIMUM_OWNERSHIP_PERCENTAGE
  )
}

/**
 * Checks whether a property-entry answer remains applicable to the current matter and ownership route.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @param {ControlledWorkAnswers} answers The resolved answers
 * @returns {boolean} Whether the answer remains relevant
 */
export function isPropertyEntryAnswerRelevant(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (code === 'mortgage') {
    return answers['property-owned'] === 'with_mortgage' || answers['property-owned'] === 'shared_ownership'
  }
  if (code === 'house_in_dispute') return answers['immigration-or-asylum'] === NO
  return PROPERTY_ENTRY_VALUE_CODE_SET.has(code)
}

/**
 * Checks whether a property-entry answer is required on the current route.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @param {ControlledWorkAnswers} answers The resolved answers
 * @returns {boolean} Whether the field is currently rendered and required
 */
export function isRequiredPropertyEntryAnswer(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (code === 'mortgage') {
    return answers['property-owned'] === 'with_mortgage' || answers['property-owned'] === 'shared_ownership'
  }
  if (code === 'house_in_dispute') return answers['immigration-or-asylum'] === NO
  return true
}
