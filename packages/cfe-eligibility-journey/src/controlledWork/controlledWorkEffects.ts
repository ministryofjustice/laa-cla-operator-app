import type { EffectFunctionContext, EffectFunctionExpr } from '@ministryofjustice/hmpps-forge/core/authoring'
import type { FinancialEligibilitySession } from '../context.type.js'
import { CLIENT_DATE_OF_BIRTH_DATA_KEY } from '../clientAge.js'
import { getOrMigrateCasePatternDrafts } from '../casePatternDrafts.js'
import { clearEligibilitySubmissionError, invalidatePreparedEligibilitySnapshot } from '../draftState.js'
import { FinancialEligibilityEffectsRegistry } from '../effects.js'
import {
  deriveControlledWorkContext,
  getFirstMissingStep,
  getNextStep,
  getStepAnswerCodes,
  isControlledWorkChildcareEligible,
  isControlledWorkComplete,
  isStepApplicable,
  resolveControlledWorkJourney,
} from './controlledWorkSteps.js'
import { mergeControlledWorkAnswers, readControlledWorkAnswers, writeControlledWorkAnswers } from './controlledWorkSession.js'
import {
  CONTROLLED_WORK_ANSWER_CODES,
  CONTROLLED_WORK_STEP_CODES,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
  type ControlledWorkStepCode,
} from './controlledWorkTypes.js'

/** Forge Data keys populated for steps and redirects. Empty string means "none". */
export const CONTROLLED_WORK_DATA_KEYS = {
  applicableSteps: 'controlledWorkApplicableSteps',
  nextStep: 'controlledWorkNextStep',
  firstMissingStep: 'controlledWorkFirstMissingStep',
  complete: 'controlledWorkComplete',
  dependantIncomeCollection: 'dependant_incomes',
  dependantIncomeMaxRows: 'controlledWorkDependantIncomeMaxRows',
  incomeCollection: 'incomes',
  partnerIncomeCollection: 'partner_incomes',
  benefitCollection: 'benefits',
  partnerBenefitCollection: 'partner_benefits',
  assetBankAccountCollection: 'bank_accounts',
  partnerAssetBankAccountCollection: 'partner_bank_accounts',
  additionalPropertyCollection: 'additional_properties',
  partnerAdditionalPropertyCollection: 'partner_additional_properties',
  benefitSuggestions: 'controlledWorkBenefitSuggestions',
  childcareEligible: 'controlledWorkChildcareEligible',
} as const

export interface ControlledWorkEffectShape {
  /** Loads the case's saved controlled-work answers into Forge, removing any that no longer apply */
  RestoreControlledWorkAnswers: () => EffectFunctionExpr
  /** Saves the step's posted answers, removes answers made irrelevant by the change and sets the next step */
  SaveControlledWorkAnswers: (stepCode: ControlledWorkStepCode) => EffectFunctionExpr
  /** Loads repeating dependant-income rows and limits them to the currently selected dependants */
  PrepareDependantIncomeDetails: () => EffectFunctionExpr
  /** Loads repeating client income rows and supplies the initial blank row */
  PrepareIncomeDetails: () => EffectFunctionExpr
  /** Loads repeating partner income rows and supplies the initial blank row */
  PreparePartnerIncomeDetails: () => EffectFunctionExpr
  /** Loads repeating client benefit rows and supplies the initial blank row */
  PrepareBenefitDetails: () => EffectFunctionExpr
  /** Loads repeating partner benefit rows and supplies the initial blank row */
  PreparePartnerBenefitDetails: () => EffectFunctionExpr
  /** Loads repeating additional-property rows and supplies the initial blank row */
  PrepareAdditionalPropertyDetails: () => EffectFunctionExpr
  /** Removes conditional additional-property values that were hidden when a row was submitted */
  NormalizeAdditionalPropertyDetails: () => EffectFunctionExpr
  /** Loads repeating partner additional-property rows, case-scoped and prepopulated */
  PreparePartnerAdditionalPropertyDetails: () => EffectFunctionExpr
  /** Removes conditional partner mortgage values hidden when a row was submitted */
  NormalizePartnerAdditionalPropertyDetails: () => EffectFunctionExpr
  /** Loads repeating client bank-account rows, case-scoped and prepopulated */
  PrepareAssets: () => EffectFunctionExpr
  /** Removes hidden asset dispute flags and normalizes unchecked boxes */
  NormalizeAssets: () => EffectFunctionExpr
  /** Loads repeating partner bank-account rows, case-scoped and prepopulated */
  PreparePartnerAssets: () => EffectFunctionExpr
}

const ALL_ANSWER_CODES = [...CONTROLLED_WORK_ANSWER_CODES]
const NO_STEP = ''
const DEPENDANT_INCOME_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.dependantIncomeDetails
const DEPENDANT_INCOME_FIELD_CODES = ['amount', 'frequency']
const INCOME_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.income
const INCOME_FIELD_CODES = ['income_type', 'income_frequency', 'gross_income', 'income_tax', 'national_insurance']
const PARTNER_INCOME_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.partnerIncome
const PARTNER_BENEFIT_DETAILS_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.partnerBenefitDetails
const ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.additionalPropertyDetails
const PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.partnerAdditionalPropertyDetails
const ASSETS_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.assets
const PARTNER_ASSETS_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.partnerAssets
const ASSET_BANK_ACCOUNT_FIELD_CODES = ['amount', 'account_in_dispute']
const PARTNER_ASSET_BANK_ACCOUNT_FIELD_CODES = ['amount']
const ADDITIONAL_PROPERTY_FIELD_CODES = [
  'house_value',
  'inline_owned_with_mortgage',
  'mortgage',
  'percentage_owned',
  'house_in_dispute',
]
const PARTNER_ADDITIONAL_PROPERTY_FIELD_CODES = [
  'house_value',
  'inline_owned_with_mortgage',
  'mortgage',
  'percentage_owned',
]
const PARTNER_INCOME_FIELD_CODES = [
  'partner_income_type',
  'partner_income_frequency',
  'partner_gross_income',
  'partner_income_tax',
  'partner_national_insurance',
]
const BENEFIT_DETAILS_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.benefitDetails
const BENEFIT_DETAILS_FIELD_CODES = ['benefit_type', 'benefit_amount', 'benefit_frequency']

interface BenefitDetailsDraftConfig {
  patternCode: ControlledWorkStepCode
  collectionCode: string
  gateAnswerCode: keyof ControlledWorkAnswers
}

function getCaseId(context: EffectFunctionContext): string | undefined {
  const caseId = context.getRequestParam('caseId')
  return typeof caseId === 'string' && caseId.length > 0 ? caseId : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAdditionalPropertyDetailsApplicable(answers: ControlledWorkAnswers): boolean {
  return answers['additional-property-owned'] === 'with_mortgage' || answers['additional-property-owned'] === 'outright'
}

function reconcileAdditionalPropertyDetailsDrafts(
  session: FinancialEligibilitySession,
  caseId: string,
  answers: ControlledWorkAnswers,
): boolean {
  const casePatterns = session.casePatternDrafts?.[caseId]
  const pattern = casePatterns?.[ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.additionalPropertyCollection
  const savedRows = pattern?.[collectionCode]

  if (!isAdditionalPropertyDetailsApplicable(answers)) {
    if (!savedRows && !pattern) return false

    const updatedCasePatterns = { ...(casePatterns ?? {}) }
    const updatedPattern = { ...(pattern ?? {}) }
    delete updatedPattern[collectionCode]
    if (Object.keys(updatedPattern).length === 0) delete updatedCasePatterns[ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE]
    else updatedCasePatterns[ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE] = updatedPattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: updatedCasePatterns }
    return true
  }

  if (!Array.isArray(savedRows)) return false

  let changed = false
  const rows = savedRows.map((row, index) => {
    if (!isRecord(row)) return row
    const updated = { ...row }

    if (index === 0) {
      if (updated.inline_owned_with_mortgage !== undefined) {
        delete updated.inline_owned_with_mortgage
        changed = true
      }
      if (answers['additional-property-owned'] !== 'with_mortgage' && updated.mortgage !== undefined) {
        delete updated.mortgage
        changed = true
      }
    } else if (updated.inline_owned_with_mortgage !== 'yes' && updated.mortgage !== undefined) {
      delete updated.mortgage
      changed = true
    }

    if (answers['immigration-or-asylum'] !== 'no' && updated.house_in_dispute !== undefined) {
      delete updated.house_in_dispute
      changed = true
    }
    return updated
  })

  if (!changed) return false
  const updatedCasePatterns = { ...(casePatterns ?? {}) }
  updatedCasePatterns[ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE] = {
    ...pattern,
    [collectionCode]: rows,
  }
  session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: updatedCasePatterns }
  return true
}

function reconcilePartnerAdditionalPropertyDetailsDrafts(
  session: FinancialEligibilitySession,
  caseId: string,
  answers: ControlledWorkAnswers,
): boolean {
  const casePatterns = session.casePatternDrafts?.[caseId]
  const pattern = casePatterns?.[PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.partnerAdditionalPropertyCollection
  const savedRows = pattern?.[collectionCode]
  const ownership = answers['partner-additional-property-owned']

  if (
    answers.partner !== 'yes' ||
    (ownership !== 'with_mortgage' && ownership !== 'outright')
  ) {
    if (!savedRows && !pattern) return false

    const updatedCasePatterns = { ...(casePatterns ?? {}) }
    const updatedPattern = { ...(pattern ?? {}) }
    delete updatedPattern[collectionCode]
    if (Object.keys(updatedPattern).length === 0) {
      delete updatedCasePatterns[PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE]
    } else {
      updatedCasePatterns[PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE] = updatedPattern
    }
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: updatedCasePatterns }
    return true
  }

  if (!Array.isArray(savedRows)) return false

  let changed = false
  const rows = savedRows.map((row, index) => {
    if (!isRecord(row)) return row
    const updated = { ...row }

    if (index === 0) {
      if (updated.inline_owned_with_mortgage !== undefined) {
        delete updated.inline_owned_with_mortgage
        changed = true
      }
      if (ownership !== 'with_mortgage' && updated.mortgage !== undefined) {
        delete updated.mortgage
        changed = true
      }
    } else if (updated.inline_owned_with_mortgage !== 'yes' && updated.mortgage !== undefined) {
      delete updated.mortgage
      changed = true
    }
    return updated
  })

  if (!changed) return false
  const updatedCasePatterns = { ...(casePatterns ?? {}) }
  updatedCasePatterns[PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE] = {
    ...pattern,
    [collectionCode]: rows,
  }
  session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: updatedCasePatterns }
  return true
}

function reconcileAssetBankAccountDrafts(
  session: FinancialEligibilitySession,
  caseId: string,
  answers: ControlledWorkAnswers,
  context: ControlledWorkContext,
): boolean {
  const casePatterns = session.casePatternDrafts?.[caseId]
  const pattern = casePatterns?.[ASSETS_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.assetBankAccountCollection
  const savedRows = pattern?.[collectionCode]

  if (!isStepApplicable(ASSETS_PATTERN_CODE, answers, context)) {
    if (!savedRows && !pattern) return false

    const updatedCasePatterns = { ...(casePatterns ?? {}) }
    const updatedPattern = { ...(pattern ?? {}) }
    delete updatedPattern[collectionCode]
    if (Object.keys(updatedPattern).length === 0) delete updatedCasePatterns[ASSETS_PATTERN_CODE]
    else updatedCasePatterns[ASSETS_PATTERN_CODE] = updatedPattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: updatedCasePatterns }
    return true
  }

  if (!Array.isArray(savedRows) || answers['immigration-or-asylum'] === 'no') return false
  let changed = false
  const rows = savedRows.map((row) => {
    if (!isRecord(row) || row.account_in_dispute === undefined) return row
    const updated = { ...row }
    delete updated.account_in_dispute
    changed = true
    return updated
  })

  if (!changed) return false
  const updatedCasePatterns = { ...(casePatterns ?? {}) }
  updatedCasePatterns[ASSETS_PATTERN_CODE] = { ...pattern, [collectionCode]: rows }
  session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: updatedCasePatterns }
  return true
}

function reconcilePartnerAssetBankAccountDrafts(
  session: FinancialEligibilitySession,
  caseId: string,
  answers: ControlledWorkAnswers,
  context: ControlledWorkContext,
): boolean {
  const casePatterns = session.casePatternDrafts?.[caseId]
  const pattern = casePatterns?.[PARTNER_ASSETS_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.partnerAssetBankAccountCollection
  const savedRows = pattern?.[collectionCode]

  if (isStepApplicable(PARTNER_ASSETS_PATTERN_CODE, answers, context) || (!savedRows && !pattern)) return false

  const updatedCasePatterns = { ...(casePatterns ?? {}) }
  const updatedPattern = { ...(pattern ?? {}) }
  delete updatedPattern[collectionCode]
  if (Object.keys(updatedPattern).length === 0) delete updatedCasePatterns[PARTNER_ASSETS_PATTERN_CODE]
  else updatedCasePatterns[PARTNER_ASSETS_PATTERN_CODE] = updatedPattern
  session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: updatedCasePatterns }
  return true
}

function prepareAdditionalPropertyDetails(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const casePatterns = getOrMigrateCasePatternDrafts(session, caseId)
  const pattern = casePatterns[ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE] ?? {}
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.additionalPropertyCollection
  const savedRows = pattern[collectionCode] as Array<Record<string, unknown>> | undefined
  const rows = savedRows?.length
    ? savedRows
    : [Object.fromEntries(ADDITIONAL_PROPERTY_FIELD_CODES.map((code) => [code, '']))]

  if (!savedRows?.length) {
    pattern[collectionCode] = rows
    casePatterns[ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE] = pattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: casePatterns }
  }

  context.setData(collectionCode, rows)
  rows.forEach((row, index) => {
    for (const code of ADDITIONAL_PROPERTY_FIELD_CODES) {
      context.setAnswer(`${code}_${index}`, row[code] ?? '')
    }
  })
}

function preparePartnerAdditionalPropertyDetails(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const casePatterns = getOrMigrateCasePatternDrafts(session, caseId)
  const pattern = casePatterns[PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE] ?? {}
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.partnerAdditionalPropertyCollection
  const savedRows = pattern[collectionCode] as Array<Record<string, unknown>> | undefined
  const rows = savedRows?.length
    ? savedRows
    : [Object.fromEntries(PARTNER_ADDITIONAL_PROPERTY_FIELD_CODES.map((code) => [code, '']))]

  if (!savedRows?.length) {
    pattern[collectionCode] = rows
    casePatterns[PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE] = pattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: casePatterns }
  }

  context.setData(collectionCode, rows)
  rows.forEach((row, index) => {
    for (const code of PARTNER_ADDITIONAL_PROPERTY_FIELD_CODES) {
      context.setAnswer(`${code}_${index}`, row[code] ?? '')
    }
  })
}

function prepareAssets(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const casePatterns = getOrMigrateCasePatternDrafts(session, caseId)
  const pattern = casePatterns[ASSETS_PATTERN_CODE] ?? {}
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.assetBankAccountCollection
  const savedRows = pattern[collectionCode] as Array<Record<string, unknown>> | undefined
  const rows = savedRows?.length
    ? savedRows
    : [Object.fromEntries(ASSET_BANK_ACCOUNT_FIELD_CODES.map((code) => [code, '']))]

  if (!savedRows?.length) {
    pattern[collectionCode] = rows
    casePatterns[ASSETS_PATTERN_CODE] = pattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: casePatterns }
  }

  context.setData(collectionCode, rows)
  rows.forEach((row, index) => {
    for (const code of ASSET_BANK_ACCOUNT_FIELD_CODES) {
      context.setAnswer(`${code}_${index}`, row[code] ?? '')
    }
  })
}

function preparePartnerAssets(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const casePatterns = getOrMigrateCasePatternDrafts(session, caseId)
  const pattern = casePatterns[PARTNER_ASSETS_PATTERN_CODE] ?? {}
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.partnerAssetBankAccountCollection
  const savedRows = pattern[collectionCode] as Array<Record<string, unknown>> | undefined
  const rows = savedRows?.length
    ? savedRows
    : [Object.fromEntries(PARTNER_ASSET_BANK_ACCOUNT_FIELD_CODES.map((code) => [code, '']))]

  if (!savedRows?.length) {
    pattern[collectionCode] = rows
    casePatterns[PARTNER_ASSETS_PATTERN_CODE] = pattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: casePatterns }
  }

  context.setData(collectionCode, rows)
  rows.forEach((row, index) => {
    for (const code of PARTNER_ASSET_BANK_ACCOUNT_FIELD_CODES) {
      context.setAnswer(`${code}_${index}`, row[code] ?? '')
    }
  })
}

function normalizeAdditionalPropertyDetails(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const patternsByCase = session.casePatternDrafts
  const casePatterns = patternsByCase?.[caseId]
  const pattern = casePatterns?.[ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.additionalPropertyCollection
  const rows = pattern?.[collectionCode]
  if (!Array.isArray(rows)) return

  const savedAnswers = readControlledWorkAnswers(session, caseId)
  const ownership = savedAnswers['additional-property-owned']
  const smodApplies = savedAnswers['immigration-or-asylum'] === 'no'
  const posted = context.getAllPostData()
  const removeAction = typeof posted.action === 'string' ? /^remove_(\d+)$/u.exec(posted.action) : null
  const removedRowIndex = removeAction?.[1] === undefined ? undefined : Number(removeAction[1])
  const updatedRows = rows.map((row, index) => {
    if (!isRecord(row)) return row
    const updated = { ...row }

    for (const code of ADDITIONAL_PROPERTY_FIELD_CODES) {
      const currentAnswer = context.getAnswer(`${code}_${index}`)
      if (currentAnswer !== undefined) updated[code] = currentAnswer
    }

    if (index === 0) {
      delete updated.inline_owned_with_mortgage
      if (ownership !== 'with_mortgage') delete updated.mortgage
    } else if (updated.inline_owned_with_mortgage !== 'yes') {
      delete updated.mortgage
    }

    if (smodApplies) {
      const postedIndex = removedRowIndex !== undefined && index >= removedRowIndex ? index + 1 : index
      const disputeAnswer = posted[`house_in_dispute_${postedIndex}`]
      updated.house_in_dispute =
        disputeAnswer === 'yes' || (Array.isArray(disputeAnswer) && disputeAnswer.includes('yes')) ? 'yes' : 'no'
    } else {
      delete updated.house_in_dispute
    }
    return updated
  })

  const updatedCasePatterns = {
    ...(casePatterns ?? {}),
    [ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE]: {
      ...pattern,
      [collectionCode]: updatedRows,
    },
  }
  session.casePatternDrafts = { ...(patternsByCase ?? {}), [caseId]: updatedCasePatterns }
  invalidatePreparedEligibilitySnapshot(session, caseId)
  clearEligibilitySubmissionError(session, caseId)
}

function normalizeAssets(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const patternsByCase = session.casePatternDrafts
  const casePatterns = patternsByCase?.[caseId]
  const pattern = casePatterns?.[ASSETS_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.assetBankAccountCollection
  const rows = pattern?.[collectionCode]
  if (!Array.isArray(rows)) return

  const smodApplies = readControlledWorkAnswers(session, caseId)['immigration-or-asylum'] === 'no'
  const posted = context.getAllPostData()
  const removeAction = typeof posted.action === 'string' ? /^remove_(\d+)$/u.exec(posted.action) : null
  const removedRowIndex = removeAction?.[1] === undefined ? undefined : Number(removeAction[1])
  const updatedRows = rows.map((row, index) => {
    if (!isRecord(row)) return row
    const updated = { ...row }
    const postedIndex = removedRowIndex !== undefined && index >= removedRowIndex ? index + 1 : index
    const disputeAnswer = posted[`account_in_dispute_${postedIndex}`]

    if (smodApplies) {
      updated.account_in_dispute = normalizePropertyEntryDisputeAnswer(disputeAnswer)
    } else {
      delete updated.account_in_dispute
    }
    return updated
  })

  const updatedCasePatterns = {
    ...(casePatterns ?? {}),
    [ASSETS_PATTERN_CODE]: {
      ...pattern,
      [collectionCode]: updatedRows,
    },
  }
  session.casePatternDrafts = { ...(patternsByCase ?? {}), [caseId]: updatedCasePatterns }
  context.setData(collectionCode, updatedRows)
  invalidatePreparedEligibilitySnapshot(session, caseId)
  clearEligibilitySubmissionError(session, caseId)
}

function normalizePartnerAdditionalPropertyDetails(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const patternsByCase = session.casePatternDrafts
  const casePatterns = patternsByCase?.[caseId]
  const pattern = casePatterns?.[PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.partnerAdditionalPropertyCollection
  const rows = pattern?.[collectionCode]
  if (!Array.isArray(rows)) return

  const ownership = readControlledWorkAnswers(session, caseId)['partner-additional-property-owned']
  const posted = context.getAllPostData()
  const removeAction = typeof posted.action === 'string' ? /^remove_(\d+)$/u.exec(posted.action) : null
  const removedRowIndex = removeAction?.[1] === undefined ? undefined : Number(removeAction[1])
  const updatedRows = rows.map((row, index) => {
    if (!isRecord(row)) return row
    const updated = { ...row }

    for (const code of PARTNER_ADDITIONAL_PROPERTY_FIELD_CODES) {
      const currentAnswer = context.getAnswer(`${code}_${index}`)
      if (currentAnswer !== undefined) updated[code] = currentAnswer
    }

    if (index === 0) {
      delete updated.inline_owned_with_mortgage
      if (ownership !== 'with_mortgage') delete updated.mortgage
    } else {
      const postedIndex = removedRowIndex !== undefined && index >= removedRowIndex ? index + 1 : index
      const mortgageAnswer = posted[`inline_owned_with_mortgage_${postedIndex}`]
      if (mortgageAnswer === 'yes' || (Array.isArray(mortgageAnswer) && mortgageAnswer.includes('yes'))) {
        updated.inline_owned_with_mortgage = 'yes'
      } else if (mortgageAnswer === 'no') {
        updated.inline_owned_with_mortgage = 'no'
      }
      if (updated.inline_owned_with_mortgage !== 'yes') delete updated.mortgage
    }
    return updated
  })

  const updatedCasePatterns = {
    ...(casePatterns ?? {}),
    [PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE]: {
      ...pattern,
      [collectionCode]: updatedRows,
    },
  }
  session.casePatternDrafts = { ...(patternsByCase ?? {}), [caseId]: updatedCasePatterns }
  invalidatePreparedEligibilitySnapshot(session, caseId)
  clearEligibilitySubmissionError(session, caseId)
}

/**
 * Combines the DOB-derived age with the current CCQ childcare eligibility facts.
 * @param {EffectFunctionContext} context The Forge effect context
 * @param {ControlledWorkAnswers} [answers] Answers including any just-submitted values
 * @returns {ControlledWorkContext} The derived age and childcare eligibility context
 */
function getControlledWorkContext(
  context: EffectFunctionContext,
  answers?: ControlledWorkAnswers,
): ControlledWorkContext {
  const ageContext = deriveControlledWorkContext(context.getData(CLIENT_DATE_OF_BIRTH_DATA_KEY), new Date())
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (caseId === undefined || session === undefined) return { ...ageContext, eligibleForChildcareCosts: false }

  const savedAnswers = answers ?? readControlledWorkAnswers(session, caseId)
  const casePatterns = getOrMigrateCasePatternDrafts(session, caseId)
  const incomeRows = casePatterns[INCOME_PATTERN_CODE]?.[CONTROLLED_WORK_DATA_KEYS.incomeCollection]
  const partnerIncomeRows = casePatterns[PARTNER_INCOME_PATTERN_CODE]?.[CONTROLLED_WORK_DATA_KEYS.partnerIncomeCollection]

  return {
    ...ageContext,
    eligibleForChildcareCosts: isControlledWorkChildcareEligible(savedAnswers, incomeRows, partnerIncomeRows),
  }
}

function syncForgeAnswers(context: EffectFunctionContext, answers: ControlledWorkAnswers): void {
  for (const code of ALL_ANSWER_CODES) {
    const value = answers[code]
    if (value === undefined) {
      context.clearAnswer(code)
      continue
    }
    context.setAnswer(code, value)
  }
}

function setJourneyData(context: EffectFunctionContext, answers: ControlledWorkAnswers, journeyContext: ControlledWorkContext): void {
  const { steps } = resolveControlledWorkJourney(answers, journeyContext)
  context.setData(CONTROLLED_WORK_DATA_KEYS.applicableSteps, steps)
  context.setData(CONTROLLED_WORK_DATA_KEYS.firstMissingStep, getFirstMissingStep(answers, journeyContext) ?? NO_STEP)
  context.setData(CONTROLLED_WORK_DATA_KEYS.complete, isControlledWorkComplete(answers, journeyContext))
  context.setData(CONTROLLED_WORK_DATA_KEYS.childcareEligible, journeyContext.eligibleForChildcareCosts === true)
}

const CONTROLLED_WORK_REPEATING_COLLECTIONS = [
  [CONTROLLED_WORK_STEP_CODES.dependantIncomeDetails, CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection],
  [CONTROLLED_WORK_STEP_CODES.income, CONTROLLED_WORK_DATA_KEYS.incomeCollection],
  [CONTROLLED_WORK_STEP_CODES.partnerIncome, CONTROLLED_WORK_DATA_KEYS.partnerIncomeCollection],
  [CONTROLLED_WORK_STEP_CODES.benefitDetails, CONTROLLED_WORK_DATA_KEYS.benefitCollection],
  [CONTROLLED_WORK_STEP_CODES.partnerBenefitDetails, CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection],
  [CONTROLLED_WORK_STEP_CODES.additionalPropertyDetails, CONTROLLED_WORK_DATA_KEYS.additionalPropertyCollection],
  [CONTROLLED_WORK_STEP_CODES.partnerAdditionalPropertyDetails, CONTROLLED_WORK_DATA_KEYS.partnerAdditionalPropertyCollection],
  [CONTROLLED_WORK_STEP_CODES.assets, CONTROLLED_WORK_DATA_KEYS.assetBankAccountCollection],
  [CONTROLLED_WORK_STEP_CODES.partnerAssets, CONTROLLED_WORK_DATA_KEYS.partnerAssetBankAccountCollection],
] as const

export type ControlledWorkActiveCollections = Partial<Record<(typeof CONTROLLED_WORK_REPEATING_COLLECTIONS)[number][1], readonly unknown[]>>

export interface ActiveControlledWorkData {
  answers: ControlledWorkAnswers
  collections: ControlledWorkActiveCollections
}

/**
 * Resolves the active answers and repeating collections for a case without mutating its session drafts.
 * @param {FinancialEligibilitySession} session Session containing the case drafts
 * @param {string} caseId Case identifier used to scope both answer and collection drafts
 * @param {ControlledWorkContext} context Facts derived from the case
 * @returns {ActiveControlledWorkData} Only valid answers and collections on the active route
 */
export function resolveActiveControlledWorkData(
  session: FinancialEligibilitySession,
  caseId: string,
  context: ControlledWorkContext,
): ActiveControlledWorkData {
  const { answers } = resolveControlledWorkJourney(readControlledWorkAnswers(session, caseId), context)
  const casePatterns = session.casePatternDrafts?.[caseId] ?? {}
  const collections: ControlledWorkActiveCollections = {}

  for (const [stepCode, collectionCode] of CONTROLLED_WORK_REPEATING_COLLECTIONS) {
    if (!isStepApplicable(stepCode, answers, context)) continue
    const rows = casePatterns[stepCode]?.[collectionCode]
    if (Array.isArray(rows)) {
      Object.assign(collections, { [collectionCode]: [...rows] })
    }
  }

  return { answers, collections }
}

function getDependantIncomeMaximum(answers: ControlledWorkAnswers): number {
  const childCount = answers['child-dependants'] === 'yes' ? Number(answers['child-dependants-count'] ?? 0) : 0
  const adultCount = answers['adult-dependants'] === 'yes' ? Number(answers['adult-dependants-count'] ?? 0) : 0
  return childCount + adultCount
}

function reconcileDependantIncomeDrafts(
  session: FinancialEligibilitySession,
  caseId: string,
  answers: ControlledWorkAnswers,
): boolean {
  const patternsByCase = session.casePatternDrafts
  const casePatterns = patternsByCase?.[caseId]
  const pattern = casePatterns?.[DEPENDANT_INCOME_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection
  const savedRows = pattern?.[collectionCode]
  const detailsApply = answers['dependants-get-income'] === 'yes'

  if (!detailsApply && !savedRows) return false
  if (detailsApply && (!savedRows || savedRows.length <= getDependantIncomeMaximum(answers))) return false

  const updatedPatterns = { ...(patternsByCase ?? {}) }
  const updatedCasePatterns = { ...(casePatterns ?? {}) }
  const updatedPattern = { ...(pattern ?? {}) }

  if (!detailsApply) {
    delete updatedPattern[collectionCode]
    if (Object.keys(updatedPattern).length === 0) delete updatedCasePatterns[DEPENDANT_INCOME_PATTERN_CODE]
    else updatedCasePatterns[DEPENDANT_INCOME_PATTERN_CODE] = updatedPattern
  } else {
    updatedPattern[collectionCode] = (savedRows ?? []).slice(0, getDependantIncomeMaximum(answers))
    updatedCasePatterns[DEPENDANT_INCOME_PATTERN_CODE] = updatedPattern
  }

  updatedPatterns[caseId] = updatedCasePatterns
  session.casePatternDrafts = updatedPatterns
  return true
}

function reconcileIncomeDrafts(
  session: FinancialEligibilitySession,
  caseId: string,
  answers: ControlledWorkAnswers,
): boolean {
  const patternsByCase = session.casePatternDrafts
  const casePatterns = patternsByCase?.[caseId]
  const pattern = casePatterns?.[INCOME_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.incomeCollection

  if (!pattern?.[collectionCode] || answers['employment-status'] === 'in_work') return false

  const updatedPatterns = { ...(patternsByCase ?? {}) }
  const updatedCasePatterns = { ...(casePatterns ?? {}) }
  const updatedPattern = { ...pattern }
  delete updatedPattern[collectionCode]

  if (Object.keys(updatedPattern).length === 0) delete updatedCasePatterns[INCOME_PATTERN_CODE]
  else updatedCasePatterns[INCOME_PATTERN_CODE] = updatedPattern

  updatedPatterns[caseId] = updatedCasePatterns
  session.casePatternDrafts = updatedPatterns
  return true
}

function reconcilePartnerIncomeDrafts(
  session: FinancialEligibilitySession,
  caseId: string,
  answers: ControlledWorkAnswers,
): boolean {
  const patternsByCase = session.casePatternDrafts
  const casePatterns = patternsByCase?.[caseId]
  const pattern = casePatterns?.[PARTNER_INCOME_PATTERN_CODE]
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.partnerIncomeCollection

  if (!pattern?.[collectionCode] || answers['partner-employment-status'] === 'in_work') return false

  const updatedPatterns = { ...(patternsByCase ?? {}) }
  const updatedCasePatterns = { ...(casePatterns ?? {}) }
  const updatedPattern = { ...pattern }
  delete updatedPattern[collectionCode]

  if (Object.keys(updatedPattern).length === 0) delete updatedCasePatterns[PARTNER_INCOME_PATTERN_CODE]
  else updatedCasePatterns[PARTNER_INCOME_PATTERN_CODE] = updatedPattern

  updatedPatterns[caseId] = updatedCasePatterns
  session.casePatternDrafts = updatedPatterns
  return true
}

/**
 * Removes benefit rows when the corresponding benefits answer no longer applies.
 * @param {FinancialEligibilitySession} session The session containing case-scoped pattern drafts
 * @param {string} caseId The current case identifier
 * @param {ControlledWorkAnswers} answers The resolved answers for the current route
 * @param {BenefitDetailsDraftConfig} config The pattern, collection and gate associated with the page
 * @returns {boolean} Whether a saved collection was removed
 */
function reconcileBenefitDetailsDrafts(
  session: FinancialEligibilitySession,
  caseId: string,
  answers: ControlledWorkAnswers,
  { patternCode, collectionCode, gateAnswerCode }: BenefitDetailsDraftConfig,
): boolean {
  const patternsByCase = session.casePatternDrafts
  const casePatterns = patternsByCase?.[caseId]
  const pattern = casePatterns?.[patternCode]

  if (!pattern?.[collectionCode] || answers[gateAnswerCode] === 'yes') return false

  const updatedPatterns = { ...(patternsByCase ?? {}) }
  const updatedCasePatterns = { ...(casePatterns ?? {}) }
  const updatedPattern = { ...pattern }
  delete updatedPattern[collectionCode]

  if (Object.keys(updatedPattern).length === 0) delete updatedCasePatterns[patternCode]
  else updatedCasePatterns[patternCode] = updatedPattern

  updatedPatterns[caseId] = updatedCasePatterns
  session.casePatternDrafts = updatedPatterns
  return true
}

function readSubmittedAnswers(context: EffectFunctionContext, stepCode: ControlledWorkStepCode) {
  const posted = context.getAllPostData()
  const submitted = Object.fromEntries(getStepAnswerCodes(stepCode).map((code) => [code, posted[code]]))
  if (stepCode === CONTROLLED_WORK_STEP_CODES.propertyEntry) {
    return {
      ...submitted,
      house_in_dispute: normalizePropertyEntryDisputeAnswer(posted.house_in_dispute),
    }
  }
  if (stepCode === ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE) {
    return { ...submitted, 'additional-property-details-completed': 'yes' }
  }
  if (stepCode === PARTNER_ADDITIONAL_PROPERTY_DETAILS_PATTERN_CODE) {
    return { ...submitted, 'partner-additional-property-details-completed': 'yes' }
  }
  if (stepCode === ASSETS_PATTERN_CODE) {
    return {
      ...submitted,
      'investments_in_dispute': normalizePropertyEntryDisputeAnswer(posted.investments_in_dispute),
      'valuables_in_dispute': normalizePropertyEntryDisputeAnswer(posted.valuables_in_dispute),
      'assets-completed': 'yes',
    }
  }
  if (stepCode === PARTNER_ASSETS_PATTERN_CODE) {
    return { ...submitted, 'partner-assets-completed': 'yes' }
  }
  if (stepCode === INCOME_PATTERN_CODE) {
    return { ...submitted, 'income-completed': 'yes' }
  }
  if (stepCode === PARTNER_INCOME_PATTERN_CODE) {
    return { ...submitted, 'partner-income-completed': 'yes' }
  }
  if (stepCode === BENEFIT_DETAILS_PATTERN_CODE) {
    return { ...submitted, 'benefit-details-completed': 'yes' }
  }
  if (stepCode === PARTNER_BENEFIT_DETAILS_PATTERN_CODE) {
    return { ...submitted, 'partner-benefit-details-completed': 'yes' }
  }
  if (stepCode === CONTROLLED_WORK_STEP_CODES.otherIncome) {
    return { ...submitted, 'other-income-completed': 'yes' }
  }
  if (stepCode === CONTROLLED_WORK_STEP_CODES.partnerOtherIncome) {
    return { ...submitted, 'partner-other-income-completed': 'yes' }
  }
  return submitted
}

/**
 * Normalises Forge checkbox data so an unchecked dispute box persists as "no".
 * @param {unknown} value The posted checkbox value
 * @returns {'yes' | 'no'} The controlled-work answer
 */
function normalizePropertyEntryDisputeAnswer(value: unknown): 'yes' | 'no' {
  if (Array.isArray(value)) return value.includes('yes') ? 'yes' : 'no'
  return value === 'yes' ? 'yes' : 'no'
}

function prepareIncomeDetails(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const casePatterns = getOrMigrateCasePatternDrafts(session, caseId)
  const pattern = casePatterns[INCOME_PATTERN_CODE] ?? {}
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.incomeCollection
  const savedRows = pattern[collectionCode] as Array<Record<string, unknown>> | undefined
  const rows = savedRows?.length
    ? savedRows
    : [Object.fromEntries(INCOME_FIELD_CODES.map((code) => [code, '']))]

  if (!savedRows?.length) {
    pattern[collectionCode] = rows
    casePatterns[INCOME_PATTERN_CODE] = pattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: casePatterns }
  }

  context.setData(collectionCode, rows)
  rows.forEach((row, index) => {
    for (const code of INCOME_FIELD_CODES) {
      context.setAnswer(`${code}_${index}`, row[code] ?? '')
    }
  })
}

function preparePartnerIncomeDetails(context: EffectFunctionContext): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const casePatterns = getOrMigrateCasePatternDrafts(session, caseId)
  const pattern = casePatterns[PARTNER_INCOME_PATTERN_CODE] ?? {}
  const collectionCode = CONTROLLED_WORK_DATA_KEYS.partnerIncomeCollection
  const savedRows = pattern[collectionCode] as Array<Record<string, unknown>> | undefined
  const rows = savedRows?.length
    ? savedRows
    : [Object.fromEntries(PARTNER_INCOME_FIELD_CODES.map((code) => [code, '']))]

  if (!savedRows?.length) {
    pattern[collectionCode] = rows
    casePatterns[PARTNER_INCOME_PATTERN_CODE] = pattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: casePatterns }
  }

  context.setData(collectionCode, rows)
  rows.forEach((row, index) => {
    for (const code of PARTNER_INCOME_FIELD_CODES) {
      context.setAnswer(`${code}_${index}`, row[code] ?? '')
    }
  })
}

/**
 * Loads saved benefit rows into Forge and initializes the first blank row when needed.
 * @param {EffectFunctionContext} context The Forge page effect context
 * @param {ControlledWorkStepCode} patternCode The page code owning the session rows
 * @param {string} collectionCode The Forge data key for those rows
 * @returns {void}
 */
function prepareBenefitDetailsForStep(
  context: EffectFunctionContext,
  patternCode: ControlledWorkStepCode,
  collectionCode: string,
): void {
  const caseId = getCaseId(context)
  const session = context.getSession() as FinancialEligibilitySession | undefined
  if (!caseId || !session) return

  const casePatterns = getOrMigrateCasePatternDrafts(session, caseId)
  const pattern = casePatterns[patternCode] ?? {}
  const savedRows = pattern[collectionCode] as Array<Record<string, unknown>> | undefined
  const rows = savedRows?.length
    ? savedRows
    : [Object.fromEntries(BENEFIT_DETAILS_FIELD_CODES.map((code) => [code, '']))]

  if (!savedRows?.length) {
    pattern[collectionCode] = rows
    casePatterns[patternCode] = pattern
    session.casePatternDrafts = { ...(session.casePatternDrafts ?? {}), [caseId]: casePatterns }
  }

  context.setData(collectionCode, rows)
  rows.forEach((row, index) => {
    for (const code of BENEFIT_DETAILS_FIELD_CODES) {
      context.setAnswer(`${code}_${index}`, row[code] ?? '')
    }
  })
}

function prepareBenefitDetails(context: EffectFunctionContext): void {
  prepareBenefitDetailsForStep(context, BENEFIT_DETAILS_PATTERN_CODE, CONTROLLED_WORK_DATA_KEYS.benefitCollection)
}

/**
 * Loads the partner's saved benefit rows into Forge.
 * @param {EffectFunctionContext} context The Forge page effect context
 * @returns {void}
 */
function preparePartnerBenefitDetails(context: EffectFunctionContext): void {
  prepareBenefitDetailsForStep(
    context,
    PARTNER_BENEFIT_DETAILS_PATTERN_CODE,
    CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection,
  )
}

export const ControlledWorkEffects: ControlledWorkEffectShape = {
  RestoreControlledWorkAnswers: FinancialEligibilityEffectsRegistry.register(
    'RestoreControlledWorkAnswers',
    () => (context: EffectFunctionContext) => {
      const caseId = getCaseId(context)
      const session = context.getSession() as FinancialEligibilitySession | undefined
      if (!caseId || !session) return

      const saved = readControlledWorkAnswers(session, caseId)
      const journeyContext = getControlledWorkContext(context, saved)
      const { answers, removedCodes } = resolveControlledWorkJourney(saved, journeyContext)
      const dependantIncomeRowsChanged = reconcileDependantIncomeDrafts(session, caseId, answers)
      const incomeRowsChanged = reconcileIncomeDrafts(session, caseId, answers)
      const partnerIncomeRowsChanged = reconcilePartnerIncomeDrafts(session, caseId, answers)
      const benefitRowsChanged = reconcileBenefitDetailsDrafts(
        session,
        caseId,
        answers,
        {
          patternCode: BENEFIT_DETAILS_PATTERN_CODE,
          collectionCode: CONTROLLED_WORK_DATA_KEYS.benefitCollection,
          gateAnswerCode: 'receives-benefits',
        },
      )
      const partnerBenefitRowsChanged = reconcileBenefitDetailsDrafts(
        session,
        caseId,
        answers,
        {
          patternCode: PARTNER_BENEFIT_DETAILS_PATTERN_CODE,
          collectionCode: CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection,
          gateAnswerCode: 'partner-receives-benefits',
        },
      )
      const additionalPropertyRowsChanged = reconcileAdditionalPropertyDetailsDrafts(session, caseId, answers)
      const partnerAdditionalPropertyRowsChanged = reconcilePartnerAdditionalPropertyDetailsDrafts(
        session,
        caseId,
        answers,
      )
      const assetBankAccountRowsChanged = reconcileAssetBankAccountDrafts(session, caseId, answers, journeyContext)
      const partnerAssetBankAccountRowsChanged = reconcilePartnerAssetBankAccountDrafts(
        session,
        caseId,
        answers,
        journeyContext,
      )

      if (
        removedCodes.length > 0 ||
        dependantIncomeRowsChanged ||
        incomeRowsChanged ||
        partnerIncomeRowsChanged ||
        benefitRowsChanged ||
        partnerBenefitRowsChanged ||
        additionalPropertyRowsChanged ||
        partnerAdditionalPropertyRowsChanged ||
        assetBankAccountRowsChanged ||
        partnerAssetBankAccountRowsChanged
      ) {
        writeControlledWorkAnswers(session, caseId, answers)
        invalidatePreparedEligibilitySnapshot(session, caseId)
      }
      syncForgeAnswers(context, answers)
      setJourneyData(context, answers, journeyContext)
    },
  ),

  SaveControlledWorkAnswers: FinancialEligibilityEffectsRegistry.register(
    'SaveControlledWorkAnswers',
    () => (context: EffectFunctionContext, stepCode: ControlledWorkStepCode) => {
      const caseId = getCaseId(context)
      const session = context.getSession() as FinancialEligibilitySession | undefined
      if (!caseId || !session) return

      const saved = readControlledWorkAnswers(session, caseId)
      const submitted = readSubmittedAnswers(context, stepCode)
      const merged = mergeControlledWorkAnswers(
        saved,
        submitted,
      )
      if (
        stepCode === CONTROLLED_WORK_STEP_CODES.additionalProperty &&
        saved['additional-property-owned'] !== merged['additional-property-owned']
      ) {
        delete merged['additional-property-details-completed']
      }
      if (
        stepCode === CONTROLLED_WORK_STEP_CODES.partnerAdditionalProperty &&
        saved['partner-additional-property-owned'] !== merged['partner-additional-property-owned']
      ) {
        delete merged['partner-additional-property-details-completed']
      }
      if (stepCode === CONTROLLED_WORK_STEP_CODES.applicant && saved.partner !== merged.partner) {
        delete merged['property-owned']
      }
      const journeyContext = getControlledWorkContext(context, merged)
      const { answers } = resolveControlledWorkJourney(merged, journeyContext)
      reconcileDependantIncomeDrafts(session, caseId, answers)
      reconcileIncomeDrafts(session, caseId, answers)
      reconcilePartnerIncomeDrafts(session, caseId, answers)
      reconcileBenefitDetailsDrafts(
        session,
        caseId,
        answers,
        {
          patternCode: BENEFIT_DETAILS_PATTERN_CODE,
          collectionCode: CONTROLLED_WORK_DATA_KEYS.benefitCollection,
          gateAnswerCode: 'receives-benefits',
        },
      )
      reconcileAdditionalPropertyDetailsDrafts(session, caseId, answers)
      reconcilePartnerAdditionalPropertyDetailsDrafts(session, caseId, answers)
      reconcileAssetBankAccountDrafts(session, caseId, answers, journeyContext)
      reconcilePartnerAssetBankAccountDrafts(session, caseId, answers, journeyContext)
      reconcileBenefitDetailsDrafts(
        session,
        caseId,
        answers,
        {
          patternCode: PARTNER_BENEFIT_DETAILS_PATTERN_CODE,
          collectionCode: CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection,
          gateAnswerCode: 'partner-receives-benefits',
        },
      )

      writeControlledWorkAnswers(session, caseId, answers)
      invalidatePreparedEligibilitySnapshot(session, caseId)
      clearEligibilitySubmissionError(session, caseId)
      syncForgeAnswers(context, answers)
      setJourneyData(context, answers, journeyContext)
      context.setData(CONTROLLED_WORK_DATA_KEYS.nextStep, getNextStep(stepCode, answers, journeyContext) ?? NO_STEP)
    },
  ),

  PrepareDependantIncomeDetails: FinancialEligibilityEffectsRegistry.register(
    'PrepareDependantIncomeDetails',
    () => (context: EffectFunctionContext) => {
      const caseId = getCaseId(context)
      const session = context.getSession() as FinancialEligibilitySession | undefined
      if (!caseId || !session) return

      const answers = resolveControlledWorkJourney(
        readControlledWorkAnswers(session, caseId),
        getControlledWorkContext(context),
      ).answers
      const maximum = getDependantIncomeMaximum(answers)
      context.setData(CONTROLLED_WORK_DATA_KEYS.dependantIncomeMaxRows, maximum)
      if (maximum < 1) return

      const patternDrafts = getOrMigrateCasePatternDrafts(session, caseId)
      const pattern = patternDrafts[DEPENDANT_INCOME_PATTERN_CODE] ?? {}
      const collectionCode = CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection
      const savedRows = pattern[collectionCode] as Array<Record<string, unknown>> | undefined
      const rows = savedRows?.length
        ? savedRows.slice(0, maximum)
        : [{ amount: '', frequency: '' }]

      if (savedRows && rows.length !== savedRows.length) {
        pattern[collectionCode] = rows
        patternDrafts[DEPENDANT_INCOME_PATTERN_CODE] = pattern
        invalidatePreparedEligibilitySnapshot(session, caseId)
      }

      context.setData(collectionCode, rows)
      rows.forEach((row, index) => {
        for (const code of DEPENDANT_INCOME_FIELD_CODES) {
          context.setAnswer(`${code}_${index}`, row[code] ?? '')
        }
      })
    },
  ),

  PrepareIncomeDetails: FinancialEligibilityEffectsRegistry.register(
    'PrepareIncomeDetails',
    () => prepareIncomeDetails,
  ),

  PreparePartnerIncomeDetails: FinancialEligibilityEffectsRegistry.register(
    'PreparePartnerIncomeDetails',
    () => preparePartnerIncomeDetails,
  ),

  PrepareBenefitDetails: FinancialEligibilityEffectsRegistry.register(
    'PrepareBenefitDetails',
    () => prepareBenefitDetails,
  ),

  PreparePartnerBenefitDetails: FinancialEligibilityEffectsRegistry.register(
    'PreparePartnerBenefitDetails',
    () => preparePartnerBenefitDetails,
  ),

  PrepareAdditionalPropertyDetails: FinancialEligibilityEffectsRegistry.register(
    'PrepareAdditionalPropertyDetails',
    () => prepareAdditionalPropertyDetails,
  ),

  NormalizeAdditionalPropertyDetails: FinancialEligibilityEffectsRegistry.register(
    'NormalizeAdditionalPropertyDetails',
    () => normalizeAdditionalPropertyDetails,
  ),

  PreparePartnerAdditionalPropertyDetails: FinancialEligibilityEffectsRegistry.register(
    'PreparePartnerAdditionalPropertyDetails',
    () => preparePartnerAdditionalPropertyDetails,
  ),

  NormalizePartnerAdditionalPropertyDetails: FinancialEligibilityEffectsRegistry.register(
    'NormalizePartnerAdditionalPropertyDetails',
    () => normalizePartnerAdditionalPropertyDetails,
  ),

  PrepareAssets: FinancialEligibilityEffectsRegistry.register(
    'PrepareAssets',
    () => prepareAssets,
  ),

  PreparePartnerAssets: FinancialEligibilityEffectsRegistry.register(
    'PreparePartnerAssets',
    () => preparePartnerAssets,
  ),

  NormalizeAssets: FinancialEligibilityEffectsRegistry.register(
    'NormalizeAssets',
    () => normalizeAssets,
  ),
}
