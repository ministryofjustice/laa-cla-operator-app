import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getNextStep,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import {
  partnerOutgoingsPageContent,
  partnerOutgoingsQuestionFields,
} from '#packages/cfe-eligibility-journey/src/outgoingsPage/outgoingsBlock.js'
import { outgoingsStep } from '#packages/cfe-eligibility-journey/src/outgoingsPage/outgoingsStep.js'
import { partnerOutgoingsStep } from '#packages/cfe-eligibility-journey/src/partnerOutgoingsPage/partnerOutgoingsStep.js'

const ADULT: ControlledWorkContext = { isUnder18: false }
const CHILDCARE_ELIGIBLE: ControlledWorkContext = { ...ADULT, eligibleForChildcareCosts: true }
const OUTGOINGS_CATEGORY_COUNT = 3
const PARTNER_ANSWERS = {
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
  'partner-receives-benefits': 'no',
  partner_friends_or_family_relevant: 'no',
  partner_maintenance_relevant: 'no',
  partner_property_or_lodger_relevant: 'no',
  partner_pension_relevant: 'no',
  partner_student_finance_relevant: 'no',
  partner_other_relevant: 'no',
  'partner-other-income-completed': 'yes',
  maintenance_payments_relevant: 'no',
  legal_aid_payments_relevant: 'no',
} as const satisfies ControlledWorkAnswers

describe('Controlled-work partner outgoings page', () => {
  it('uses the shared eligibility layout after client outgoings and remains at the incomplete boundary', () => {
    const steps = eligibilityJourney.steps ?? []
    const outgoingsIndex = steps.findIndex(({ code }) => code === STEPS.outgoings)
    const partnerOutgoingsIndex = steps.findIndex(({ code }) => code === STEPS.partnerOutgoings)
    const submission = JSON.stringify(partnerOutgoingsStep.onSubmission)

    expect(partnerOutgoingsIndex).to.be.greaterThan(outgoingsIndex)
    expect(partnerOutgoingsStep.path).to.equal('/partner-outgoings')
    expect(partnerOutgoingsStep.title).to.equal("The partner's outgoings and deductions")
    expect(partnerOutgoingsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(partnerOutgoingsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(partnerOutgoingsStep.onAccess)).to.include(STEPS.outgoings)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')
    expect(JSON.stringify(outgoingsStep.onSubmission)).to.include(STEPS.partnerOutgoings)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.partnerOutgoings)
  })

  it('matches the CCQ partner heading, caption, questions, hints, fields and guidance', () => {
    const content = JSON.stringify(partnerOutgoingsPageContent)

    for (const copy of [
      "The partner's outgoings and deductions",
      'Partner',
      'Do not include any outgoings already entered for your client.',
      'Does the partner pay for childcare?',
      'For example, to a childminder, nanny or nursery.',
      'Does the partner pay maintenance to a former partner?',
      'This includes child maintenance.',
      'Does the partner make payments towards legal aid for a criminal case?',
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
    expect(content).to.include('partner_maintenance_payments_relevant')
    expect(content).to.include('partner_maintenance_payments_conditional_value')
    expect(content).to.include('partner_maintenance_payments_frequency')
    expect(content).to.not.include('Total in last 3 months')
    expect(partnerOutgoingsQuestionFields).to.have.length(OUTGOINGS_CATEGORY_COUNT)
  })

  it('declares the exact CCQ partner validation messages and valid formats', () => {
    const fields = JSON.stringify(partnerOutgoingsQuestionFields)

    for (const message of [
      'Select yes if the partner pays for childcare',
      'Enter amount paid for childcare',
      'Amount paid for childcare must be a number',
      'Amount paid for childcare must be more than 0',
      'Select frequency of childcare payments',
      'Select yes if the partner pays maintenance to a former partner',
      'Enter amount of maintenance paid to a former partner',
      'Amount of maintenance paid to a former partner must be a number',
      'Amount of maintenance paid to a former partner must be more than 0',
      'Select frequency of maintenance payments to a former partner',
      'Select yes if the partner makes payments toward legal aid for a criminal case',
      'Enter amount paid toward legal aid in a criminal case',
      'Amount paid toward legal aid in a criminal case must be a number',
      'Amount paid toward legal aid in a criminal case must be more than 0',
      'Select frequency of payments towards legal aid in a criminal case',
    ]) {
      expect(fields).to.include(message)
    }

    expect(isValidControlledWorkAnswer('partner_maintenance_payments_relevant', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('partner_maintenance_payments_relevant', 'maybe')).to.equal(false)
    expect(isValidControlledWorkAnswer('partner_maintenance_payments_conditional_value', '125.50')).to.equal(true)
    expect(isValidControlledWorkAnswer('partner_maintenance_payments_conditional_value', '0')).to.equal(false)
    expect(isValidControlledWorkAnswer('partner_maintenance_payments_conditional_value', '125.555')).to.equal(false)
    expect(isValidControlledWorkAnswer('partner_maintenance_payments_frequency', 'every_week')).to.equal(true)
    expect(isValidControlledWorkAnswer('partner_maintenance_payments_frequency', 'total')).to.equal(false)
  })

  it('requires displayed choices and conditional fields only when applicable', () => {
    const ineligibleMissing = findMissingSteps(PARTNER_ANSWERS, ADULT).find(
      ({ stepCode }) => stepCode === STEPS.partnerOutgoings,
    )
    const eligibleMissing = findMissingSteps(PARTNER_ANSWERS, CHILDCARE_ELIGIBLE).find(
      ({ stepCode }) => stepCode === STEPS.partnerOutgoings,
    )

    expect(ineligibleMissing?.answerCodes).to.deep.equal([
      'partner_maintenance_payments_relevant',
      'partner_legal_aid_payments_relevant',
    ])
    expect(eligibleMissing?.answerCodes).to.deep.equal([
      'partner_childcare_payments_relevant',
      'partner_maintenance_payments_relevant',
      'partner_legal_aid_payments_relevant',
    ])

    const conditionalMissing = findMissingSteps(
      {
        ...PARTNER_ANSWERS,
        partner_maintenance_payments_relevant: 'yes',
      },
      ADULT,
    ).find(({ stepCode }) => stepCode === STEPS.partnerOutgoings)
    expect(conditionalMissing?.answerCodes).to.deep.equal([
      'partner_legal_aid_payments_relevant',
      'partner_maintenance_payments_conditional_value',
      'partner_maintenance_payments_frequency',
    ])
  })

  it('routes after client outgoings only for a partner on the means-tested non-passported route', () => {
    expect(getApplicableSteps(PARTNER_ANSWERS, ADULT)).to.include(STEPS.partnerOutgoings)
    expect(getNextStep(STEPS.outgoings, PARTNER_ANSWERS, ADULT)).to.equal(STEPS.partnerOutgoings)
    expect(getApplicableSteps({ ...PARTNER_ANSWERS, partner: 'no' }, ADULT)).to.not.include(STEPS.partnerOutgoings)
    expect(
      getApplicableSteps({ ...PARTNER_ANSWERS, passporting: 'yes' }, ADULT),
    ).to.not.include(STEPS.partnerOutgoings)

    const answered = {
      ...PARTNER_ANSWERS,
      partner_maintenance_payments_relevant: 'no',
      partner_legal_aid_payments_relevant: 'no',
    } as const satisfies ControlledWorkAnswers
    expect(getNextStep(STEPS.partnerOutgoings, answered, ADULT)).to.equal(STEPS.property)
  })

  it('removes conditional and page answers when they become irrelevant', () => {
    const saved = {
      ...PARTNER_ANSWERS,
      partner_maintenance_payments_relevant: 'yes',
      partner_maintenance_payments_conditional_value: '250',
      partner_maintenance_payments_frequency: 'monthly',
      partner_legal_aid_payments_relevant: 'no',
    } as const satisfies ControlledWorkAnswers

    const { answers: changedToNo } = resolveControlledWorkJourney(
      { ...saved, partner_maintenance_payments_relevant: 'no' },
      ADULT,
    )
    expect(changedToNo).to.not.have.property('partner_maintenance_payments_conditional_value')
    expect(changedToNo).to.not.have.property('partner_maintenance_payments_frequency')

    const { answers: partnerRemoved } = resolveControlledWorkJourney({ ...saved, partner: 'no' }, ADULT)
    expect(partnerRemoved).to.not.have.property('partner_maintenance_payments_relevant')
    expect(partnerRemoved).to.not.have.property('partner_maintenance_payments_conditional_value')

    const { answers: passported } = resolveControlledWorkJourney({ ...saved, passporting: 'yes' }, ADULT)
    expect(passported).to.not.have.property('partner_legal_aid_payments_relevant')
    expect(passported).to.not.have.property('partner_maintenance_payments_frequency')
  })
})
