import type { EffectFunctionContext } from '@ministryofjustice/hmpps-forge/core/authoring'
import type { Session } from 'express-session'

/**
 * Define what needs to be stored in the session for the financial eligibility
 * questions and answers.
 */

export type FinancialEligibilitySession = Session & {
  financialEligibilityDrafts: Record<string, Record<string, unknown>>; // session-stored draft answers for financial eligibility questions, keyed by caseId
  casePatternDrafts?: Record<string, Record<string, Record<string, unknown[]>>>;  // session-stored draft answers for repeating pattern data in the financial eligibility journey
  discardReturnPaths?: Record<string, string>; // last forge journey page visited before the discard interruption page, keyed by caseId
}

export type FinancialEligibilityEffectContext = EffectFunctionContext<
  Record<string, unknown>,
  Record<string, unknown>,
  FinancialEligibilitySession
>