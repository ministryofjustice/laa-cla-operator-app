import { expect } from 'chai'
import type { EffectFunctionContext } from '@ministryofjustice/hmpps-forge/core/authoring'
import { FinancialEligibilityEffectsRegistry } from '#packages/cfe-eligibility-journey/src/effects.js'
import '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  readControlledWorkAnswers,
  writeControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSession.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { CLIENT_DATE_OF_BIRTH_DATA_KEY } from '#packages/cfe-eligibility-journey/src/clientAge.js'
import type { Deps } from '#packages/cfe-eligibility-journey/src/api.js'
import type { FinancialEligibilitySession } from '#packages/cfe-eligibility-journey/src/context.type.js'
import { partnerIncomeFieldCodes } from '#packages/cfe-eligibility-journey/src/partnerEmploymentIncomePage/partnerEmploymentIncomeBlock.js'

const CASE_ID = 'CASE1'
const ADULT_DOB = '1990-01-01'
const MINOR_DOB = `${new Date().getFullYear() - 10}-01-01`
const OUTGOINGS_PREREQUISITE_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'child-dependants': 'no',
  'adult-dependants': 'no',
  'employment-status': 'unemployed',
  'receives-benefits': 'no',
  friends_or_family_relevant: 'no',
  maintenance_relevant: 'no',
  property_or_lodger_relevant: 'no',
  pension_relevant: 'no',
  student_finance_relevant: 'no',
  other_relevant: 'no',
  'other-income-completed': 'yes',
} as const satisfies ControlledWorkAnswers

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
    getAnswer: (code: string) => answers.get(code),
    getPostData: (name: string) => posted[name],
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

  it('persists and prepopulates employment status, replacing the answer when it changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })

    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'in_work' })
    expect(restore(session, ADULT_DOB).answers.get('employment-status')).to.equal('in_work')
    expect(readControlledWorkAnswers(session, CASE_ID)['employment-status']).to.equal('in_work')

    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'unemployed' })
    expect(restore(session, ADULT_DOB).answers.get('employment-status')).to.equal('unemployed')
    expect(readControlledWorkAnswers(session, CASE_ID)['employment-status']).to.equal('unemployed')
  })

  it('persists and prepopulates the partner age answer and removes it when the partner gate changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'yes' })

    save(session, ADULT_DOB, STEPS.partnerDetails, { 'partner-over-60': 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)['partner-over-60']).to.equal('yes')
    expect(restore(session, ADULT_DOB).answers.get('partner-over-60')).to.equal('yes')

    save(session, ADULT_DOB, STEPS.partnerDetails, { 'partner-over-60': 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)['partner-over-60']).to.equal('no')
    expect(restore(session, ADULT_DOB).answers.get('partner-over-60')).to.equal('no')

    const changedPartner = save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner-over-60')
    expect(changedPartner.answers.has('partner-over-60')).to.equal(false)
  })

  it('persists and prepopulates partner employment status and replaces it when the answer changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })

    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'in_work' })
    expect(readControlledWorkAnswers(session, CASE_ID)['partner-employment-status']).to.equal('in_work')
    expect(restore(session, ADULT_DOB).answers.get('partner-employment-status')).to.equal('in_work')

    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'unemployed' })
    expect(readControlledWorkAnswers(session, CASE_ID)['partner-employment-status']).to.equal('unemployed')
    expect(restore(session, ADULT_DOB).answers.get('partner-employment-status')).to.equal('unemployed')
  })

  it('persists and prepopulates partner benefits, and prunes branch answers when the response changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'unemployed' })

    save(session, ADULT_DOB, STEPS.partnerBenefits, { 'partner-receives-benefits': 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)['partner-receives-benefits']).to.equal('yes')
    expect(restore(session, ADULT_DOB).answers.get('partner-receives-benefits')).to.equal('yes')

    save(session, ADULT_DOB, STEPS.partnerBenefitDetails, { 'partner-benefit-details-completed': 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)['partner-benefit-details-completed']).to.equal('yes')

    const changedToNo = save(session, ADULT_DOB, STEPS.partnerBenefits, { 'partner-receives-benefits': 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)['partner-receives-benefits']).to.equal('no')
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner-benefit-details-completed')
    expect(changedToNo.answers.has('partner-benefit-details-completed')).to.equal(false)
    expect(restore(session, ADULT_DOB).answers.get('partner-receives-benefits')).to.equal('no')

    const changedPartner = save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner-receives-benefits')
    expect(changedPartner.answers.has('partner-receives-benefits')).to.equal(false)
  })

  it('persists and prepopulates the benefits answer, replacing it when the answer changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })
    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'unemployed' })

    save(session, ADULT_DOB, STEPS.benefits, { 'receives-benefits': 'yes' })
    expect(restore(session, ADULT_DOB).answers.get('receives-benefits')).to.equal('yes')
    expect(readControlledWorkAnswers(session, CASE_ID)['receives-benefits']).to.equal('yes')

    save(session, ADULT_DOB, STEPS.benefits, { 'receives-benefits': 'no' })
    expect(restore(session, ADULT_DOB).answers.get('receives-benefits')).to.equal('no')
    expect(readControlledWorkAnswers(session, CASE_ID)['receives-benefits']).to.equal('no')
  })

  it('initialises, persists, restores and prunes benefit detail rows when the Benefits answer changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })
    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'unemployed' })
    save(session, ADULT_DOB, STEPS.benefits, { 'receives-benefits': 'yes' })

    const page = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PrepareBenefitDetails.evaluate(page.context)
    expect(page.data.get(CONTROLLED_WORK_DATA_KEYS.benefitCollection)).to.deep.equal([
      { benefit_type: '', benefit_amount: '', benefit_frequency: '' },
    ])

    page.answers.set('benefit_type_0', 'Child Benefit')
    page.answers.set('benefit_amount_0', '123.45')
    page.answers.set('benefit_frequency_0', 'monthly')
    registry.SaveRepeatingItems.evaluate(
      page.context,
      STEPS.benefitDetails,
      CONTROLLED_WORK_DATA_KEYS.benefitCollection,
      ['benefit_type', 'benefit_amount', 'benefit_frequency'],
    )
    const saved = save(session, ADULT_DOB, STEPS.benefitDetails, {})

    expect(readControlledWorkAnswers(session, CASE_ID)['benefit-details-completed']).to.equal('yes')
    expect(saved.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.otherIncome)
    expect(
      session.casePatternDrafts?.[CASE_ID]?.[STEPS.benefitDetails]?.[CONTROLLED_WORK_DATA_KEYS.benefitCollection],
    ).to.deep.equal([{ benefit_type: 'Child Benefit', benefit_amount: '123.45', benefit_frequency: 'monthly' }])

    const revisited = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PrepareBenefitDetails.evaluate(revisited.context)
    expect(revisited.answers.get('benefit_type_0')).to.equal('Child Benefit')
    expect(revisited.answers.get('benefit_amount_0')).to.equal('123.45')
    expect(revisited.answers.get('benefit_frequency_0')).to.equal('monthly')

    save(session, ADULT_DOB, STEPS.benefits, { 'receives-benefits': 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('benefit-details-completed')
    expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.benefitDetails]).to.equal(undefined)
  })

  it('initialises, persists, restores and prunes partner benefit rows when the Benefits answer changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'unemployed' })
    save(session, ADULT_DOB, STEPS.partnerBenefits, { 'partner-receives-benefits': 'yes' })

    const page = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PreparePartnerBenefitDetails.evaluate(page.context)
    expect(page.data.get(CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection)).to.deep.equal([
      { benefit_type: '', benefit_amount: '', benefit_frequency: '' },
    ])

    page.answers.set('benefit_type_0', 'Child Benefit')
    page.answers.set('benefit_amount_0', '123.45')
    page.answers.set('benefit_frequency_0', 'monthly')
    registry.SaveRepeatingItems.evaluate(
      page.context,
      STEPS.partnerBenefitDetails,
      CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection,
      ['benefit_type', 'benefit_amount', 'benefit_frequency'],
    )
    const saved = save(session, ADULT_DOB, STEPS.partnerBenefitDetails, {})

    expect(readControlledWorkAnswers(session, CASE_ID)['partner-benefit-details-completed']).to.equal('yes')
    expect(saved.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.partnerOtherIncome)
    expect(
      session.casePatternDrafts?.[CASE_ID]?.[STEPS.partnerBenefitDetails]?.[
        CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection
      ],
    ).to.deep.equal([{ benefit_type: 'Child Benefit', benefit_amount: '123.45', benefit_frequency: 'monthly' }])

    const revisited = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PreparePartnerBenefitDetails.evaluate(revisited.context)
    expect(revisited.answers.get('benefit_type_0')).to.equal('Child Benefit')
    expect(revisited.answers.get('benefit_amount_0')).to.equal('123.45')
    expect(revisited.answers.get('benefit_frequency_0')).to.equal('monthly')

    save(session, ADULT_DOB, STEPS.partnerBenefits, { 'partner-receives-benefits': 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner-benefit-details-completed')
    expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.partnerBenefitDetails]).to.equal(undefined)
  })

  it('persists and prepopulates other-income answers, prunes conditional values, and clears the page when passporting changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })
    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'unemployed' })
    save(session, ADULT_DOB, STEPS.benefits, { 'receives-benefits': 'no' })

    const posted = {
      friends_or_family_relevant: 'yes',
      friends_or_family_conditional_value: '250',
      friends_or_family_frequency: 'monthly',
      maintenance_relevant: 'no',
      property_or_lodger_relevant: 'no',
      pension_relevant: 'no',
      student_finance_relevant: 'no',
      other_relevant: 'no',
    }
    save(session, ADULT_DOB, STEPS.otherIncome, posted)

    expect(readControlledWorkAnswers(session, CASE_ID)).to.include({
      friends_or_family_relevant: 'yes',
      friends_or_family_conditional_value: '250',
      friends_or_family_frequency: 'monthly',
      'other-income-completed': 'yes',
    })
    const revisited = restore(session, ADULT_DOB)
    expect(revisited.answers.get('friends_or_family_relevant')).to.equal('yes')
    expect(revisited.answers.get('friends_or_family_conditional_value')).to.equal('250')
    expect(revisited.answers.get('friends_or_family_frequency')).to.equal('monthly')

    save(session, ADULT_DOB, STEPS.otherIncome, { ...posted, friends_or_family_relevant: 'no' })
    const changed = restore(session, ADULT_DOB)
    expect(changed.answers.get('friends_or_family_relevant')).to.equal('no')
    expect(changed.answers.has('friends_or_family_conditional_value')).to.equal(false)
    expect(changed.answers.has('friends_or_family_frequency')).to.equal(false)
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('friends_or_family_conditional_value')
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('friends_or_family_frequency')

    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'yes' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('other-income-completed')
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('maintenance_relevant')
  })

  it('persists and prepopulates partner other-income answers, prunes conditional values, and removes them when the partner gate changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })
    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'unemployed' })
    save(session, ADULT_DOB, STEPS.benefits, { 'receives-benefits': 'no' })
    save(session, ADULT_DOB, STEPS.otherIncome, {
      friends_or_family_relevant: 'no',
      maintenance_relevant: 'no',
      property_or_lodger_relevant: 'no',
      pension_relevant: 'no',
      student_finance_relevant: 'no',
      other_relevant: 'no',
    })
    save(session, ADULT_DOB, STEPS.partnerDetails, { 'partner-over-60': 'no' })
    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'unemployed' })
    save(session, ADULT_DOB, STEPS.partnerBenefits, { 'partner-receives-benefits': 'no' })

    const posted = {
      partner_friends_or_family_relevant: 'yes',
      partner_friends_or_family_conditional_value: '250',
      partner_friends_or_family_frequency: 'monthly',
      partner_maintenance_relevant: 'no',
      partner_property_or_lodger_relevant: 'no',
      partner_pension_relevant: 'no',
      partner_student_finance_relevant: 'no',
      partner_other_relevant: 'no',
    }
    save(session, ADULT_DOB, STEPS.partnerOtherIncome, posted)

    expect(readControlledWorkAnswers(session, CASE_ID)).to.include({
      partner_friends_or_family_relevant: 'yes',
      partner_friends_or_family_conditional_value: '250',
      partner_friends_or_family_frequency: 'monthly',
      'partner-other-income-completed': 'yes',
    })
    const revisited = restore(session, ADULT_DOB)
    expect(revisited.answers.get('partner_friends_or_family_relevant')).to.equal('yes')
    expect(revisited.answers.get('partner_friends_or_family_conditional_value')).to.equal('250')
    expect(revisited.answers.get('partner_friends_or_family_frequency')).to.equal('monthly')

    save(session, ADULT_DOB, STEPS.partnerOtherIncome, {
      ...posted,
      partner_friends_or_family_relevant: 'no',
    })
    const changed = restore(session, ADULT_DOB)
    expect(changed.answers.get('partner_friends_or_family_relevant')).to.equal('no')
    expect(changed.answers.has('partner_friends_or_family_conditional_value')).to.equal(false)
    expect(changed.answers.has('partner_friends_or_family_frequency')).to.equal(false)
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner_friends_or_family_conditional_value')
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner_friends_or_family_frequency')

    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner-other-income-completed')
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner_maintenance_relevant')
  })

  it('initialises, persists, restores and prunes controlled income rows when employment changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })
    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'in_work' })

    const page = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PrepareIncomeDetails.evaluate(page.context)
    expect(page.data.get(CONTROLLED_WORK_DATA_KEYS.incomeCollection)).to.deep.equal([
      { income_type: '', income_frequency: '', gross_income: '', income_tax: '', national_insurance: '' },
    ])

    page.answers.set('income_type_0', 'employment')
    page.answers.set('income_frequency_0', 'every_week')
    page.answers.set('gross_income_0', '123')
    page.answers.set('income_tax_0', '22')
    page.answers.set('national_insurance_0', '11')
    registry.SaveRepeatingItems.evaluate(
      page.context,
      STEPS.income,
      CONTROLLED_WORK_DATA_KEYS.incomeCollection,
      ['income_type', 'income_frequency', 'gross_income', 'income_tax', 'national_insurance'],
    )
    const saved = save(session, ADULT_DOB, STEPS.income, {})

    expect(saved.data.get(CONTROLLED_WORK_DATA_KEYS.nextStep)).to.equal(STEPS.benefits)
    expect(
      session.casePatternDrafts?.[CASE_ID]?.[STEPS.income]?.[CONTROLLED_WORK_DATA_KEYS.incomeCollection],
    ).to.deep.equal([
      {
        income_type: 'employment',
        income_frequency: 'every_week',
        gross_income: '123',
        income_tax: '22',
        national_insurance: '11',
      },
    ])

    const revisited = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PrepareIncomeDetails.evaluate(revisited.context)
    expect(revisited.answers.get('income_type_0')).to.equal('employment')
    expect(revisited.answers.get('income_frequency_0')).to.equal('every_week')
    expect(revisited.answers.get('gross_income_0')).to.equal('123')
    expect(revisited.answers.get('income_tax_0')).to.equal('22')
    expect(revisited.answers.get('national_insurance_0')).to.equal('11')

    save(session, ADULT_DOB, STEPS.employmentStatus, { 'employment-status': 'unemployed' })
    expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.income]).to.equal(undefined)
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('income-completed')
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

  it('persists, restores, and prunes repeatable dependant-income rows when the dependant count or gate changes', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'no', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'yes',
      'child-dependants-count': '2',
      'adult-dependants': 'no',
    })

    save(session, ADULT_DOB, STEPS.dependantIncome, { 'dependants-get-income': 'yes' })

    const page = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PrepareDependantIncomeDetails.evaluate(page.context)
    expect(page.data.get(CONTROLLED_WORK_DATA_KEYS.dependantIncomeMaxRows)).to.equal(2)
    expect(page.data.get(CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection)).to.deep.equal([{ amount: '', frequency: '' }])

    page.answers.set('amount_0', '50')
    page.answers.set('frequency_0', 'every_week')
    registry.AddRepeatingItem.evaluate(
      page.context,
      STEPS.dependantIncomeDetails,
      CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection,
      ['amount', 'frequency'],
    )
    page.answers.set('amount_1', '100')
    page.answers.set('frequency_1', 'monthly')
    registry.SaveRepeatingItems.evaluate(
      page.context,
      STEPS.dependantIncomeDetails,
      CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection,
      ['amount', 'frequency'],
    )

    expect(
      session.casePatternDrafts?.[CASE_ID]?.[STEPS.dependantIncomeDetails]?.[CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection],
    ).to.deep.equal([
      { amount: '50', frequency: 'every_week' },
      { amount: '100', frequency: 'monthly' },
    ])

    const removeSecondRow = fakeContext({ session, dateOfBirth: ADULT_DOB, posted: { action: 'remove_1' } })
    registry.PrepareDependantIncomeDetails.evaluate(removeSecondRow.context)
    registry.RemoveRepeatingItem.evaluate(
      removeSecondRow.context,
      STEPS.dependantIncomeDetails,
      CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection,
      ['amount', 'frequency'],
    )
    expect(
      session.casePatternDrafts?.[CASE_ID]?.[STEPS.dependantIncomeDetails]?.[CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection],
    ).to.deep.equal([{ amount: '50', frequency: 'every_week' }])

    registry.AddRepeatingItem.evaluate(
      removeSecondRow.context,
      STEPS.dependantIncomeDetails,
      CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection,
      ['amount', 'frequency'],
    )
    removeSecondRow.answers.set('amount_1', '100')
    removeSecondRow.answers.set('frequency_1', 'monthly')
    registry.SaveRepeatingItems.evaluate(
      removeSecondRow.context,
      STEPS.dependantIncomeDetails,
      CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection,
      ['amount', 'frequency'],
    )

    save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'yes',
      'child-dependants-count': '1',
      'adult-dependants': 'no',
    })
    expect(
      session.casePatternDrafts?.[CASE_ID]?.[STEPS.dependantIncomeDetails]?.[CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection],
    ).to.deep.equal([
      { amount: '50', frequency: 'every_week' },
    ])

    const revisited = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PrepareDependantIncomeDetails.evaluate(revisited.context)
    expect(revisited.answers.get('amount_0')).to.equal('50')
    expect(revisited.answers.get('frequency_0')).to.equal('every_week')

    save(session, ADULT_DOB, STEPS.dependantIncome, { 'dependants-get-income': 'no' })
    expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.dependantIncomeDetails]).to.equal(undefined)
  })

  it('persists and prepopulates partner income rows, then prunes them when the partner becomes unemployed', () => {
    const session = newSession()
    save(session, ADULT_DOB, STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })
    save(session, ADULT_DOB, STEPS.applicant, { partner: 'yes', passporting: 'no' })
    save(session, ADULT_DOB, STEPS.partnerDetails, { 'partner-over-60': 'no' })
    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'in_work' })

    const page = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PreparePartnerIncomeDetails.evaluate(page.context)
    expect(page.data.get(CONTROLLED_WORK_DATA_KEYS.partnerIncomeCollection)).to.deep.equal([
      {
        partner_income_type: '',
        partner_income_frequency: '',
        partner_gross_income: '',
        partner_income_tax: '',
        partner_national_insurance: '',
      },
    ])

    page.answers.set('partner_income_type_0', 'employment')
    page.answers.set('partner_income_frequency_0', 'every_week')
    page.answers.set('partner_gross_income_0', '123')
    page.answers.set('partner_income_tax_0', '22')
    page.answers.set('partner_national_insurance_0', '11')
    registry.SaveRepeatingItems.evaluate(
      page.context,
      STEPS.partnerIncome,
      CONTROLLED_WORK_DATA_KEYS.partnerIncomeCollection,
      partnerIncomeFieldCodes,
    )
    save(session, ADULT_DOB, STEPS.partnerIncome, {})

    expect(readControlledWorkAnswers(session, CASE_ID)['partner-income-completed']).to.equal('yes')
    expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.partnerIncome]?.[CONTROLLED_WORK_DATA_KEYS.partnerIncomeCollection])
      .to.deep.equal([
        {
          partner_income_type: 'employment',
          partner_income_frequency: 'every_week',
          partner_gross_income: '123',
          partner_income_tax: '22',
          partner_national_insurance: '11',
        },
      ])

    const revisited = fakeContext({ session, dateOfBirth: ADULT_DOB })
    registry.PreparePartnerIncomeDetails.evaluate(revisited.context)
    expect(revisited.answers.get('partner_income_type_0')).to.equal('employment')
    expect(revisited.answers.get('partner_income_frequency_0')).to.equal('every_week')
    expect(revisited.answers.get('partner_gross_income_0')).to.equal('123')
    expect(revisited.answers.get('partner_income_tax_0')).to.equal('22')
    expect(revisited.answers.get('partner_national_insurance_0')).to.equal('11')

    save(session, ADULT_DOB, STEPS.partnerEmploymentStatus, { 'partner-employment-status': 'unemployed' })
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('partner-income-completed')
    expect(session.casePatternDrafts?.[CASE_ID]?.[STEPS.partnerIncome]).to.equal(undefined)
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

  it('persists and prepopulates outgoings, and prunes conditional fields when an answer changes to No', () => {
    const session = newSession()
    writeControlledWorkAnswers(session, CASE_ID, OUTGOINGS_PREREQUISITE_ANSWERS)

    save(session, ADULT_DOB, STEPS.outgoings, {
      maintenance_payments_relevant: 'yes',
      maintenance_payments_conditional_value: '250',
      maintenance_payments_frequency: 'every_two_weeks',
      legal_aid_payments_relevant: 'no',
    })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.include({
      maintenance_payments_relevant: 'yes',
      maintenance_payments_conditional_value: '250',
      maintenance_payments_frequency: 'every_two_weeks',
      legal_aid_payments_relevant: 'no',
    })
    expect(restore(session, ADULT_DOB).answers.get('maintenance_payments_conditional_value')).to.equal('250')

    save(session, ADULT_DOB, STEPS.outgoings, {
      maintenance_payments_relevant: 'no',
      legal_aid_payments_relevant: 'no',
    })

    const answers = readControlledWorkAnswers(session, CASE_ID)
    expect(answers.maintenance_payments_relevant).to.equal('no')
    expect(answers).to.not.have.property('maintenance_payments_conditional_value')
    expect(answers).to.not.have.property('maintenance_payments_frequency')
    expect(restore(session, ADULT_DOB).answers.has('maintenance_payments_conditional_value')).to.equal(false)
  })

  it('prepopulates eligible childcare answers and removes them when child dependants are removed', () => {
    const session = newSession()
    const answers: ControlledWorkAnswers = {
      ...OUTGOINGS_PREREQUISITE_ANSWERS,
      'child-dependants': 'yes',
      'child-dependants-count': '1',
      'dependants-get-income': 'no',
      'employment-status': 'in_work',
      'income-completed': 'yes',
    }
    writeControlledWorkAnswers(session, CASE_ID, answers)
    session.casePatternDrafts = {
      [CASE_ID]: {
        [STEPS.income]: {
          [CONTROLLED_WORK_DATA_KEYS.incomeCollection]: [{ income_type: 'employment' }],
        },
      },
    }

    const saved = save(session, ADULT_DOB, STEPS.outgoings, {
      childcare_payments_relevant: 'yes',
      childcare_payments_conditional_value: '200',
      childcare_payments_frequency: 'monthly',
      maintenance_payments_relevant: 'no',
      legal_aid_payments_relevant: 'no',
    })

    expect(saved.data.get(CONTROLLED_WORK_DATA_KEYS.childcareEligible)).to.equal(true)
    expect(readControlledWorkAnswers(session, CASE_ID).childcare_payments_conditional_value).to.equal('200')
    expect(restore(session, ADULT_DOB).answers.get('childcare_payments_frequency')).to.equal('monthly')

    const changed = save(session, ADULT_DOB, STEPS.dependantDetails, {
      'child-dependants': 'no',
      'adult-dependants': 'no',
    })

    expect(changed.data.get(CONTROLLED_WORK_DATA_KEYS.childcareEligible)).to.equal(false)
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('childcare_payments_relevant')
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('childcare_payments_conditional_value')
    expect(readControlledWorkAnswers(session, CASE_ID)).to.not.have.property('childcare_payments_frequency')
  })
})
