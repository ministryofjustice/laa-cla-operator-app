import type { FinancialEligibilitySession } from '../context.type.js'
import { isControlledWorkAnswerCode, isValidControlledWorkAnswer } from './controlledWorkSteps.js'
import {
  CONTROLLED_WORK_ANSWER_CODES,
  type ControlledWorkAnswerCode,
  type ControlledWorkAnswers,
} from './controlledWorkTypes.js'

const CONTROLLED_WORK_ANSWER_CODE_LIST: ControlledWorkAnswerCode[] = [...CONTROLLED_WORK_ANSWER_CODES]

/**
 * Keeps only known answer codes holding allowed values; session data is untrusted at this boundary.
 * @param {unknown} stored The value read from the session
 * @returns {ControlledWorkAnswers} The valid answers
 */
export function sanitiseControlledWorkAnswers(stored: unknown): ControlledWorkAnswers {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {}

  const answers: ControlledWorkAnswers = {}
  for (const [code, value] of Object.entries(stored)) {
    if (isControlledWorkAnswerCode(code) && isValidControlledWorkAnswer(code, value)) {
      Object.assign(answers, { [code]: value })
    }
  }
  return answers
}

/**
 * Reads a case's controlled-work answers from the session.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @returns {ControlledWorkAnswers} A copy of the saved answers, empty when none exist
 */
export function readControlledWorkAnswers(session: FinancialEligibilitySession, caseId: string): ControlledWorkAnswers {
  return {
    ...sanitiseControlledWorkAnswers(session.controlledWorkAnswers?.[caseId]),
    ...sanitiseControlledWorkAnswers(session.financialEligibilityDrafts?.[caseId]),
  }
}

/**
 * Replaces a case's controlled-work answers. The session property is reassigned (not mutated in place) so the
 * change is always seen by session stores that track modifications, and other cases' answers are untouched.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @param {ControlledWorkAnswers} answers The answers to store
 * @returns {void}
 */
export function writeControlledWorkAnswers(session: FinancialEligibilitySession, caseId: string, answers: ControlledWorkAnswers): void {
  session.financialEligibilityDrafts ??= {}
  const draft = { ...session.financialEligibilityDrafts[caseId] }
  for (const code of CONTROLLED_WORK_ANSWER_CODE_LIST) delete draft[code]
  Object.assign(draft, answers)
  session.financialEligibilityDrafts = { ...session.financialEligibilityDrafts, [caseId]: draft }

  clearLegacyControlledWorkAnswers(session, caseId)
}

/**
 * Merges newly submitted answers over the saved ones.
 * @param {ControlledWorkAnswers} saved The saved answers
 * @param {Partial<Record<ControlledWorkAnswerCode, unknown>>} submitted Submitted values; invalid values are ignored
 * @returns {ControlledWorkAnswers} The merged answers
 */
export function mergeControlledWorkAnswers(
  saved: ControlledWorkAnswers,
  submitted: Partial<Record<ControlledWorkAnswerCode, unknown>>,
): ControlledWorkAnswers {
  return { ...saved, ...sanitiseControlledWorkAnswers(submitted) }
}

/**
 * Removes a case's controlled-work answers, leaving all other session data alone.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @returns {void}
 */
export function clearControlledWorkAnswers(session: FinancialEligibilitySession, caseId: string): void {
  if (session.financialEligibilityDrafts?.[caseId]) {
    const draft = { ...session.financialEligibilityDrafts[caseId] }
    for (const code of CONTROLLED_WORK_ANSWER_CODE_LIST) delete draft[code]
    session.financialEligibilityDrafts = { ...session.financialEligibilityDrafts, [caseId]: draft }
  }
  clearLegacyControlledWorkAnswers(session, caseId)
}

function clearLegacyControlledWorkAnswers(session: FinancialEligibilitySession, caseId: string): void {
  if (!session.controlledWorkAnswers) return
  const { [caseId]: _removed, ...remaining } = session.controlledWorkAnswers
  session.controlledWorkAnswers = remaining
}
