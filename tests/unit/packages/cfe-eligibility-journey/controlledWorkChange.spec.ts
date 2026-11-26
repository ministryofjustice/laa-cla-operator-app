import { expect } from 'chai'
import type { EffectFunctionContext } from '@ministryofjustice/hmpps-forge/core/authoring'
import { FinancialEligibilityEffectsRegistry } from '#packages/cfe-eligibility-journey/src/effects.js'
import {
  CHANGE_ANSWER_GROUPS,
  getChangeAnswerNextStep,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkChange.js'
import { reconcileControlledWorkAnswers } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkReconcile.js'
import {
  CONTROLLED_WORK_DATA_KEYS,
  ControlledWorkEffects,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  clearControlledWorkAnswers,
  endControlledWorkChange,
  getControlledWorkChangeNextStep,
  isControlledWorkChangeActive,
  readControlledWorkAnswers,
  setControlledWorkChangeNextStep,
  startControlledWorkChange,
  writeControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSession.js'
import {
  findMissingSteps,
  getApplicableSteps,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_INCOMPLETE_STEP_REDIRECTS,
  CONTROLLED_WORK_CHANGE_STEP_REDIRECTS,
  controlledWorkIncompleteStep,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { checkAnswersStep } from '#packages/cfe-eligibility-journey/src/checkAnswersPage/checkAnswersStep.js'
import {
  CONTROLLED_WORK_STEP_CODE_LIST,
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { CLIENT_DATE_OF_BIRTH_DATA_KEY } from '#packages/cfe-eligibility-journey/src/clientAge.js'
import type { Deps } from '#packages/cfe-eligibility-journey/src/api.js'
import type { FinancialEligibilitySession } from '#packages/cfe-eligibility-journey/src/context.type.js'
import {
  HOUSING_COST_ANSWERS,
  NO_ASSETS,
  PASSPORTED_CLIENT,
  PROPERTY_ENTRY_ANSWERS,
  SINGLE_CLIENT,
  SINGLE_HOMEOWNER,
  without,
} from './support/changeAnswersJourney.js'

const ADULT: ControlledWorkContext = { isUnder18: false }
const MINOR: ControlledWorkContext = { isUnder18: true }
const CASE_ID = 'CASE1'
const ADULT_DOB = '1990-01-01'

const registry = FinancialEligibilityEffectsRegistry.build({} as Deps)
const newSession = (): FinancialEligibilitySession => ({ financialEligibilityDrafts: {} }) as FinancialEligibilitySession

/**
 * Builds the subset of the Forge effect context the controlled-work effects use.
 * @param {FinancialEligibilitySession} session The session
 * @param {Record<string, unknown>} [posted] Posted form values
 * @param {Record<string, string>} [query] Query string values
 * @returns {{ context: EffectFunctionContext, data: Map<string, unknown> }} The context and its Forge Data
 */
function fakeContext(session: FinancialEligibilitySession, posted: Record<string, unknown> = {}, query: Record<string, string> = {}) {
  const data = new Map<string, unknown>([[CLIENT_DATE_OF_BIRTH_DATA_KEY, ADULT_DOB]])
  const answers = new Map<string, unknown>()
  const context = {
    getRequestParam: (name: string) => (name === 'caseId' ? CASE_ID : undefined),
    getQueryParam: (name: string) => query[name],
    getSession: () => session,
    getData: (key: string) => data.get(key),
    setData: (key: string, value: unknown) => data.set(key, value),
    setAnswer: (code: string, value: unknown) => answers.set(code, value),
    clearAnswer: (code: string) => answers.delete(code),
    getAnswer: (code: string) => answers.get(code),
    getPostData: (name: string) => posted[name],
    getAllPostData: () => posted,
  } as unknown as EffectFunctionContext
  return { context, data }
}

describe('Controlled-work change-answer routing rules', () => {
  describe('change groups', () => {
    it('place every controlled-work step in exactly one group', () => {
      const grouped = CHANGE_ANSWER_GROUPS.flat()

      expect([...grouped].sort()).to.deep.equal([...CONTROLLED_WORK_STEP_CODE_LIST].sort())
      expect(new Set(grouped).size).to.equal(grouped.length)
    })
  })

  describe('getChangeAnswerNextStep', () => {
    it('returns to check answers after the last applicable step in a group', () => {
      expect(getChangeAnswerNextStep(STEPS.outgoings, SINGLE_CLIENT, ADULT)).to.equal(undefined)
      expect(getChangeAnswerNextStep(STEPS.housingCosts, SINGLE_CLIENT, ADULT)).to.equal(undefined)
      expect(getChangeAnswerNextStep(STEPS.immigrationOrAsylum, SINGLE_CLIENT, ADULT)).to.equal(undefined)
    })

    it('walks the rest of the group when it has applicable steps left, even if they are answered', () => {
      expect(getChangeAnswerNextStep(STEPS.property, SINGLE_HOMEOWNER, ADULT)).to.equal(STEPS.propertyEntry)
      expect(
        getChangeAnswerNextStep(
          STEPS.immigrationOrAsylum,
          { ...SINGLE_CLIENT, 'immigration-or-asylum': 'yes', 'immigration-or-asylum-type': 'asylum', 'asylum-support': 'no' },
          ADULT,
        ),
      ).to.equal(STEPS.immigrationOrAsylumType)
    })

    it('goes to the first later step that has no answer before anything else', () => {
      const answers = without(SINGLE_CLIENT, 'property-owned', ...Object.keys(HOUSING_COST_ANSWERS))

      expect(getChangeAnswerNextStep(STEPS.employmentStatus, answers, ADULT)).to.equal(STEPS.property)
      expect(getChangeAnswerNextStep(STEPS.applicant, { ...answers, partner: 'yes' }, ADULT)).to.equal(STEPS.partnerDetails)
    })

    it('never goes backwards to an earlier unanswered step', () => {
      const answers = without(SINGLE_CLIENT, 'employment-status')

      expect(getChangeAnswerNextStep(STEPS.outgoings, answers, ADULT)).to.equal(undefined)
    })

    it('shows how-to-aggregate after aggregated means Yes, ahead of other missing steps', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        'controlled-legal-representation': 'no',
        'aggregated-means': 'yes',
      }

      expect(getChangeAnswerNextStep(STEPS.aggregatedMeans, answers, MINOR)).to.equal(STEPS.howToAggregate)
      expect(getChangeAnswerNextStep(STEPS.howToAggregate, answers, MINOR)).to.equal(STEPS.applicant)
    })

    it('shows regular income after aggregated means No, even if it is already answered', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        'controlled-legal-representation': 'no',
        'aggregated-means': 'no',
        'regular-income': 'yes',
      }

      expect(getChangeAnswerNextStep(STEPS.aggregatedMeans, answers, MINOR)).to.equal(STEPS.regularIncome)
    })

    it('always shows property entry after shared-ownership housing costs', () => {
      const answers: ControlledWorkAnswers = {
        ...without(SINGLE_CLIENT, ...Object.keys(HOUSING_COST_ANSWERS)),
        'property-owned': 'shared_ownership',
        'property-landlord': 'yes',
        rent: '100',
        shared_ownership_mortgage: '100',
        combined_frequency: 'monthly',
        housing_benefit_relevant: 'no',
        ...PROPERTY_ENTRY_ANSWERS,
      }

      expect(getChangeAnswerNextStep(STEPS.sharedOwnershipHousingCosts, answers, ADULT)).to.equal(STEPS.propertyEntry)
    })

    it('only ever names a later, applicable step', () => {
      const answerSets: ControlledWorkAnswers[] = [
        SINGLE_CLIENT,
        SINGLE_HOMEOWNER,
        PASSPORTED_CLIENT,
        without(SINGLE_CLIENT, 'property-owned', ...Object.keys(HOUSING_COST_ANSWERS)),
        { ...SINGLE_CLIENT, partner: 'yes' },
        { ...SINGLE_CLIENT, 'employment-status': 'in_work' },
        { ...SINGLE_CLIENT, 'immigration-or-asylum': 'yes' },
        {},
      ]

      for (const answers of answerSets) {
        const { answers: resolved } = resolveControlledWorkJourney(answers, ADULT)
        const applicable = getApplicableSteps(resolved, ADULT)
        for (const stepCode of CONTROLLED_WORK_STEP_CODE_LIST) {
          const next = getChangeAnswerNextStep(stepCode, resolved, ADULT)
          if (next === undefined) continue
          expect(applicable, `${stepCode} -> ${next}`).to.include(next)
          expect(CONTROLLED_WORK_STEP_CODE_LIST.indexOf(next), `${stepCode} -> ${next}`).to.be.greaterThan(
            CONTROLLED_WORK_STEP_CODE_LIST.indexOf(stepCode),
          )
        }
      }
    })

    it('cannot loop: following it from any step reaches check answers', () => {
      const answers: ControlledWorkAnswers = { ...SINGLE_CLIENT, partner: 'yes' }
      const { answers: resolved } = resolveControlledWorkJourney(answers, ADULT)

      for (const start of CONTROLLED_WORK_STEP_CODE_LIST) {
        let step: string | undefined = start
        const seen = new Set<string>()
        while (step !== undefined) {
          expect(seen.has(step), `loop at ${step} from ${start}`).to.equal(false)
          seen.add(step)
          step = getChangeAnswerNextStep(step as (typeof CONTROLLED_WORK_STEP_CODE_LIST)[number], resolved, ADULT)
        }
      }
    })
  })

  describe('reconcileControlledWorkAnswers', () => {
    it('deletes answers as soon as their step stops applying when not in a change loop', () => {
      const saved: ControlledWorkAnswers = { ...SINGLE_CLIENT, 'immigration-or-asylum': 'yes' }

      const result = reconcileControlledWorkAnswers(saved, ADULT, false)

      expect(result.retained).to.deep.equal({})
      expect(result.removedCodes).to.include.members(['partner', 'housing_payments', 'investments_relevant'])
    })

    it('keeps financial answers inactive while a new matter question is unanswered', () => {
      const saved: ControlledWorkAnswers = { ...SINGLE_CLIENT, 'immigration-or-asylum': 'yes' }

      const result = reconcileControlledWorkAnswers(saved, ADULT, true)

      expect(result.answers).to.deep.equal({ 'immigration-or-asylum': 'yes' })
      expect(result.retained).to.include({ partner: 'no', housing_payments: '500', 'assets-completed': 'yes' })
      expect(result.removedCodes).to.deep.equal([])
    })

    it('deletes them once the answers settle that the financial pages do not apply', () => {
      const saved: ControlledWorkAnswers = {
        ...SINGLE_CLIENT,
        'immigration-or-asylum': 'yes',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'yes',
      }

      const result = reconcileControlledWorkAnswers(saved, ADULT, true)

      expect(result.retained).to.deep.equal({})
      expect(result.removedCodes).to.include.members(['partner', 'housing_payments', 'investments_relevant'])
    })

    it('keeps assets while a newly required property page is open, and deletes the old property details now', () => {
      const saved: ControlledWorkAnswers = {
        ...SINGLE_HOMEOWNER,
        'property-owned': 'none',
      }

      const result = reconcileControlledWorkAnswers(saved, ADULT, true)

      expect(result.removedCodes).to.include.members(Object.keys(PROPERTY_ENTRY_ANSWERS))
      expect(result.retained).to.include(NO_ASSETS)
      expect(result.answers).to.not.have.any.keys(...Object.keys(NO_ASSETS))
    })

    it('never returns retained answers as active answers', () => {
      const saved: ControlledWorkAnswers = { ...SINGLE_CLIENT, 'immigration-or-asylum': 'yes' }

      const { answers, retained } = reconcileControlledWorkAnswers(saved, ADULT, true)

      expect(Object.keys(answers).filter((code) => code in retained)).to.deep.equal([])
      expect(findMissingSteps(answers, ADULT)[0]?.stepCode).to.equal(STEPS.immigrationOrAsylumType)
    })
  })

  describe('change loop session state', () => {
    it('starts, records the next step, and ends per case', () => {
      const session = newSession()

      startControlledWorkChange(session, CASE_ID)
      startControlledWorkChange(session, 'CASE2')
      setControlledWorkChangeNextStep(session, CASE_ID, STEPS.propertyEntry)

      expect(isControlledWorkChangeActive(session, CASE_ID)).to.equal(true)
      expect(getControlledWorkChangeNextStep(session, CASE_ID)).to.equal(STEPS.propertyEntry)
      expect(getControlledWorkChangeNextStep(session, 'CASE2')).to.equal(undefined)

      endControlledWorkChange(session, CASE_ID)

      expect(isControlledWorkChangeActive(session, CASE_ID)).to.equal(false)
      expect(isControlledWorkChangeActive(session, 'CASE2')).to.equal(true)
    })

    it('reassigns the session property so modification-tracking stores see the change', () => {
      const session = newSession()
      startControlledWorkChange(session, CASE_ID)
      const before = session.controlledWorkChangeLoops

      setControlledWorkChangeNextStep(session, CASE_ID, STEPS.assets)

      expect(session.controlledWorkChangeLoops).to.not.equal(before)
    })

    it('does not record a next step outside a loop, and a restarted loop forgets the old one', () => {
      const session = newSession()
      setControlledWorkChangeNextStep(session, CASE_ID, STEPS.assets)
      expect(isControlledWorkChangeActive(session, CASE_ID)).to.equal(false)

      startControlledWorkChange(session, CASE_ID)
      setControlledWorkChangeNextStep(session, CASE_ID, STEPS.assets)
      startControlledWorkChange(session, CASE_ID)

      expect(getControlledWorkChangeNextStep(session, CASE_ID)).to.equal(undefined)
    })

    it('ends the loop when the case’s answers are cleared, without touching other cases', () => {
      const session = newSession()
      writeControlledWorkAnswers(session, CASE_ID, SINGLE_CLIENT)
      startControlledWorkChange(session, CASE_ID)
      startControlledWorkChange(session, 'CASE2')

      clearControlledWorkAnswers(session, CASE_ID)

      expect(isControlledWorkChangeActive(session, CASE_ID)).to.equal(false)
      expect(isControlledWorkChangeActive(session, 'CASE2')).to.equal(true)
      expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({})
    })
  })

  describe('effects', () => {
    it('only starts a loop for ?change=true', () => {
      const session = newSession()

      registry.StartControlledWorkChange.evaluate(fakeContext(session, {}, { change: 'false' }).context)
      expect(isControlledWorkChangeActive(session, CASE_ID)).to.equal(false)

      registry.StartControlledWorkChange.evaluate(fakeContext(session, {}, { change: 'true' }).context)
      expect(isControlledWorkChangeActive(session, CASE_ID)).to.equal(true)
    })

    it('routes by the change rules and records the step for the hub while a loop is active', () => {
      const session = newSession()
      writeControlledWorkAnswers(session, CASE_ID, SINGLE_HOMEOWNER)
      startControlledWorkChange(session, CASE_ID)

      const request = fakeContext(session, { 'property-owned': 'outright' })
      registry.SaveControlledWorkAnswers.evaluate(request.context, STEPS.property)

      expect(request.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.propertyEntry)
      expect(request.data.get(CONTROLLED_WORK_DATA_KEYS.changeNextStep)).to.equal(STEPS.propertyEntry)
      expect(getControlledWorkChangeNextStep(session, CASE_ID)).to.equal(STEPS.propertyEntry)
    })

    it('uses the ordinary next step and records nothing outside a loop', () => {
      const session = newSession()
      writeControlledWorkAnswers(session, CASE_ID, SINGLE_HOMEOWNER)

      const request = fakeContext(session, { 'property-owned': 'outright' })
      registry.SaveControlledWorkAnswers.evaluate(request.context, STEPS.property)

      expect(request.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.propertyEntry)
      expect(request.data.get(CONTROLLED_WORK_DATA_KEYS.changeNextStep)).to.equal('')
      expect(session.controlledWorkChangeLoops).to.equal(undefined)
    })

    it('exposes the recorded step as Data only while it still applies', () => {
      const session = newSession()
      writeControlledWorkAnswers(session, CASE_ID, SINGLE_HOMEOWNER)
      startControlledWorkChange(session, CASE_ID)
      setControlledWorkChangeNextStep(session, CASE_ID, STEPS.propertyEntry)

      const applicable = fakeContext(session)
      registry.RestoreControlledWorkAnswers.evaluate(applicable.context)
      expect(applicable.data.get(CONTROLLED_WORK_DATA_KEYS.changeNextStep)).to.equal(STEPS.propertyEntry)

      setControlledWorkChangeNextStep(session, CASE_ID, STEPS.partnerAssets)
      const inapplicable = fakeContext(session)
      registry.RestoreControlledWorkAnswers.evaluate(inapplicable.context)
      expect(inapplicable.data.get(CONTROLLED_WORK_DATA_KEYS.changeNextStep)).to.equal('')
    })

    it('keeps retained answers across requests while a question is pending, and drops them once settled', () => {
      const session = newSession()
      writeControlledWorkAnswers(session, CASE_ID, SINGLE_CLIENT)
      startControlledWorkChange(session, CASE_ID)

      registry.SaveControlledWorkAnswers.evaluate(
        fakeContext(session, { 'immigration-or-asylum': 'yes' }).context,
        STEPS.immigrationOrAsylum,
      )
      registry.RestoreControlledWorkAnswers.evaluate(fakeContext(session).context)
      expect(readControlledWorkAnswers(session, CASE_ID)).to.include({ partner: 'no', housing_payments: '500' })

      registry.SaveControlledWorkAnswers.evaluate(
        fakeContext(session, { 'immigration-or-asylum-type': 'asylum' }).context,
        STEPS.immigrationOrAsylumType,
      )
      registry.SaveControlledWorkAnswers.evaluate(
        fakeContext(session, { 'asylum-support': 'yes' }).context,
        STEPS.asylumSupport,
      )

      expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
        'immigration-or-asylum': 'yes',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'yes',
      })
    })

    it('keeps repeating rows of steps that may still apply, and removes the rows of steps that no longer can', () => {
      const session = newSession()
      writeControlledWorkAnswers(session, CASE_ID, SINGLE_CLIENT)
      session.casePatternDrafts = {
        [CASE_ID]: {
          [STEPS.assets]: { bank_accounts: [{ amount: '10' }] },
          [STEPS.partnerAssets]: { partner_bank_accounts: [{ amount: '20' }] },
        },
      }
      startControlledWorkChange(session, CASE_ID)

      registry.SaveControlledWorkAnswers.evaluate(
        fakeContext(session, { 'immigration-or-asylum': 'yes' }).context,
        STEPS.immigrationOrAsylum,
      )
      expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.assets]).to.deep.equal({ bank_accounts: [{ amount: '10' }] })

      registry.SaveControlledWorkAnswers.evaluate(
        fakeContext(session, { 'immigration-or-asylum-type': 'asylum' }).context,
        STEPS.immigrationOrAsylumType,
      )
      registry.SaveControlledWorkAnswers.evaluate(
        fakeContext(session, { 'asylum-support': 'yes' }).context,
        STEPS.asylumSupport,
      )

      expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.assets]).to.equal(undefined)
      expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.partnerAssets]).to.equal(undefined)
    })

    it('registers the change effects', () => {
      expect(ControlledWorkEffects.StartControlledWorkChange).to.be.a('function')
      expect(ControlledWorkEffects.EndControlledWorkChange).to.be.a('function')
    })
  })

  describe('incomplete hub', () => {
    it('sends unanswered questions first, then the loop’s next step, then the complete page', () => {
      const redirects = (controlledWorkIncompleteStep.onAccess ?? []).flatMap((hook) => JSON.stringify(hook))
      const text = redirects.join('')
      const missing = text.indexOf(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
      const change = text.indexOf(CONTROLLED_WORK_DATA_KEYS.changeNextStep)
      const complete = text.indexOf(CONTROLLED_WORK_DATA_KEYS.complete)

      expect(missing).to.be.greaterThan(-1)
      expect(change).to.be.greaterThan(missing)
      expect(complete).to.be.greaterThan(change)
      expect(CONTROLLED_WORK_CHANGE_STEP_REDIRECTS).to.have.length(CONTROLLED_WORK_INCOMPLETE_STEP_REDIRECTS.length)
    })

    it('ends the change loop on the complete page', () => {
      expect(JSON.stringify(checkAnswersStep.onAccess)).to.include('EndControlledWorkChange')
    })
  })
})
