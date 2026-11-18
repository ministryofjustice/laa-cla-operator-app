import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getNextStep,
  isControlledWorkChildcareEligible,
  isValidControlledWorkAnswer,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { isPositiveIncomeAmount, isValidIncomeAmount } from '#packages/cfe-eligibility-journey/src/controlledWorkIncomePage/incomeBlock.js'
import { outgoingsPageContent, outgoingsQuestionFields } from '#packages/cfe-eligibility-journey/src/outgoingsPage/outgoingsBlock.js'
import { outgoingsStep } from '#packages/cfe-eligibility-journey/src/outgoingsPage/outgoingsStep.js'

const ADULT: ControlledWorkContext = { isUnder18: false }
const OUTGOINGS_CATEGORY_COUNT = 3
const BASE_ANSWERS = {
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

describe('Controlled-work outgoings page', () => {
  it('uses the shared eligibility form and follows the client and partner income questions', () => {
    const steps = eligibilityJourney.steps ?? []
    const otherIncomeIndex = steps.findIndex(({ code }) => code === STEPS.otherIncome)
    const partnerOtherIncomeIndex = steps.findIndex(({ code }) => code === STEPS.partnerOtherIncome)
    const outgoingsIndex = steps.findIndex(({ code }) => code === STEPS.outgoings)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const submission = JSON.stringify(outgoingsStep.onSubmission)

    expect(outgoingsIndex).to.be.greaterThan(otherIncomeIndex)
    expect(outgoingsIndex).to.be.greaterThan(partnerOtherIncomeIndex)
    expect(outgoingsStep.path).to.equal('/outgoings')
    expect(outgoingsStep.title).to.equal("Your client's outgoings and deductions")
    expect(outgoingsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(outgoingsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(outgoingsStep.onAccess)).to.include(STEPS.partnerOtherIncome)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.outgoings)
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('matches the CCQ heading, questions, hints, responses and outgoings guidance', () => {
    const content = JSON.stringify(outgoingsPageContent)

    for (const copy of [
      "Your client's outgoings and deductions",
      'Does your client pay for childcare?',
      'For example, to a childminder, nanny or nursery.',
      'Does your client pay maintenance to a former partner?',
      'This includes child maintenance. If your client is paying all or part of their ex-partner’s housing costs in the former matrimonial home, include this.',
      'Does your client make payments towards legal aid for a criminal case?',
      'If yes, enter amount and frequency',
      'Amount',
      'Frequency',
      'Yes',
      'No',
      'Every week',
      'Every 2 weeks',
      'Every 4 weeks',
      'Every month',
      'Determining disposable income (PDF, 599KB)',
      'Save and continue',
      'Guidance',
    ]) {
      expect(content).to.include(copy)
    }

    expect(content).to.include('"level":2')
    expect(content).to.include('#page=22')
    expect(content).to.include('"inputType":"text"')
    expect(content).to.include('"inputmode":"decimal"')
    expect(content).to.include('"prefix":{"text":"£"}')
    expect(content).to.include('visibleWhen')
    expect(content).to.include('dependentWhen')
    expect(content).to.not.include('Total in last 3 months')
    expect(outgoingsQuestionFields).to.have.length(OUTGOINGS_CATEGORY_COUNT)
  })

  it('declares the exact required-choice, amount, and frequency errors from CCQ', () => {
    const fields = JSON.stringify(outgoingsQuestionFields)

    for (const message of [
      'Select yes if your client pays for childcare',
      'Enter amount paid for childcare',
      'Amount paid for childcare must be a number',
      'Amount paid for childcare must be more than 0',
      'Select frequency of childcare payments',
      'Select yes if your client pays maintenance to a former partner',
      'Enter amount of maintenance paid to a former partner',
      'Amount of maintenance paid to a former partner must be a number',
      'Amount of maintenance paid to a former partner must be more than 0',
      'Select frequency of maintenance payments to a former partner',
      'Select yes if your client makes payments toward legal aid for a criminal case',
      'Enter amount paid toward legal aid in a criminal case',
      'Amount paid toward legal aid in a criminal case must be a number',
      'Amount paid toward legal aid in a criminal case must be more than 0',
      'Select frequency of payments towards legal aid in a criminal case',
    ]) {
      expect(fields).to.include(message)
    }

    expect(isValidIncomeAmount('£1,234.56')).to.equal(true)
    expect(isValidIncomeAmount('12.345')).to.equal(false)
    expect(isValidIncomeAmount('not an amount')).to.equal(false)
    expect(isPositiveIncomeAmount('0')).to.equal(false)
    expect(isPositiveIncomeAmount('-1')).to.equal(false)

    expect(isValidControlledWorkAnswer('childcare_payments_relevant', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('maintenance_payments_relevant', 'no')).to.equal(true)
    expect(isValidControlledWorkAnswer('legal_aid_payments_relevant', 'maybe')).to.equal(false)
    expect(isValidControlledWorkAnswer('maintenance_payments_conditional_value', '125.50')).to.equal(true)
    expect(isValidControlledWorkAnswer('maintenance_payments_conditional_value', '0')).to.equal(false)
    expect(isValidControlledWorkAnswer('maintenance_payments_conditional_value', '125.555')).to.equal(false)
    expect(isValidControlledWorkAnswer('maintenance_payments_frequency', 'every_four_weeks')).to.equal(true)
    expect(isValidControlledWorkAnswer('maintenance_payments_frequency', 'total')).to.equal(false)
  })

  it('requires childcare only when eligible and requires conditional fields only after Yes', () => {
    const childcareEligible = { ...ADULT, eligibleForChildcareCosts: true }
    const ineligibleMissing = findMissingSteps(BASE_ANSWERS, ADULT).find(({ stepCode }) => stepCode === STEPS.outgoings)
    const eligibleMissing = findMissingSteps(BASE_ANSWERS, childcareEligible).find(({ stepCode }) => stepCode === STEPS.outgoings)

    expect(ineligibleMissing?.answerCodes).to.deep.equal([
      'maintenance_payments_relevant',
      'legal_aid_payments_relevant',
    ])
    expect(eligibleMissing?.answerCodes).to.deep.equal([
      'childcare_payments_relevant',
      'maintenance_payments_relevant',
      'legal_aid_payments_relevant',
    ])

    const yesAnswers = {
      ...BASE_ANSWERS,
      'child-dependants': 'yes',
      'child-dependants-count': '1',
      'dependants-get-income': 'no',
      childcare_payments_relevant: 'yes',
      childcare_payments_conditional_value: '200',
      childcare_payments_frequency: 'monthly',
      maintenance_payments_relevant: 'no',
      legal_aid_payments_relevant: 'no',
    } as const satisfies ControlledWorkAnswers
    const conditionalMissing = findMissingSteps(
      { ...yesAnswers, childcare_payments_conditional_value: undefined },
      childcareEligible,
    ).find(({ stepCode }) => stepCode === STEPS.outgoings)
    expect(conditionalMissing?.answerCodes).to.deep.equal(['childcare_payments_conditional_value'])
  })

  it('routes to outgoings after client or partner income and stops at the unimplemented boundary', () => {
    expect(getApplicableSteps(BASE_ANSWERS, ADULT)).to.include(STEPS.outgoings)
    expect(getNextStep(STEPS.otherIncome, BASE_ANSWERS, ADULT)).to.equal(STEPS.outgoings)

    const partnerAnswers = {
      ...BASE_ANSWERS,
      partner: 'yes',
      'partner-over-60': 'no',
      'partner-employment-status': 'unemployed',
      'partner-receives-benefits': 'no',
      partner_friends_or_family_relevant: 'no',
      partner_maintenance_relevant: 'no',
      partner_property_or_lodger_relevant: 'no',
      partner_pension_relevant: 'no',
      partner_student_finance_relevant: 'no',
      partner_other_relevant: 'no',
      'partner-other-income-completed': 'yes',
    } as const satisfies ControlledWorkAnswers

    expect(getNextStep(STEPS.partnerOtherIncome, partnerAnswers, ADULT)).to.equal(STEPS.outgoings)
    expect(getNextStep(STEPS.outgoings, {
      ...BASE_ANSWERS,
      maintenance_payments_relevant: 'no',
      legal_aid_payments_relevant: 'no',
    }, ADULT)).to.equal(undefined)
  })

  it('applies the CCQ childcare eligibility rules to dependants, client income and partner income', () => {
    const clientOnStudentFinance: ControlledWorkAnswers = {
      'child-dependants': 'yes',
      partner: 'no',
      student_finance_relevant: 'yes',
    }
    expect(isControlledWorkChildcareEligible(clientOnStudentFinance, [], [])).to.equal(true)

    const clientWithEmployment: ControlledWorkAnswers = {
      'child-dependants': 'yes',
      partner: 'no',
      student_finance_relevant: 'no',
    }
    expect(isControlledWorkChildcareEligible(clientWithEmployment, [{ income_type: 'employment' }], [])).to.equal(true)
    expect(isControlledWorkChildcareEligible(clientWithEmployment, [{ income_type: 'statutory_pay' }], [])).to.equal(false)
    expect(isControlledWorkChildcareEligible({ ...clientWithEmployment, 'child-dependants': 'no' }, [{ income_type: 'employment' }], [])).to.equal(false)

    const clientAndPartner: ControlledWorkAnswers = {
      'child-dependants': 'yes',
      partner: 'yes',
      student_finance_relevant: 'yes',
      partner_student_finance_relevant: 'no',
    }
    expect(isControlledWorkChildcareEligible(clientAndPartner, [], [{ partner_income_type: 'statutory_pay' }])).to.equal(false)
    expect(isControlledWorkChildcareEligible(clientAndPartner, [], [{ partner_income_type: 'self_employment' }])).to.equal(true)
    expect(
      isControlledWorkChildcareEligible(
        { ...clientAndPartner, partner_student_finance_relevant: 'yes' },
        [],
        [],
      ),
    ).to.equal(true)
  })
})
