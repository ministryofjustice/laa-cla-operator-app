import { expect } from 'chai'
import type { EffectFunctionContext } from '@ministryofjustice/hmpps-forge/core/authoring'
import { FinancialEligibilityEffectsRegistry } from '#packages/cfe-eligibility-journey/src/effects.js'
import '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { readControlledWorkAnswers } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSession.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { CLIENT_DATE_OF_BIRTH_DATA_KEY } from '#packages/cfe-eligibility-journey/src/clientAge.js'
import type { Deps } from '#packages/cfe-eligibility-journey/src/api.js'
import type { FinancialEligibilitySession } from '#packages/cfe-eligibility-journey/src/context.type.js'

const CASE_ID = 'CASE1'
const ADULT_DOB = '1990-01-01'
const MINOR_DOB = `${new Date().getFullYear() - 10}-01-01`

const registry = FinancialEligibilityEffectsRegistry.build({} as Deps)

interface FakeContextOptions {
  session: FinancialEligibilitySession
  dateOfBirth: string | null
  posted?: Record<string, unknown>
  caseId?: string
}

/**
 * Builds the subset of the Forge effect context the controlled-work effects use.
 * @param {FakeContextOptions} options Session, DOB and posted values for the simulated request
 * @returns {{ context: EffectFunctionContext, answers: Map<string, unknown>, data: Map<string, unknown> }} The context and its state
 */
function fakeContext({ session, dateOfBirth, posted = {}, caseId = CASE_ID }: FakeContextOptions) {
  const answers = new Map<string, unknown>()
  const data = new Map<string, unknown>([[CLIENT_DATE_OF_BIRTH_DATA_KEY, dateOfBirth]])
  const context = {
    getRequestParam: (name: string) => (name === 'caseId' ? caseId : undefined),
    getSession: () => session,
    getData: (key: string) => data.get(key),
    setData: (key: string, value: unknown) => data.set(key, value),
    setAnswer: (code: string, value: unknown) => answers.set(code, value),
    clearAnswer: (code: string) => answers.delete(code),
    getAllPostData: () => posted,
  } as unknown as EffectFunctionContext
  return { context, answers, data }
}

const restore = (session: FinancialEligibilitySession, dateOfBirth: string | null) => {
  const request = fakeContext({ session, dateOfBirth })
  registry.RestoreControlledWorkAnswers.evaluate(request.context)
  return request
}

const save = (session: FinancialEligibilitySession, dateOfBirth: string | null, stepCode: string, posted: Record<string, unknown>) => {
  const request = fakeContext({ session, dateOfBirth, posted })
  registry.SaveControlledWorkAnswers.evaluate(request.context, stepCode)
  return request
}

const newSession = (): FinancialEligibilitySession => ({ financialEligibilityDrafts: {} }) as FinancialEligibilitySession

describe('Controlled-work effects', () => {
  it('saves a posted answer, sets Forge answers and returns the next step', () => {
    const session = newSession()
    const { answers, data } = save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({ 'immigration-or-asylum': 'yes' })
    expect(answers.get('immigration-or-asylum')).to.equal('yes')
    expect(data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.immigrationOrAsylumType)
    expect(data.get(CONTROLLED_WORK_DATA_KEYS.applicableSteps)).to.deep.equal([
      STEPS.immigrationOrAsylum,
      STEPS.immigrationOrAsylumType,
      STEPS.asylumSupport,
    ])
    expect(data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal(STEPS.immigrationOrAsylumType)
  })

  it('only saves the answers that belong to the submitted step', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no', partner: 'yes', unrelated: 'x' })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({ 'immigration-or-asylum': 'no' })
  })

  it('restores saved answers on a later request and when revisiting a page', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })

    const { answers, data } = restore(session, ADULT_DOB)
    expect(Object.fromEntries(answers)).to.deep.equal({ 'immigration-or-asylum': 'no', partner: 'yes', passporting: 'no' })
    expect(data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal(STEPS.dependantDetails)
  })

  it('preserves client answers and clears only partner answers when the partner answer changes to no', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'in_work' })
    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'unemployed' })

    const changed = save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      partner: 'no',
      passporting: 'no',
      'employment-status': 'in_work',
    })
    expect(changed.answers.get('employment-status')).to.equal('in_work')
    expect(changed.answers.has('partner-employment-status')).to.equal(false)
  })

  it('clears income answers when passporting becomes yes and requires them again when it becomes no', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'in_work' })
    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'unemployed' })

    const passported = save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      partner: 'yes',
      passporting: 'yes',
    })
    expect(passported.answers.has('employment-status')).to.equal(false)
    expect(passported.answers.has('partner-employment-status')).to.equal(false)

    const notPassported = save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })
    expect(notPassported.answers.get('partner')).to.equal('yes')
    expect(notPassported.answers.has('employment-status')).to.equal(false)
    expect(notPassported.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal(STEPS.dependantDetails)
  })

  it('persists and prepopulates dependant answers, routes by selection, and removes a count when its answer changes to no', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })

    const childSelected = save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'yes',
      'child-dependants-count': '2',
      'adult-dependants': 'no',
    })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      partner: 'no',
      passporting: 'no',
      'child-dependants': 'yes',
      'child-dependants-count': '2',
      'adult-dependants': 'no',
    })
    expect(childSelected.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.dependantIncome)

    const revisited = restore(session, ADULT_DOB)
    expect(revisited.answers.get('child-dependants')).to.equal('yes')
    expect(revisited.answers.get('child-dependants-count')).to.equal('2')

    const changedToNo = save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      partner: 'no',
      passporting: 'no',
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })
    expect(changedToNo.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.employmentStatus)
  })

  it('persists and prepopulates the dependant income answer and removes it when dependants are no longer selected', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'yes',
      'child-dependants-count': '1',
      'adult-dependants': 'no',
    })

    const saved = save(session, ADULT_DOB, STEPS.dependantIncome, { 'dependants-get-income': 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)['dependants-get-income']).to.equal('yes')
    expect(saved.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.dependantIncomeDetails)

    const revisited = restore(session, ADULT_DOB)
    expect(revisited.answers.get('dependants-get-income')).to.equal('yes')

    const changed = save(session, ADULT_DOB, STEPS.dependantIncome, { 'dependants-get-income': 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)['dependants-get-income']).to.equal('no')
    expect(changed.answers.get('dependants-get-income')).to.equal('no')
    expect(changed.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.employmentStatus)

    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('dependants-get-income')
  })

  it('removes dependant answers when passporting makes the page inapplicable', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'yes',
      'child-dependants-count': '3',
      'adult-dependants': 'no',
    })

    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'yes' })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      partner: 'no',
      passporting: 'yes',
    })
  })

  it('persists and prepopulates the selected immigration matter type when revisiting', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
    const saved = save(session, ADULT_DOB, STEPS.immigrationOrAsylumType, {
      'immigration-or-asylum-type': 'immigration_legal_help',
    })

    expect(readControlledWorkAnswers(session, CASE_ID)['immigration-or-asylum-type']).to.equal('immigration_legal_help')
    expect(saved.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.asylumSupport)

    const revisited = restore(session, ADULT_DOB)
    expect(revisited.answers.get('immigration-or-asylum-type')).to.equal('immigration_legal_help')
    expect(revisited.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal(STEPS.asylumSupport)
  })

  it('persists and prepopulates the asylum-support answer when revisiting', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
    save(session, ADULT_DOB, STEPS.immigrationOrAsylumType, { 'immigration-or-asylum-type': 'asylum' })
    const saved = save(session, ADULT_DOB, STEPS.asylumSupport, { 'asylum-support': 'no' })

    expect(readControlledWorkAnswers(session, CASE_ID)['asylum-support']).to.equal('no')
    expect(saved.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.applicant)
    expect(saved.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal(STEPS.applicant)

    const revisited = restore(session, ADULT_DOB)
    expect(revisited.answers.get('asylum-support')).to.equal('no')
    expect(revisited.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal(STEPS.applicant)
  })

  it('removes applicant answers when asylum support changes to yes and requires them again if changed back', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
    save(session, ADULT_DOB, STEPS.immigrationOrAsylumType, { 'immigration-or-asylum-type': 'asylum' })
    save(session, ADULT_DOB, STEPS.asylumSupport, { 'asylum-support': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })

    const exempt = save(session, ADULT_DOB, STEPS.asylumSupport, { 'asylum-support': 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'yes',
      'immigration-or-asylum-type': 'asylum',
      'asylum-support': 'yes',
    })
    expect(exempt.answers.has('partner')).to.equal(false)
    expect(exempt.answers.has('passporting')).to.equal(false)
    expect(exempt.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal('')

    const meansCheck = save(session, ADULT_DOB, STEPS.asylumSupport, { 'asylum-support': 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)['asylum-support']).to.equal('no')
    expect(meansCheck.answers.has('partner')).to.equal(false)
    expect(meansCheck.answers.has('passporting')).to.equal(false)
    expect(meansCheck.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal(STEPS.applicant)
  })

  it('removes irrelevant answers when a gate changes, keeps the rest, and persists the result', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
    save(session, ADULT_DOB, STEPS.immigrationOrAsylumType, { 'immigration-or-asylum-type': 'asylum' })
    save(session, ADULT_DOB, STEPS.asylumSupport, { 'asylum-support': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'yes' })

    const { answers } = save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      partner: 'no',
      passporting: 'yes',
    })
    expect(answers.has('immigration-or-asylum-type')).to.equal(false)
    expect(answers.has('asylum-support')).to.equal(false)
    expect(answers.get('partner')).to.equal('no')
  })

  it('ignores an invalid posted value rather than saving it', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'maybe' })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({})
    expect(session.financialEligibilityDrafts[CASE_ID]).to.deep.equal({})
  })

  it('uses the DOB-derived age so under-18 clients get the CLR question and adults do not', () => {
    const minor = save(newSession(), MINOR_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    expect(minor.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.under18Clr)

    const minorWithMatter = save(newSession(), MINOR_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
    expect(minorWithMatter.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.under18Clr)

    const adult = save(newSession(), ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    expect(adult.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.applicant)

    const adultWithMatter = save(newSession(), ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
    expect(adultWithMatter.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.immigrationOrAsylumType)
  })

  it('persists and restores CLR, and prunes screening answers when CLR changes to yes', () => {
    const session = newSession()
    save(session, MINOR_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    const clrNo = save(session, MINOR_DOB, STEPS.under18Clr, { 'controlled-legal-representation': 'no' })

    expect(clrNo.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.aggregatedMeans)
    save(session, MINOR_DOB, STEPS.aggregatedMeans, { 'aggregated-means': 'no' })
    save(session, MINOR_DOB, STEPS.regularIncome, { 'regular-income': 'no' })
    save(session, MINOR_DOB, STEPS.under18Assets, { 'under-18-assets': 'no' })

    const clrYes = save(session, MINOR_DOB, STEPS.under18Clr, { 'controlled-legal-representation': 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      'controlled-legal-representation': 'yes',
    })
    expect(clrYes.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal('')

    const restored = restore(session, MINOR_DOB)
    expect(restored.answers.get('controlled-legal-representation')).to.equal('yes')
    expect(restored.answers.has('aggregated-means')).to.equal(false)
    expect(restored.answers.has('regular-income')).to.equal(false)
    expect(restored.answers.has('under-18-assets')).to.equal(false)
  })

  it('persists and restores aggregation, and prunes the no-aggregation branch when the answer changes', () => {
    const session = newSession()
    save(session, MINOR_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, MINOR_DOB, STEPS.under18Clr, { 'controlled-legal-representation': 'no' })
    const aggregationNo = save(session, MINOR_DOB, STEPS.aggregatedMeans, { 'aggregated-means': 'no' })
    expect(aggregationNo.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.regularIncome)

    save(session, MINOR_DOB, STEPS.regularIncome, { 'regular-income': 'no' })
    save(session, MINOR_DOB, STEPS.under18Assets, { 'under-18-assets': 'yes' })

    const aggregationYes = save(session, MINOR_DOB, STEPS.aggregatedMeans, { 'aggregated-means': 'yes' })
    expect(aggregationYes.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.howToAggregate)
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      'controlled-legal-representation': 'no',
      'aggregated-means': 'yes',
    })

    const restored = restore(session, MINOR_DOB)
    expect(restored.answers.get('aggregated-means')).to.equal('yes')
    expect(restored.data.get(CONTROLLED_WORK_DATA_KEYS.applicableSteps)).to.include(STEPS.howToAggregate)
    expect(restored.data.get(CONTROLLED_WORK_DATA_KEYS.applicableSteps)).to.not.include(STEPS.regularIncome)
  })

  it('persists regular income and removes the asset-screen answer when income changes to yes', () => {
    const session = newSession()
    save(session, MINOR_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, MINOR_DOB, STEPS.under18Clr, { 'controlled-legal-representation': 'no' })
    save(session, MINOR_DOB, STEPS.aggregatedMeans, { 'aggregated-means': 'no' })
    const noIncome = save(session, MINOR_DOB, STEPS.regularIncome, { 'regular-income': 'no' })
    save(session, MINOR_DOB, STEPS.under18Assets, { 'under-18-assets': 'no' })

    expect(noIncome.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.under18Assets)
    const changed = save(session, MINOR_DOB, STEPS.regularIncome, { 'regular-income': 'yes' })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      'controlled-legal-representation': 'no',
      'aggregated-means': 'no',
      'regular-income': 'yes',
    })
    expect(changed.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.applicant)
    expect(changed.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal(STEPS.applicant)

    const restored = restore(session, MINOR_DOB)
    expect(restored.answers.get('regular-income')).to.equal('yes')
    expect(restored.answers.has('under-18-assets')).to.equal(false)
  })

  it('persists and prepopulates the asset answer, then prunes matter answers when it changes to no', () => {
    const session = newSession()
    save(session, MINOR_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
    save(session, MINOR_DOB, STEPS.under18Clr, { 'controlled-legal-representation': 'no' })
    save(session, MINOR_DOB, STEPS.aggregatedMeans, { 'aggregated-means': 'no' })
    save(session, MINOR_DOB, STEPS.regularIncome, { 'regular-income': 'no' })

    const meansRoute = save(session, MINOR_DOB, STEPS.under18Assets, { 'under-18-assets': 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)['under-18-assets']).to.equal('yes')
    expect(meansRoute.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.immigrationOrAsylumType)

    save(session, MINOR_DOB, STEPS.immigrationOrAsylumType, { 'immigration-or-asylum-type': 'asylum' })
    save(session, MINOR_DOB, STEPS.asylumSupport, { 'asylum-support': 'no' })
    const revisited = restore(session, MINOR_DOB)
    expect(revisited.answers.get('under-18-assets')).to.equal('yes')
    expect(revisited.data.get(CONTROLLED_WORK_DATA_KEYS.applicableSteps)).to.include(STEPS.under18Assets)

    const exemptRoute = save(session, MINOR_DOB, STEPS.under18Assets, { 'under-18-assets': 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'yes',
      'controlled-legal-representation': 'no',
      'aggregated-means': 'no',
      'regular-income': 'no',
      'under-18-assets': 'no',
    })
    expect(exemptRoute.answers.has('immigration-or-asylum-type')).to.equal(false)
    expect(exemptRoute.answers.has('asylum-support')).to.equal(false)
    expect(exemptRoute.data.get(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)).to.equal('')

    const restored = restore(session, MINOR_DOB)
    expect(restored.answers.get('under-18-assets')).to.equal('no')
    expect(restored.data.get(CONTROLLED_WORK_DATA_KEYS.applicableSteps)).to.not.include(STEPS.immigrationOrAsylumType)
  })

  it('continues past the informational aggregation page without storing an answer', () => {
    const session = newSession()
    save(session, MINOR_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, MINOR_DOB, STEPS.under18Clr, { 'controlled-legal-representation': 'no' })
    save(session, MINOR_DOB, STEPS.aggregatedMeans, { 'aggregated-means': 'yes' })

    const continued = save(session, MINOR_DOB, STEPS.howToAggregate, {})

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'no',
      'controlled-legal-representation': 'no',
      'aggregated-means': 'yes',
    })
    expect(continued.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.applicant)
    expect(restore(session, MINOR_DOB).answers.get('aggregated-means')).to.equal('yes')
  })

  it('prunes saved answers on restore when the DOB changes the route, and persists the pruning', () => {
    const session = newSession()
    save(session, MINOR_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, MINOR_DOB, STEPS.under18Clr, { 'controlled-legal-representation': 'no' })

    const { answers } = restore(session, ADULT_DOB)

    expect(answers.has('controlled-legal-representation')).to.equal(false)
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({ 'immigration-or-asylum': 'no' })
  })

  it('invalidates a prepared snapshot when an answer changes', () => {
    const session = newSession()
    session.preparedEligibilitySnapshots = { [CASE_ID]: { schemaVersion: 1, caseId: CASE_ID, answers: {} } }
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })

    expect(session.preparedEligibilitySnapshots?.[CASE_ID]).to.equal(undefined)
  })

  it('preserves unrelated drafts and repeating data while keeping controlled answers case-scoped', () => {
    const session = newSession()
    session.financialEligibilityDrafts[CASE_ID] = { 'under-18': 'no' }
    session.casePatternDrafts = { [CASE_ID]: { properties: { propertySet: [{ value: '1' }] } } }
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
    const other = fakeContext({ session, dateOfBirth: ADULT_DOB, caseId: 'CASE2', posted: { 'immigration-or-asylum': 'no' } })
    registry.SaveControlledWorkAnswers.evaluate(other.context, STEPS.immigrationOrAsylum)

    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })

    expect(session.financialEligibilityDrafts[CASE_ID]).to.deep.equal({ 'under-18': 'no', 'immigration-or-asylum': 'no' })
    expect(session.casePatternDrafts[CASE_ID]).to.deep.equal({ properties: { propertySet: [{ value: '1' }] } })
    expect(readControlledWorkAnswers(session, 'CASE2')).to.deep.equal({ 'immigration-or-asylum': 'no' })
  })

  it('does nothing without a case id or session', () => {
    const session = newSession()
    const { context, answers } = fakeContext({ session, dateOfBirth: ADULT_DOB, caseId: '' })
    registry.SaveControlledWorkAnswers.evaluate(context, STEPS.immigrationOrAsylum)

    expect(session.financialEligibilityDrafts[CASE_ID]).to.equal(undefined)
    expect(answers.size).to.equal(0)
  })
})
