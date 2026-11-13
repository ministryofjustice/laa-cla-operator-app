import type { FinancialEligibilitySession } from './context.type.js'

/**
 * Type guard for plain record-like objects
 * @param {unknown} value Value to check
 * @returns {boolean} True when value is a non-null, non-array object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks whether a value matches the legacy pattern-draft shape
 * @param {unknown} value Value to validate
 * @returns {boolean} True when value is a record whose values are arrays
 */
export function isLegacyPatternDraftBucket(value: unknown): value is Record<string, unknown[]> {
  if (!isRecord(value)) {
    return false
  }

  const collectionValues = Object.values(value)
  return collectionValues.length > 0 && collectionValues.every(Array.isArray)
}

/**
 * Returns case-scoped pattern drafts and migrates legacy top-level drafts into the case bucket when needed
 * @param {FinancialEligibilitySession} session Session object containing draft answers
 * @param {string} caseId case ID key used for case-scoped drafts
 * @returns {Record<string, Record<string, unknown[]>>} Drafts for the supplied caseId
 */
export function getOrMigrateCasePatternDrafts(session: FinancialEligibilitySession, caseId: string): Record<string, Record<string, unknown[]>> {
  if (!session.casePatternDrafts) {
    session.casePatternDrafts = {}
  }

  const drafts = session.casePatternDrafts

  if (!(caseId in drafts)) {
    const legacyEntries = Object.entries(drafts as Record<string, unknown>).filter(([, value]) => isLegacyPatternDraftBucket(value))

    if (legacyEntries.length > 0) {
      const migratedDrafts: Record<string, Record<string, unknown[]>> = {}

      for (const [patternCode, collections] of legacyEntries) {
        migratedDrafts[patternCode] = collections as Record<string, unknown[]>
      }

      drafts[caseId] = migratedDrafts

      for (const [patternCode] of legacyEntries) {
        delete drafts[patternCode]
      }
    }
  }

  if (!drafts[caseId]) {
    drafts[caseId] = {}
  }

  return drafts[caseId]
}