import type { EffectFunctionContext, EffectFunctionExpr } from '@ministryofjustice/hmpps-forge/core/authoring'
import type { FinancialEligibilitySession } from '../context.type.js'
import { CLIENT_DATE_OF_BIRTH_DATA_KEY } from '../clientAge.js'
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
  CONTROLLED_WORK_ANSWER_OPTIONS,
  type ControlledWorkAnswerCode,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
  type ControlledWorkStepCode,
} from './controlledWorkTypes.js'

/** Forge Data keys populated for steps and redirects. Empty string means "none". */
export const CONTROLLED_WORK_DATA_KEYS = {
  applicableSteps: 'controlledWorkApplicableSteps',
  nextStep: 'controlledWorkNextStep',
  firstMissingStep: 'controlledWorkFirstMissingStep',
} as const

export interface ControlledWorkEffectShape {
  /** Loads the case's saved controlled-work answers into Forge, removing any that no longer apply */
  RestoreControlledWorkAnswers: () => EffectFunctionExpr
  /** Saves the step's posted answers, removes answers made irrelevant by the change and sets the next step */
  SaveControlledWorkAnswers: (stepCode: ControlledWorkStepCode) => EffectFunctionExpr
}

const ALL_ANSWER_CODES = Object.keys(CONTROLLED_WORK_ANSWER_OPTIONS) as ControlledWorkAnswerCode[]
const NO_STEP = ''

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

      if (removedCodes.length > 0) {
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

      writeControlledWorkAnswers(session, caseId, answers)
      invalidatePreparedEligibilitySnapshot(session, caseId)
      clearEligibilitySubmissionError(session, caseId)
      syncForgeAnswers(context, answers)
      setJourneyData(context, answers, journeyContext)
      context.setData(CONTROLLED_WORK_DATA_KEYS.nextStep, getNextStep(stepCode, answers, journeyContext) ?? NO_STEP)
    },
  ),
}
