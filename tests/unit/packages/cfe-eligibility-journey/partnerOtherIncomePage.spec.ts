import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getFirstMissingStep,
  getNextStep,
  isControlledWorkComplete,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS, type ControlledWorkAnswers } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  isPositiveOtherIncomeAmount,
  isValidOtherIncomeAmount,
  partnerOtherIncomePageContent,
  partnerOtherIncomeQuestionFields,
} from '#packages/cfe-eligibility-journey/src/otherIncomePage/otherIncomeBlock.js'
import { partnerOtherIncomeStep } from '#packages/cfe-eligibility-journey/src/partnerOtherIncomePage/partnerOtherIncomeStep.js'

const ADULT = { isUnder18: false }
const OTHER_INCOME_QUESTION_COUNT = 6
const BASE_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'yes',
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
  'partner-over-60': 'no',
  'partner-employment-status': 'unemployed',
} as const
const PARTNER_OTHER_INCOME_ANSWERS = {
  ...BASE_ANSWERS,
  'partner-receives-benefits': 'no',
  partner_friends_or_family_relevant: 'yes',
  partner_friends_or_family_conditional_value: '250',
  partner_friends_or_family_frequency: 'monthly',
  partner_maintenance_relevant: 'no',
  partner_property_or_lodger_relevant: 'no',
  partner_pension_relevant: 'no',
  partner_student_finance_relevant: 'no',
  partner_other_relevant: 'no',
  'partner-other-income-completed': 'yes',
} as const satisfies ControlledWorkAnswers

describe('Controlled-work partner other income page', () => {
  it('uses the shared eligibility form and follows partner benefits and benefit details', () => {
    const steps = eligibilityJourney.steps ?? []
    const benefitsIndex = steps.findIndex(({ code }) => code === STEPS.partnerBenefits)
    const detailsIndex = steps.findIndex(({ code }) => code === STEPS.partnerBenefitDetails)
    const otherIncomeIndex = steps.findIndex(({ code }) => code === STEPS.partnerOtherIncome)
    const submission = JSON.stringify(partnerOtherIncomeStep.onSubmission)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))

    expect(detailsIndex).to.be.greaterThan(benefitsIndex)
    expect(otherIncomeIndex).to.be.greaterThan(detailsIndex)
    expect(partnerOtherIncomeStep.path).to.equal('/partner-other-income')
    expect(partnerOtherIncomeStep.title).to.equal("The partner's other income")
    expect(partnerOtherIncomeStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(partnerOtherIncomeStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(partnerOtherIncomeStep.onAccess)).to.include(STEPS.partnerBenefitDetails)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include(controlledWorkIncompleteStepCode)
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('matches CCQ partner wording, hints, content, choices and guidance', () => {
    const content = JSON.stringify(partnerOtherIncomePageContent)

    for (const copy of [
      "The partner's other income",
      'Do not include income already entered for your client.',
      'Does the partner get financial help from friends or family?',
      'For example, money from a family member for rent or bills.',
      'Does the partner get maintenance from a former partner?',
      'This includes child maintenance.',
      'Does the partner get income from a property or lodger?',
      'Does the partner get income from pensions?',
      'Include the total value of any pensions, including State Pension, workplace and personal pensions.',
      'Does the partner get income from student finance?',
      'This includes any type of student loan, grant or bursary. Do not include any tuition fee loans.',
      'Does the partner get income from other sources?',
      'For example, interest from savings or income bonds. Do not include any disregarded income or Cost of Living Payments.',
      'Check the guidance for:',
      'mandatory and discretionary disregarded payments (PDF, 599KB)',
      'the principles for exercising discretion (PDF, 599KB)',
      'Amount received this academic year',
      'Amount received in the last month',
      'Frequency',
      'Income (PDF, 599KB)',
      'Save and continue',
      'Guidance',
      'Partner',
    ]) {
      expect(content).to.include(copy)
    }

    expect(content).to.include('"level":2')
    expect(content).to.include('#page=13')
    expect(content).to.include('#page=15')
    expect(content).to.include('#page=18')
    expect(content).to.include('Every week')
    expect(content).to.include('Every 2 weeks')
    expect(content).to.include('Every 4 weeks')
    expect(content).to.include('Every month')
    expect(content).to.not.include('Total in last 3 months')
    expect(content).to.include('visibleWhen')
    expect(content).to.include('dependentWhen')
    expect(partnerOtherIncomeQuestionFields).to.have.length(OTHER_INCOME_QUESTION_COUNT)
    expect(partnerOtherIncomeQuestionFields.map(({ code }) => code)).to.deep.equal([
      'partner_friends_or_family_relevant',
      'partner_maintenance_relevant',
      'partner_property_or_lodger_relevant',
      'partner_pension_relevant',
      'partner_student_finance_relevant',
      'partner_other_relevant',
    ])
  })

  it('declares exact CCQ required, invalid-number, positive-amount and frequency errors', () => {
    const fields = JSON.stringify(partnerOtherIncomeQuestionFields)

    for (const message of [
      'Select yes if the partner gets financial help from friends or family',
      'Select yes if the partner gets maintenance from a former partner',
      'Select yes if the partner gets income from a property or lodger',
      'Select yes if the partner gets income from pensions',
      'Select yes if the partner gets income from student finance',
      'Select yes if the partner gets income from other sources',
      'Enter amount of financial help from friends and family',
      'Amount of financial help from friends of family must be a number',
      'Amount of financial help from friends and family must be more than 0',
      'Select frequency of financial help from friends and family',
      'Enter amount of maintenance from a former partner',
      'Amount of maintenance from a former partner must be a number',
      'Amount of maintenance from a former partner must be more than 0',
      'Select frequency of maintenance payments from a former partner',
      'Enter amount of income from a property or lodger',
      'Amount of income from a property or lodger must be a number',
      'Amount of income from a property or lodger must be more than 0',
      'Select frequency of income from a property or lodger',
      'Enter amount of income the partner gets from pensions',
      'Amount of income the partner gets from pensions must be a number',
      'Amount of income the partner gets from pensions must be more than 0',
      'Select frequency of income the partner gets from pensions',
      'Enter amount of student finance received this academic year',
      'Amount of student finance received this academic year must be a number',
      'Amount of student finance received this academic year must be more than 0',
      'Enter amount of income from other sources received in the last month',
      'Amount of income from other sources received in the last month must be a number',
      'Amount of income from other sources received in the last month must be more than 0',
    ]) {
      expect(fields).to.include(message)
    }

    expect(isValidOtherIncomeAmount('£1,234.56')).to.equal(true)
    expect(isValidOtherIncomeAmount('0.01')).to.equal(true)
    for (const invalid of ['1,2', 'not a number', '1.2.3', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isValidOtherIncomeAmount(invalid)).to.equal(false)
    }

    expect(isPositiveOtherIncomeAmount('0.01')).to.equal(true)
    for (const invalid of ['0', '-1', '-0.01']) {
      expect(isPositiveOtherIncomeAmount(invalid)).to.equal(false)
    }
    expect(isValidControlledWorkAnswer('partner_friends_or_family_relevant', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('partner_friends_or_family_relevant', 'maybe')).to.equal(false)
    expect(isValidControlledWorkAnswer('partner_friends_or_family_conditional_value', '250')).to.equal(true)
    expect(isValidControlledWorkAnswer('partner_friends_or_family_conditional_value', '0')).to.equal(false)
    expect(isValidControlledWorkAnswer('partner_friends_or_family_frequency', 'monthly')).to.equal(true)
    expect(isValidControlledWorkAnswer('partner_friends_or_family_frequency', 'total')).to.equal(false)
  })

  it('requires all six choices and requires conditional amounts and frequencies only after Yes', () => {
    const benefitsNo = { ...BASE_ANSWERS, 'partner-receives-benefits': 'no' } as const
    const missingPageAnswers = findMissingSteps(benefitsNo, ADULT)
    expect(missingPageAnswers).to.deep.equal([
      {
        stepCode: STEPS.partnerOtherIncome,
        answerCodes: [
          'partner_friends_or_family_relevant',
          'partner_maintenance_relevant',
          'partner_property_or_lodger_relevant',
          'partner_pension_relevant',
          'partner_student_finance_relevant',
          'partner_other_relevant',
          'partner-other-income-completed',
        ],
      },
    ])

    const selected = {
      ...benefitsNo,
      partner_friends_or_family_relevant: 'yes',
      partner_maintenance_relevant: 'no',
      partner_property_or_lodger_relevant: 'no',
      partner_pension_relevant: 'no',
      partner_student_finance_relevant: 'no',
      partner_other_relevant: 'no',
      'partner-other-income-completed': 'yes',
    } as const
    expect(findMissingSteps(selected, ADULT)).to.deep.equal([
      {
        stepCode: STEPS.partnerOtherIncome,
        answerCodes: ['partner_friends_or_family_conditional_value', 'partner_friends_or_family_frequency'],
      },
    ])
  })

  it('routes from either partner-benefits branch and applies only to a partner on a non-passported means route', () => {
    const noBenefits = { ...BASE_ANSWERS, 'partner-receives-benefits': 'no' } as const
    const yesBenefits = { ...BASE_ANSWERS, 'partner-receives-benefits': 'yes' } as const
    const benefitDetailsComplete = { ...yesBenefits, 'partner-benefit-details-completed': 'yes' } as const

    expect(getNextStep(STEPS.partnerBenefits, noBenefits, ADULT)).to.equal(STEPS.partnerOtherIncome)
    expect(getFirstMissingStep(noBenefits, ADULT)).to.equal(STEPS.partnerOtherIncome)
    expect(getNextStep(STEPS.partnerBenefits, yesBenefits, ADULT)).to.equal(STEPS.partnerBenefitDetails)
    expect(getNextStep(STEPS.partnerBenefitDetails, benefitDetailsComplete, ADULT)).to.equal(STEPS.partnerOtherIncome)
    expect(getApplicableSteps(noBenefits, ADULT)).to.include(STEPS.partnerOtherIncome)
    expect(getApplicableSteps({ ...noBenefits, partner: 'no' }, ADULT)).to.not.include(STEPS.partnerOtherIncome)
    expect(getApplicableSteps({ ...noBenefits, passporting: 'yes' }, ADULT)).to.not.include(STEPS.partnerOtherIncome)
  })

  it('prunes conditional answers when a choice or partner route changes, without completing the assessment', () => {
    const before = resolveControlledWorkJourney(PARTNER_OTHER_INCOME_ANSWERS, ADULT)
    expect(before.answers.partner_friends_or_family_conditional_value).to.equal('250')
    expect(before.answers.partner_friends_or_family_frequency).to.equal('monthly')

    const changedAnswer = {
      ...PARTNER_OTHER_INCOME_ANSWERS,
      partner_friends_or_family_relevant: 'no',
    } as const
    const afterNo = resolveControlledWorkJourney(changedAnswer, ADULT)
    expect(afterNo.answers).to.not.have.property('partner_friends_or_family_conditional_value')
    expect(afterNo.answers).to.not.have.property('partner_friends_or_family_frequency')
    expect(afterNo.removedCodes).to.include('partner_friends_or_family_conditional_value')
    expect(afterNo.removedCodes).to.include('partner_friends_or_family_frequency')
    expect(afterNo.answers.partner_maintenance_relevant).to.equal('no')

    const noPartner = resolveControlledWorkJourney({ ...changedAnswer, partner: 'no' }, ADULT)
    expect(noPartner.steps).to.not.include(STEPS.partnerOtherIncome)
    expect(noPartner.answers).to.not.have.property('partner-other-income-completed')
    expect(noPartner.answers).to.not.have.property('partner_maintenance_relevant')

    const passported = resolveControlledWorkJourney({ ...changedAnswer, passporting: 'yes' }, ADULT)
    expect(passported.steps).to.not.include(STEPS.partnerOtherIncome)
    expect(passported.answers).to.not.have.property('partner-other-income-completed')
    expect(passported.answers).to.not.have.property('partner_maintenance_relevant')
    expect(isControlledWorkComplete(PARTNER_OTHER_INCOME_ANSWERS, ADULT)).to.equal(false)
  })
})
