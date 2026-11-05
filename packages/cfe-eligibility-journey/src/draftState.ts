import type { FinancialEligibilitySession } from './context.type.js'

export function invalidatePreparedEligibilitySnapshot(
  session: FinancialEligibilitySession,
  caseId: string,
): void {
  if (session.preparedEligibilitySnapshots) {
    delete session.preparedEligibilitySnapshots[caseId]
  }
}

export function clearEligibilitySubmissionError(
  session: FinancialEligibilitySession,
  caseId: string,
): void {
  if (session.eligibilitySubmissionErrors) {
    delete session.eligibilitySubmissionErrors[caseId]
  }
}
