import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
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
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  isPositiveOtherIncomeAmount,
  isValidOtherIncomeAmount,
  otherIncomePageContent,
  otherIncomeQuestionFields,
} from '#packages/cfe-eligibility-journey/src/otherIncomePage/otherIncomeBlock.js'
import { otherIncomeStep } from '#packages/cfe-eligibility-journey/src/otherIncomePage/otherIncomeStep.js'

const ADULT = { isUnder18: false }
const OTHER_INCOME_QUESTION_COUNT = 6
const BASE_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'child-dependants': 'no',
  'adult-dependants': 'no',
  'employment-status': 'unemployed',
} as const
const OTHER_INCOME_ANSWERS = {
  ...BASE_ANSWERS,
  'receives-benefits': 'no',
  friends_or_family_relevant: 'yes',
  friends_or_family_conditional_value: '250',
  friends_or_family_frequency: 'monthly',
  maintenance_relevant: 'no',
  property_or_lodger_relevant: 'no',
  pension_relevant: 'no',
  student_finance_relevant: 'no',
  other_relevant: 'no',
  'other-income-completed': 'yes',
} as const satisfies ControlledWorkAnswers

describe('Controlled-work other income page', () => {
  it('uses the shared eligibility form and layout after benefits and benefit details', () => {
    const steps = eligibilityJourney.steps ?? []
    const benefitsIndex = steps.findIndex(({ code }) => code === STEPS.benefits)
    const benefitDetailsIndex = steps.findIndex(({ code }) => code === STEPS.benefitDetails)
    const otherIncomeIndex = steps.findIndex(({ code }) => code === STEPS.otherIncome)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const submission = JSON.stringify(otherIncomeStep.onSubmission)

    expect(benefitDetailsIndex).to.be.greaterThan(benefitsIndex)
    expect(otherIncomeIndex).to.be.greaterThan(benefitDetailsIndex)
    expect(otherIncomeStep.path).to.equal('/other-income')
    expect(otherIncomeStep.title).to.equal("Your client's other income")
    expect(otherIncomeStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(otherIncomeStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(otherIncomeStep.onAccess)).to.include(STEPS.benefitDetails)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.otherIncome)
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('matches the CCQ heading, questions, hints, supporting content, options and guidance', () => {
    const content = JSON.stringify(otherIncomePageContent)

    for (const copy of [
      "Your client's other income",
      'Does your client get financial help from friends or family?',
      'For example, money from a family member for rent or bills.',
      'Does your client get maintenance from a former partner?',
      'This includes child maintenance.',
      'Does your client get income from a property or lodger?',
      'Does your client get income from pensions?',
      'Include the total value of any pensions, including State Pension, workplace and personal pensions.',
      'Does your client get income from student finance?',
      'This includes any type of student loan, grant or bursary. Do not include any tuition fee loans.',
      'Does your client get income from other sources?',
      'For example, interest from savings or income bonds. Do not include any disregarded income or Cost of Living Payments.',
      'Check the guidance for:',
      'mandatory and discretionary disregarded payments (PDF, 599KB)',
      'the principles for exercising discretion (PDF, 599KB)',
      'Examples of Cost of Living Payments',
      'Pensioner Cost of Living Payment',
      'Cost of Living Payment',
      'Disability Cost of Living Payment',
      'Household Support Fund',
      'Council Tax rebate',
      'Energy Bills Support Scheme (EBSS)',
      'Alternative Fuel Payment',
      'Amount received this academic year',
      'Amount received in the last month',
      'Frequency',
      'Income (PDF, 599KB)',
      'Save and continue',
      'Guidance',
    ]) {
      expect(content).to.include(copy)
    }

    expect(content).to.include('"level":2')
    expect(content).to.include('#page=13')
    expect(content).to.include('#page=15')
    expect(content).to.include('#page=18')
    expect(otherIncomeQuestionFields).to.have.length(OTHER_INCOME_QUESTION_COUNT)
    expect(content).to.include('Every week')
    expect(content).to.include('Every 2 weeks')
    expect(content).to.include('Every 4 weeks')
    expect(content).to.include('Every month')
    expect(content).to.not.include('Total in last 3 months')
    expect(content).to.include('visibleWhen')
    expect(content).to.include('dependentWhen')
  })

  it('declares exact required, invalid-number, positive-amount and frequency errors', () => {
    const fields = JSON.stringify(otherIncomeQuestionFields)

    for (const message of [
      'Select yes if your client gets financial help from friends or family',
      'Select yes if your client gets maintenance from a former partner',
      'Select yes if your client gets income from a property or lodger',
      'Select yes if your client gets income from pensions',
      'Select yes if your client gets income from student finance',
      'Select yes if your client gets income from other sources',
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
      'Enter amount of income your client gets from pensions',
      'Amount of income your client gets from pensions must be a number',
      'Amount of income your client gets from pensions must be more than 0',
      'Select frequency of income your client gets from pensions',
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
    for (const invalid of ['', '1,2', 'not a number', '1.2.3', Number.NaN, Number.POSITIVE_INFINITY]) {
      if (invalid === '') continue
      expect(isValidOtherIncomeAmount(invalid)).to.equal(false)
    }

    expect(isPositiveOtherIncomeAmount('0.01')).to.equal(true)
    for (const invalid of ['0', '-1', '-0.01']) {
      expect(isPositiveOtherIncomeAmount(invalid)).to.equal(false)
    }
    expect(isValidControlledWorkAnswer('friends_or_family_relevant', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('friends_or_family_relevant', 'maybe')).to.equal(false)
    expect(isValidControlledWorkAnswer('friends_or_family_conditional_value', '250')).to.equal(true)
    expect(isValidControlledWorkAnswer('friends_or_family_conditional_value', '0')).to.equal(false)
    expect(isValidControlledWorkAnswer('friends_or_family_frequency', 'monthly')).to.equal(true)
    expect(isValidControlledWorkAnswer('friends_or_family_frequency', 'total')).to.equal(false)
  })

  it('routes benefits branches into the page and keeps later controlled-work pages incomplete', () => {
    const benefitsNo = { ...BASE_ANSWERS, 'receives-benefits': 'no' } as const
    const benefitsYes = { ...BASE_ANSWERS, 'receives-benefits': 'yes' } as const
    const benefitDetailsComplete = {
      ...benefitsYes,
      'benefit-details-completed': 'yes',
    } as const

    expect(getApplicableSteps(benefitsNo, ADULT)).to.include(STEPS.otherIncome)
    expect(getNextStep(STEPS.benefits, benefitsNo, ADULT)).to.equal(STEPS.otherIncome)
    expect(getNextStep(STEPS.benefits, benefitsYes, ADULT)).to.equal(STEPS.benefitDetails)
    expect(getNextStep(STEPS.benefitDetails, benefitDetailsComplete, ADULT)).to.equal(STEPS.otherIncome)
    expect(getNextStep(STEPS.otherIncome, OTHER_INCOME_ANSWERS, ADULT)).to.equal(STEPS.outgoings)
    expect(getFirstMissingStep(benefitsNo, ADULT)).to.equal(STEPS.otherIncome)

    const completed = { ...OTHER_INCOME_ANSWERS }
    expect(getFirstMissingStep(completed, ADULT)).to.equal(STEPS.outgoings)
    expect(isControlledWorkComplete(completed, ADULT)).to.equal(false)
  })

  it('requires every Yes/No answer and conditionally requires each selected amount and frequency', () => {
    const unanswered = { ...BASE_ANSWERS, 'receives-benefits': 'no' } as const
    const missingPageAnswers = findMissingSteps(unanswered, ADULT)
    expect(missingPageAnswers).to.deep.equal([
      {
        stepCode: STEPS.otherIncome,
        answerCodes: [
          'friends_or_family_relevant',
          'maintenance_relevant',
          'property_or_lodger_relevant',
          'pension_relevant',
          'student_finance_relevant',
          'other_relevant',
          'other-income-completed',
        ],
      },
      {
        stepCode: STEPS.outgoings,
        answerCodes: ['maintenance_payments_relevant', 'legal_aid_payments_relevant'],
      },
      {
        stepCode: STEPS.property,
        answerCodes: ['property-owned'],
      },
    ])

    const selected = {
      ...unanswered,
      friends_or_family_relevant: 'yes',
      maintenance_relevant: 'no',
      property_or_lodger_relevant: 'no',
      pension_relevant: 'no',
      student_finance_relevant: 'no',
      other_relevant: 'no',
      'other-income-completed': 'yes',
    } as const
    expect(findMissingSteps(selected, ADULT)).to.deep.equal([
      {
        stepCode: STEPS.otherIncome,
        answerCodes: ['friends_or_family_conditional_value', 'friends_or_family_frequency'],
      },
      {
        stepCode: STEPS.outgoings,
        answerCodes: ['maintenance_payments_relevant', 'legal_aid_payments_relevant'],
      },
      {
        stepCode: STEPS.property,
        answerCodes: ['property-owned'],
      },
    ])
  })

  it('validates conditional fields, removes only fields made irrelevant, and prunes the page when passporting changes', () => {
    const resolved = resolveControlledWorkJourney(OTHER_INCOME_ANSWERS, ADULT)
    expect(resolved.answers.friends_or_family_conditional_value).to.equal('250')
    expect(resolved.answers.friends_or_family_frequency).to.equal('monthly')

    const changedAnswer = {
      ...OTHER_INCOME_ANSWERS,
      friends_or_family_relevant: 'no',
    } as const
    const afterNo = resolveControlledWorkJourney(changedAnswer, ADULT)
    expect(afterNo.answers).to.not.have.property('friends_or_family_conditional_value')
    expect(afterNo.answers).to.not.have.property('friends_or_family_frequency')
    expect(afterNo.removedCodes).to.include('friends_or_family_conditional_value')
    expect(afterNo.removedCodes).to.include('friends_or_family_frequency')
    expect(afterNo.answers.maintenance_relevant).to.equal('no')

    const passported = resolveControlledWorkJourney({ ...changedAnswer, passporting: 'yes' }, ADULT)
    expect(passported.steps).to.not.include(STEPS.otherIncome)
    expect(passported.answers).to.not.have.property('other-income-completed')
    expect(passported.answers).to.not.have.property('maintenance_relevant')
  })
})
