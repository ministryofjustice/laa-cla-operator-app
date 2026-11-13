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
  dependantIncomeCollection: 'dependant_incomes',
  dependantIncomeMaxRows: 'controlledWorkDependantIncomeMaxRows',
} as const

export interface ControlledWorkEffectShape {
  /** Loads the case's saved controlled-work answers into Forge, removing any that no longer apply */
  RestoreControlledWorkAnswers: () => EffectFunctionExpr
  /** Saves the step's posted answers, removes answers made irrelevant by the change and sets the next step */
  SaveControlledWorkAnswers: (stepCode: ControlledWorkStepCode) => EffectFunctionExpr
  /** Loads repeating dependant-income rows and limits them to the currently selected dependants */
  PrepareDependantIncomeDetails: () => EffectFunctionExpr
}

const ALL_ANSWER_CODES = [...CONTROLLED_WORK_ANSWER_CODES]
const NO_STEP = ''
const DEPENDANT_INCOME_PATTERN_CODE = CONTROLLED_WORK_STEP_CODES.dependantIncomeDetails
const DEPENDANT_INCOME_FIELD_CODES = ['amount', 'frequency']

function getCaseId(context: EffectFunctionContext): string | undefined {
  const caseId = context.getRequestParam('caseId')
  return typeof caseId === 'string' && caseId.length > 0 ? caseId : undefined
}

function getControlledWorkContext(context: EffectFunctionContext): ControlledWorkContext {
  return deriveControlledWorkContext(context.getData(CLIENT_DATE_OF_BIRTH_DATA_KEY), new Date())
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

function readSubmittedAnswers(context: EffectFunctionContext, stepCode: ControlledWorkStepCode) {
  const posted = context.getAllPostData()
  return Object.fromEntries(getStepAnswerCodes(stepCode).map((code) => [code, posted[code]]))
}

export const ControlledWorkEffects: ControlledWorkEffectShape = {
  RestoreControlledWorkAnswers: FinancialEligibilityEffectsRegistry.register(
    'RestoreControlledWorkAnswers',
    () => (context: EffectFunctionContext) => {
      const caseId = getCaseId(context)
      const session = context.getSession() as FinancialEligibilitySession | undefined
      if (!caseId || !session) return

      const journeyContext = getControlledWorkContext(context)
      const saved = readControlledWorkAnswers(session, caseId)
      const { answers, removedCodes } = resolveControlledWorkJourney(saved, journeyContext)
      const dependantIncomeRowsChanged = reconcileDependantIncomeDrafts(session, caseId, answers)

      if (removedCodes.length > 0 || dependantIncomeRowsChanged) {
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

      const journeyContext = getControlledWorkContext(context)
      const merged = mergeControlledWorkAnswers(
        readControlledWorkAnswers(session, caseId),
        readSubmittedAnswers(context, stepCode),
      )
      const { answers } = resolveControlledWorkJourney(merged, journeyContext)
      reconcileDependantIncomeDrafts(session, caseId, answers)

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
}
