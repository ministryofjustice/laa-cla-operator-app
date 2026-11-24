import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep, controlledWorkIncompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getNextStep,
  getPreviousStep,
  isControlledWorkComplete,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { isValidMortgageOrLoanPaymentFrequency } from '#packages/cfe-eligibility-journey/src/controlledWork/mortgageOrLoanPaymentAnswers.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  mortgageOrLoanPaymentFields,
  mortgageOrLoanPaymentPageContent,
} from '#packages/cfe-eligibility-journey/src/mortgageOrLoanPaymentPage/mortgageOrLoanPaymentBlock.js'
import { mortgageOrLoanPaymentStep } from '#packages/cfe-eligibility-journey/src/mortgageOrLoanPaymentPage/mortgageOrLoanPaymentStep.js'
import { propertyStep } from '#packages/cfe-eligibility-journey/src/propertyPage/propertyStep.js'
import { propertyEntryStep } from '#packages/cfe-eligibility-journey/src/propertyEntryPage/propertyEntryStep.js'

const ADULT = { isUnder18: false }
const MORTGAGE_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'property-owned': 'with_mortgage',
} as const satisfies ControlledWorkAnswers
const PAYMENT_ANSWERS = {
  housing_loan_payments: '750',
  housing_payments_loan_frequency: 'monthly',
} as const satisfies ControlledWorkAnswers
const MEANS_PREREQUISITES = {
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
  maintenance_payments_relevant: 'no',
  legal_aid_payments_relevant: 'no',
} as const satisfies ControlledWorkAnswers

const findPage = (answers: ControlledWorkAnswers) =>
  findMissingSteps(answers, ADULT).find(({ stepCode }) => stepCode === STEPS.mortgageOrLoanPayment)

describe('Controlled-work mortgage or loan payment page', () => {
  it('uses the shared two-column question layout and the CCQ content', () => {
    const content = JSON.stringify(mortgageOrLoanPaymentPageContent)
    const layout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const steps = eligibilityJourney.steps ?? []

    expect(mortgageOrLoanPaymentStep.code).to.equal(STEPS.mortgageOrLoanPayment)
    expect(mortgageOrLoanPaymentStep.path).to.equal('/mortgage-or-loan-payment')
    expect(mortgageOrLoanPaymentStep.title).to.equal(
      'What are the mortgage or loan payments for the home your client usually lives in?',
    )
    expect(mortgageOrLoanPaymentStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    const pageIndex = steps.findIndex(({ code }) => code === STEPS.mortgageOrLoanPayment)
    expect(pageIndex).to.be.greaterThan(steps.findIndex(({ code }) => code === STEPS.property))
    expect(pageIndex).to.be.lessThan(steps.findIndex(({ code }) => code === STEPS.propertyEntry))

    for (const copy of [
      'What are the mortgage or loan payments for the home your client usually lives in?',
      'Household',
      'Living with someone else',
      'If your client lives with their ex-partner, or someone else whose means are not included in the assessment, enter the amount paid by your client.',
      'The Legal Aid Agency will assume that your client is liable for 50% of the housing costs unless there is evidence otherwise.',
      'enter the amount paid on your client’s behalf as income for your client on the ‘Your client\'s other income’ page.',
      'You may need to provide evidence for this if you make a full application or open a controlled work file for your client.',
      'Enter full amount due',
      'Enter 0 if this does not apply',
      'Select frequency',
      'Every week',
      'Every 2 weeks',
      'Every 4 weeks',
      'Every month',
      'Housing costs (PDF, 599KB)',
      'LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf',
    ]) {
      expect(content).to.include(copy)
    }
    expect(content).not.to.include('Total in last 3 months')
    expect(content).to.include('"level":2')
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include('"inputmode":"decimal"')
    expect(content).to.include('"prefix":{"text":"£"}')
    expect(layout).to.include('"text":"Save and continue"')
    expect(layout).to.include('"text":"Guidance"')
  })

  it('shows the CCQ Household tag only when the client has a partner', () => {
    const questionBlocks = (
      mortgageOrLoanPaymentPageContent as unknown as { columns: Array<{ blocks: unknown[] }> }
    ).columns[0].blocks
    const tag = JSON.stringify(questionBlocks.find((block) => JSON.stringify(block).includes('"Household"')))

    expect(tag).to.include('govuk-tag--orange')
    expect(tag).to.include('visibleWhen')
    expect(tag).to.include('"partner"')
    expect(tag).to.include('"yes"')
  })

  it('declares the exact CCQ validation messages', () => {
    const fields = JSON.stringify(mortgageOrLoanPaymentFields)

    for (const message of [
      'Enter the mortgage or loan payments amount.',
      'Mortgage or loan payments must be a number.',
      'Mortgage or loan payments must be 0 or more.',
      'Select frequency of mortgage payments.',
    ]) {
      expect(fields).to.include(message)
    }
  })

  it('accepts zero or positive amounts and only the four controlled-work frequencies', () => {
    for (const amount of ['0', '0.00', '750', '£1,234.56']) {
      expect(isValidControlledWorkAnswer('housing_loan_payments', amount)).to.equal(true)
    }
    for (const amount of ['', undefined, null, '-1', '-0.01', 'not an amount', '1 1']) {
      expect(isValidControlledWorkAnswer('housing_loan_payments', amount)).to.equal(false)
    }
    for (const frequency of ['every_week', 'every_two_weeks', 'every_four_weeks', 'monthly']) {
      expect(isValidControlledWorkAnswer('housing_payments_loan_frequency', frequency)).to.equal(true)
    }
    for (const frequency of ['total', 'three_months', '', undefined]) {
      expect(isValidControlledWorkAnswer('housing_payments_loan_frequency', frequency)).to.equal(false)
    }
  })

  it('requires a frequency only when the payment is above zero', () => {
    expect(findPage(MORTGAGE_ANSWERS)?.answerCodes).to.deep.equal(['housing_loan_payments'])
    expect(findPage({ ...MORTGAGE_ANSWERS, housing_loan_payments: '0' })).to.equal(undefined)
    expect(findPage({ ...MORTGAGE_ANSWERS, housing_loan_payments: '0.50' })?.answerCodes).to.deep.equal([
      'housing_payments_loan_frequency',
    ])
    expect(findPage({ ...MORTGAGE_ANSWERS, ...PAYMENT_ANSWERS })).to.equal(undefined)

    expect(isValidMortgageOrLoanPaymentFrequency(undefined, '0')).to.equal(true)
    expect(isValidMortgageOrLoanPaymentFrequency('total', '0')).to.equal(true)
    expect(isValidMortgageOrLoanPaymentFrequency(undefined, '750')).to.equal(false)
    expect(isValidMortgageOrLoanPaymentFrequency('total', '750')).to.equal(false)
    expect(isValidMortgageOrLoanPaymentFrequency('every_week', '750')).to.equal(true)
    expect(isValidMortgageOrLoanPaymentFrequency(undefined, 'not an amount')).to.equal(true)
  })

  it('applies only to a mortgaged home on a non-passported means route', () => {
    expect(getApplicableSteps(MORTGAGE_ANSWERS, ADULT)).to.include(STEPS.mortgageOrLoanPayment)

    for (const propertyOwned of ['outright', 'shared_ownership', 'none'] as const) {
      expect(getApplicableSteps({ ...MORTGAGE_ANSWERS, 'property-owned': propertyOwned }, ADULT)).not.to.include(
        STEPS.mortgageOrLoanPayment,
      )
    }
    expect(getApplicableSteps({ ...MORTGAGE_ANSWERS, passporting: 'yes' }, ADULT)).not.to.include(
      STEPS.mortgageOrLoanPayment,
    )
    expect(
      getApplicableSteps(
        { ...MORTGAGE_ANSWERS, 'immigration-or-asylum': 'yes', 'immigration-or-asylum-type': 'asylum', 'asylum-support': 'yes' },
        ADULT,
      ),
    ).not.to.include(STEPS.mortgageOrLoanPayment)
    const { 'property-owned': _owned, ...unanswered } = MORTGAGE_ANSWERS
    expect(getApplicableSteps(unanswered, ADULT)).not.to.include(STEPS.mortgageOrLoanPayment)
  })

  it('redirects direct access through the incomplete hub until earlier pages are answered', () => {
    const access = JSON.stringify(mortgageOrLoanPaymentStep.onAccess)
    const reachability = JSON.stringify(mortgageOrLoanPaymentStep.reachability)

    expect(reachability).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(reachability).to.include(STEPS.mortgageOrLoanPayment)
    expect(access).to.include(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
    expect(access).to.include(controlledWorkIncompleteStepCode)
    for (const stepCode of [STEPS.applicant, STEPS.otherIncome, STEPS.outgoings, STEPS.property]) {
      expect(access).to.include(`"${stepCode}"`)
    }
    expect(access).not.to.include(`"${STEPS.propertyEntry}"`)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.mortgageOrLoanPayment)
    expect(JSON.stringify(propertyEntryStep.onAccess)).to.include(STEPS.mortgageOrLoanPayment)
  })

  it('routes from property to this page and then on to property entry and additional property', () => {
    const answers = { ...MORTGAGE_ANSWERS, ...PAYMENT_ANSWERS } as const satisfies ControlledWorkAnswers

    expect(getNextStep(STEPS.property, MORTGAGE_ANSWERS, ADULT)).to.equal(STEPS.mortgageOrLoanPayment)
    expect(JSON.stringify(propertyStep.onSubmission)).to.include(STEPS.mortgageOrLoanPayment)
    expect(getNextStep(STEPS.mortgageOrLoanPayment, answers, ADULT)).to.equal(STEPS.propertyEntry)
    expect(getNextStep(STEPS.mortgageOrLoanPayment, { ...MORTGAGE_ANSWERS, housing_loan_payments: '0' }, ADULT)).to.equal(
      STEPS.propertyEntry,
    )
    expect(getPreviousStep(STEPS.mortgageOrLoanPayment, answers, ADULT)).to.equal(STEPS.property)
    expect(getPreviousStep(STEPS.propertyEntry, answers, ADULT)).to.equal(STEPS.mortgageOrLoanPayment)

    const submission = JSON.stringify(mortgageOrLoanPaymentStep.onSubmission)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include(STEPS.propertyEntry)
    expect(submission).to.include(controlledWorkIncompleteStepCode)

    const propertyEntered = {
      ...answers,
      house_value: '350000',
      mortgage: '100000',
      percentage_owned: '100',
      house_in_dispute: 'no',
    } as const satisfies ControlledWorkAnswers
    expect(getApplicableSteps(propertyEntered, ADULT)).to.include(STEPS.additionalProperty)
    expect(getNextStep(STEPS.propertyEntry, propertyEntered, ADULT)).to.equal(STEPS.additionalProperty)
    expect(isControlledWorkComplete({ ...MEANS_PREREQUISITES, ...propertyEntered }, ADULT)).to.equal(false)
  })

  it('prunes its answers when the ownership or passporting gate changes and keeps unrelated answers', () => {
    const answers = {
      ...MEANS_PREREQUISITES,
      ...MORTGAGE_ANSWERS,
      ...PAYMENT_ANSWERS,
      house_value: '350000',
      mortgage: '100000',
      percentage_owned: '100',
      house_in_dispute: 'no',
    } as const satisfies ControlledWorkAnswers

    const outright = resolveControlledWorkJourney({ ...answers, 'property-owned': 'outright' }, ADULT)
    expect(outright.removedCodes).to.include.members(['housing_loan_payments', 'housing_payments_loan_frequency', 'mortgage'])
    expect(outright.answers).to.include({
      ...MEANS_PREREQUISITES,
      'property-owned': 'outright',
      house_value: '350000',
      percentage_owned: '100',
      house_in_dispute: 'no',
    })

    const passported = resolveControlledWorkJourney({ ...answers, passporting: 'yes' }, ADULT)
    expect(passported.removedCodes).to.include.members(['housing_loan_payments', 'housing_payments_loan_frequency'])
    expect(passported.answers).to.include({
      'property-owned': 'with_mortgage',
      house_value: '350000',
      mortgage: '100000',
      percentage_owned: '100',
    })

    const zeroPayment = resolveControlledWorkJourney({ ...answers, housing_loan_payments: '0' }, ADULT)
    expect(zeroPayment.removedCodes).to.deep.equal(['housing_payments_loan_frequency'])
    expect(zeroPayment.answers).to.include({ housing_loan_payments: '0', 'property-owned': 'with_mortgage' })
  })
})
