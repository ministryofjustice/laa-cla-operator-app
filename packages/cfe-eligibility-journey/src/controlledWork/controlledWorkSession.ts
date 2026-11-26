import type { FinancialEligibilitySession } from '../context.type.js'
import { isControlledWorkAnswerCode, isValidControlledWorkAnswer } from './controlledWorkSteps.js'
import {
  CONTROLLED_WORK_ANSWER_CODES,
  type ControlledWorkAnswerCode,
  type ControlledWorkAnswers,
  type ControlledWorkStepCode,
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
  endControlledWorkChange(session, caseId)
}

/**
 * Starts (or restarts) a change-answer loop for a case. Edits are still saved immediately; the loop only changes where
 * the journey goes after each save.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @returns {void}
 */
export function startControlledWorkChange(session: FinancialEligibilitySession, caseId: string): void {
  session.controlledWorkChangeLoops = { ...session.controlledWorkChangeLoops, [caseId]: {} }
}

/**
 * Checks whether a case is in a change-answer loop.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @returns {boolean} True while the loop is active
 */
export function isControlledWorkChangeActive(session: FinancialEligibilitySession, caseId: string): boolean {
  return session.controlledWorkChangeLoops?.[caseId] !== undefined
}

/**
 * Records where an active change-answer loop goes next. Does nothing when the case is not in a loop.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @param {ControlledWorkStepCode | undefined} nextStep The next step, or undefined to return to check answers
 * @returns {void}
 */
export function setControlledWorkChangeNextStep(
  session: FinancialEligibilitySession,
  caseId: string,
  nextStep: ControlledWorkStepCode | undefined,
): void {
  if (!isControlledWorkChangeActive(session, caseId)) return
  session.controlledWorkChangeLoops = { ...session.controlledWorkChangeLoops, [caseId]: { nextStep } }
}

/**
 * Reads where an active change-answer loop goes next.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @returns {ControlledWorkStepCode | undefined} The recorded next step, if any
 */
export function getControlledWorkChangeNextStep(
  session: FinancialEligibilitySession,
  caseId: string,
): ControlledWorkStepCode | undefined {
  return session.controlledWorkChangeLoops?.[caseId]?.nextStep
}

/**
 * Ends a case's change-answer loop, leaving other cases and all answers alone.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @returns {void}
 */
export function endControlledWorkChange(session: FinancialEligibilitySession, caseId: string): void {
  if (!isControlledWorkChangeActive(session, caseId)) return
  const { [caseId]: _ended, ...remaining } = session.controlledWorkChangeLoops ?? {}
  session.controlledWorkChangeLoops = remaining
}

function clearLegacyControlledWorkAnswers(session: FinancialEligibilitySession, caseId: string): void {
  if (!session.controlledWorkAnswers) return
  const { [caseId]: _removed, ...remaining } = session.controlledWorkAnswers
  session.controlledWorkAnswers = remaining
}
