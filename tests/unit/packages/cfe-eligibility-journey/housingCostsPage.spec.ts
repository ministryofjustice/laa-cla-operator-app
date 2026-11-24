import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep, controlledWorkIncompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getNextStep,
  isControlledWorkComplete,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  housingCostsFields,
  housingCostsPageContent,
} from '#packages/cfe-eligibility-journey/src/housingCostsPage/housingCostsBlock.js'
import { housingCostsStep } from '#packages/cfe-eligibility-journey/src/housingCostsPage/housingCostsStep.js'
import { propertyStep } from '#packages/cfe-eligibility-journey/src/propertyPage/propertyStep.js'
import { isHousingBenefitWithinSharedHousingCosts } from '#packages/cfe-eligibility-journey/src/controlledWork/sharedOwnershipHousingCostsValidation.js'

const ADULT = { isUnder18: false }
const NO_HOME = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'property-owned': 'none',
} as const satisfies ControlledWorkAnswers

describe('Controlled-work housing costs page', () => {
  it('uses the shared layout and the exact CCQ content', () => {
    const content = JSON.stringify(housingCostsPageContent)
    const layout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const steps = eligibilityJourney.steps ?? []

    expect(housingCostsStep.code).to.equal(STEPS.housingCosts)
    expect(housingCostsStep.path).to.equal('/housing-costs')
    expect(housingCostsStep.title).to.equal('Housing costs')
    expect(housingCostsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(steps.findIndex(({ code }) => code === STEPS.housingCosts)).to.be.greaterThan(
      steps.findIndex(({ code }) => code === STEPS.property),
    )
    expect(steps.findIndex(({ code }) => code === STEPS.housingCosts)).to.be.lessThan(
      steps.findIndex(({ code }) => code === STEPS.propertyEntry),
    )
    for (const copy of [
      'Housing costs',
      'Enter the housing costs for the home your client lives in.',
      'If your client and their partner live separately, do not include the partner’s housing costs.',
      'Housing payments',
      'For example, rent, mortgage or board and lodgings.',
      'What to include with housing payments',
      'Do not make any deductions for Housing Benefit.',
      'If your client is paying board and lodgings',
      'Living with someone else',
      'The Legal Aid Agency will assume that your client is liable for 50% of the housing costs',
      'Enter amount',
      'Enter 0 if this does not apply.',
      'Select frequency',
      'Every week',
      'Every 2 weeks',
      'Every 4 weeks',
      'Every month',
      'Housing Benefit',
      'Include any Housing Benefit paid to the client or landlord.',
      'Include any Housing Benefit paid to the client, partner or landlord.',
      'Housing costs (PDF, 599KB)',
      'Guidance',
    ]) {
      expect(content).to.include(copy)
    }
    expect(content).not.to.include('Total in last 3 months')
    expect(content).to.include('\"width\":\"two-thirds\"')
    expect(content).to.include('\"width\":\"one-third\"')
    expect(layout).to.include('\"text\":\"Save and continue\"')
  })

  it('declares the exact CCQ validation messages', () => {
    const fields = JSON.stringify(housingCostsFields)
    for (const message of [
      'Enter the housing payments amount. Enter 0 if this does not apply.',
      'Housing payments must be a number. Enter 0 if this does not apply.',
      'Housing payments must be 0 or more.',
      'Select frequency of housing payments.',
      'Select yes if housing benefit is claimed at the home your client lives in',
      'Enter the Housing Benefit amount.',
      'Housing Benefit must be a number.',
      'Housing Benefit must be more than 0',
      'Select frequency of Housing Benefit.',
      'Housing Benefit cannot be higher than housing costs',
    ]) {
      expect(fields).to.include(message)
    }
  })

  it('accepts zero and positive payments, rejects negative and malformed values, and allows only the four frequencies', () => {
    for (const amount of ['0', '0.00', '125.50', '£1,234.56']) {
      expect(isValidControlledWorkAnswer('housing_payments', amount)).to.equal(true)
    }
    for (const amount of ['', undefined, null, '-1', '-0.01', '1 1', 'not an amount']) {
      expect(isValidControlledWorkAnswer('housing_payments', amount)).to.equal(false)
    }
    for (const frequency of ['every_week', 'every_two_weeks', 'every_four_weeks', 'monthly']) {
      expect(isValidControlledWorkAnswer('housing_payments_frequency', frequency)).to.equal(true)
    }
    expect(isValidControlledWorkAnswer('housing_payments_frequency', 'total')).to.equal(false)
  })

  it('requires frequency only for a positive payment and Housing Benefit details only after Yes', () => {
    expect(findMissingSteps(NO_HOME, ADULT).find(({ stepCode }) => stepCode === STEPS.housingCosts)?.answerCodes)
      .to.deep.equal(['housing_payments', 'housing_benefit_relevant'])

    expect(findMissingSteps({ ...NO_HOME, housing_payments: '0', housing_benefit_relevant: 'no' }, ADULT)
      .find(({ stepCode }) => stepCode === STEPS.housingCosts)).to.equal(undefined)
    expect(findMissingSteps({ ...NO_HOME, housing_payments: '100' }, ADULT)
      .find(({ stepCode }) => stepCode === STEPS.housingCosts)?.answerCodes)
      .to.deep.equal(['housing_payments_frequency', 'housing_benefit_relevant'])

    const yesBenefit = {
      ...NO_HOME,
      housing_payments: '100',
      housing_payments_frequency: 'monthly',
      housing_benefit_relevant: 'yes',
    } as const satisfies ControlledWorkAnswers
    expect(findMissingSteps(yesBenefit, ADULT).find(({ stepCode }) => stepCode === STEPS.housingCosts)?.answerCodes)
      .to.deep.equal(['housing_benefit_value', 'housing_benefit_frequency'])
  })

  it('compares Housing Benefit with annualised housing costs', () => {
    const monthly = { rent: '100', mortgage: '0', combinedFrequency: 'monthly', benefitFrequency: 'monthly' }
    expect(isHousingBenefitWithinSharedHousingCosts('100', monthly)).to.equal(true)
    expect(isHousingBenefitWithinSharedHousingCosts('101', monthly)).to.equal(false)
    expect(isHousingBenefitWithinSharedHousingCosts('450', {
      ...monthly,
      rent: '100',
      combinedFrequency: 'every_week',
      benefitFrequency: 'monthly',
    })).to.equal(false)
  })

  it('applies only to a non-owned home on a means-tested, non-passported route', () => {
    expect(getApplicableSteps(NO_HOME, ADULT)).to.include(STEPS.housingCosts)
    expect(getApplicableSteps({ ...NO_HOME, passporting: 'yes' }, ADULT)).not.to.include(STEPS.housingCosts)
    expect(getApplicableSteps({ ...NO_HOME, 'property-owned': 'outright' }, ADULT)).not.to.include(STEPS.housingCosts)
    expect(getApplicableSteps({ ...NO_HOME, 'property-owned': 'shared_ownership' }, ADULT)).not.to.include(STEPS.housingCosts)
  })

  it('routes property to housing costs and housing costs to additional property', () => {
    expect(getNextStep(STEPS.property, NO_HOME, ADULT)).to.equal(STEPS.housingCosts)
    expect(JSON.stringify(propertyStep.onSubmission)).to.include(STEPS.housingCosts)
    const complete = {
      ...NO_HOME,
      housing_payments: '200',
      housing_payments_frequency: 'every_two_weeks',
      housing_benefit_relevant: 'no',
    } as const satisfies ControlledWorkAnswers
    expect(getNextStep(STEPS.housingCosts, complete, ADULT)).to.equal(STEPS.additionalProperty)
    expect(getApplicableSteps(complete, ADULT)).to.include(STEPS.additionalProperty)
    expect(isControlledWorkComplete(complete, ADULT)).to.equal(false)
  })

  it('redirects direct access through the incomplete hub until earlier pages are answered', () => {
    expect(JSON.stringify(housingCostsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(housingCostsStep.onAccess)).to.include(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
    expect(JSON.stringify(housingCostsStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(housingCostsStep.onSubmission)).to.include(controlledWorkIncompleteStepCode)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.housingCosts)
  })

  it('prunes housing answers and conditional fields, preserving unrelated answers', () => {
    const oldAnswers = {
      ...NO_HOME,
      housing_payments: '200',
      housing_payments_frequency: 'monthly',
      housing_benefit_relevant: 'yes',
      housing_benefit_value: '100',
      housing_benefit_frequency: 'monthly',
      'additional-property-owned': 'none',
    } as const satisfies ControlledWorkAnswers

    const noBenefit = resolveControlledWorkJourney({
      ...oldAnswers,
      housing_benefit_relevant: 'no',
    }, ADULT)
    expect(noBenefit.removedCodes).to.include.members(['housing_benefit_value', 'housing_benefit_frequency'])
    expect(noBenefit.answers).to.include({ 'property-owned': 'none', housing_benefit_relevant: 'no' })

    const zero = resolveControlledWorkJourney({ ...oldAnswers, housing_payments: '0' }, ADULT)
    expect(zero.removedCodes).to.include('housing_payments_frequency')

    const passported = resolveControlledWorkJourney({ ...oldAnswers, passporting: 'yes' }, ADULT)
    expect(passported.removedCodes).to.include.members([
      'housing_payments',
      'housing_payments_frequency',
      'housing_benefit_relevant',
      'housing_benefit_value',
      'housing_benefit_frequency',
    ])

    const newOwnership = resolveControlledWorkJourney({ ...oldAnswers, 'property-owned': 'outright' }, ADULT)
    expect(newOwnership.removedCodes).to.include('housing_payments')
  })
})
