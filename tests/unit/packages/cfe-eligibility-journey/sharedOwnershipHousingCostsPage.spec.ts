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
import {
  isHousingBenefitWithinSharedHousingCosts,
  isValidSharedHousingCostsFrequency,
} from '#packages/cfe-eligibility-journey/src/controlledWork/sharedOwnershipHousingCostsValidation.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  sharedOwnershipHousingCostFields,
  sharedOwnershipHousingCostsPageContent,
} from '#packages/cfe-eligibility-journey/src/sharedOwnershipHousingCostsPage/sharedOwnershipHousingCostsBlock.js'
import { sharedOwnershipHousingCostsStep } from '#packages/cfe-eligibility-journey/src/sharedOwnershipHousingCostsPage/sharedOwnershipHousingCostsStep.js'
import { propertyLandlordStep } from '#packages/cfe-eligibility-journey/src/propertyLandlordPage/propertyLandlordStep.js'

const ADULT = { isUnder18: false }
const SHARED_OWNERSHIP_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'property-owned': 'shared_ownership',
  'property-landlord': 'yes',
} as const satisfies ControlledWorkAnswers

describe('Controlled-work shared ownership housing-costs page', () => {
  it('uses the shared two-column question layout and the CCQ content', () => {
    const content = JSON.stringify(sharedOwnershipHousingCostsPageContent)
    const layout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const steps = eligibilityJourney.steps ?? []

    expect(sharedOwnershipHousingCostsStep.code).to.equal(STEPS.sharedOwnershipHousingCosts)
    expect(sharedOwnershipHousingCostsStep.path).to.equal('/shared-ownership-housing-costs')
    expect(sharedOwnershipHousingCostsStep.title).to.equal('Housing costs')
    expect(sharedOwnershipHousingCostsStep.view?.template).to.equal(
      'case_details/forge_forms/eligibility-question-form',
    )
    expect(steps.findIndex(({ code }) => code === STEPS.sharedOwnershipHousingCosts)).to.be.greaterThan(
      steps.findIndex(({ code }) => code === STEPS.propertyLandlord),
    )
    expect(JSON.stringify(sharedOwnershipHousingCostsStep.reachability)).to.include(
      CONTROLLED_WORK_DATA_KEYS.applicableSteps,
    )
    expect(JSON.stringify(sharedOwnershipHousingCostsStep.onAccess)).to.include(
      CONTROLLED_WORK_DATA_KEYS.firstMissingStep,
    )
    expect(JSON.stringify(sharedOwnershipHousingCostsStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(sharedOwnershipHousingCostsStep.onSubmission)).to.include(controlledWorkIncompleteStepCode)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.sharedOwnershipHousingCosts)

    for (const copy of [
      'Housing costs',
      'Enter the housing costs for the shared ownership scheme home your client lives in.',
      'If your client and their partner live separately, do not include the partner’s housing costs.',
      'What to include with housing payments',
      'Do not make any deductions for Housing Benefit.',
      'Living with someone else',
      'The Legal Aid Agency will assume that your client is liable for 50% of the housing costs unless there is evidence otherwise.',
      'Help with different payment frequencies',
      'If the payment frequencies for mortgage and rent are different, choose one and calculate the other to match.',
      'Select frequency of mortgage and rent payments',
      'What is the rent?',
      'What is the mortgage payment?',
      'Does your client get Housing Benefit for this home?',
      'Does your client or their partner get Housing Benefit for this home?',
      'Include any Housing Benefit paid to the client or landlord.',
      'Include any Housing Benefit paid to the client, partner or landlord.',
      'Every week',
      'Every 2 weeks',
      'Every 4 weeks',
      'Every month',
      'Total in last 3 months',
      'Housing costs (PDF, 599KB)',
      'Save and continue',
      'Guidance',
    ]) {
      expect(content).to.include(copy)
    }

    expect(content).to.include('"level":2')
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include('"inputType":"text"')
    expect(content).to.include('"inputmode":"decimal"')
    expect(content).to.include('"prefix":{"text":"£"}')
    expect(content).to.include('visibleWhen')
    expect(content).to.include('dependentWhen')
    expect(layout).to.include('"text":"Save and continue"')
    expect(layout).to.include('"text":"Guidance"')
  })

  it('declares the exact CCQ validation messages and input labels', () => {
    const fields = JSON.stringify(sharedOwnershipHousingCostFields)

    for (const message of [
      'Enter the rent amount.',
      'Rent must be a number. Enter 0 if this does not apply.',
      'Rent must be greater than or equal to 0',
      'Enter the mortgage payment. Enter 0 if this does not apply.',
      'Mortgage payment must be a number. Enter 0 if this does not apply.',
      'Mortgage must be greater than or equal to 0',
      'Select frequency of rent payments.',
      'Select yes if your client gets Housing Benefit for this home.',
      'Enter the Housing Benefit amount.',
      'Housing Benefit must be a number.',
      'Housing Benefit must be more than 0.',
      'Select frequency of Housing Benefit.',
      'Housing Benefit cannot be higher than housing costs.',
      'Enter amount of rent payments',
      'Enter the mortgage payment',
      'Amount',
      'Frequency',
    ]) {
      expect(fields).to.include(message)
    }
  })

  it('accepts valid amounts and frequencies and rejects missing, malformed, negative, or unsupported values', () => {
    for (const amount of ['0', '125.50', '£1,234.56']) {
      expect(isValidControlledWorkAnswer('rent', amount)).to.equal(true)
      expect(isValidControlledWorkAnswer('shared_ownership_mortgage', amount)).to.equal(true)
    }
    for (const amount of ['', undefined, null, '-1', '12.345', '1 1', 'not an amount']) {
      expect(isValidControlledWorkAnswer('rent', amount)).to.equal(false)
      expect(isValidControlledWorkAnswer('shared_ownership_mortgage', amount)).to.equal(false)
    }
    expect(isValidControlledWorkAnswer('housing_benefit_value', '125')).to.equal(true)
    for (const amount of ['', undefined, null, '0', '-1', '12.345', 'not an amount']) {
      expect(isValidControlledWorkAnswer('housing_benefit_value', amount)).to.equal(false)
    }

    for (const frequency of ['every_week', 'every_two_weeks', 'every_four_weeks', 'monthly', 'total']) {
      expect(isValidControlledWorkAnswer('combined_frequency', frequency)).to.equal(true)
    }
    for (const frequency of ['every_week', 'every_two_weeks', 'every_four_weeks', 'monthly']) {
      expect(isValidControlledWorkAnswer('housing_benefit_frequency', frequency)).to.equal(true)
    }
    expect(isValidControlledWorkAnswer('combined_frequency', 'three_months')).to.equal(false)
    expect(isValidControlledWorkAnswer('housing_benefit_frequency', 'total')).to.equal(false)
    expect(isValidControlledWorkAnswer('housing_benefit_relevant', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('housing_benefit_relevant', 'maybe')).to.equal(false)
  })

  it('requires frequency only for positive combined costs and Housing Benefit details only after Yes', () => {
    const missingPage = findMissingSteps(SHARED_OWNERSHIP_ANSWERS, ADULT).find(
      ({ stepCode }) => stepCode === STEPS.sharedOwnershipHousingCosts,
    )
    expect(missingPage?.answerCodes).to.deep.equal(['rent', 'shared_ownership_mortgage', 'housing_benefit_relevant'])

    const zeroCosts = {
      ...SHARED_OWNERSHIP_ANSWERS,
      rent: '0',
      shared_ownership_mortgage: '0',
      housing_benefit_relevant: 'no',
    } as const satisfies ControlledWorkAnswers
    expect(
      findMissingSteps(zeroCosts, ADULT).find(({ stepCode }) => stepCode === STEPS.sharedOwnershipHousingCosts),
    ).to.equal(undefined)
    expect(isValidSharedHousingCostsFrequency(undefined, '0', '0')).to.equal(true)
    expect(isValidSharedHousingCostsFrequency('invalid', '0', '0')).to.equal(true)
    expect(isValidSharedHousingCostsFrequency(undefined, '100', '0')).to.equal(false)
    const partialCosts = {
      ...SHARED_OWNERSHIP_ANSWERS,
      shared_ownership_mortgage: '100',
    } as const satisfies ControlledWorkAnswers
    expect(
      findMissingSteps(partialCosts, ADULT).find(({ stepCode }) => stepCode === STEPS.sharedOwnershipHousingCosts)
        ?.answerCodes,
    ).to.deep.equal(['rent', 'combined_frequency', 'housing_benefit_relevant'])

    const costsNeedFrequency = {
      ...zeroCosts,
      rent: '100',
    } as const satisfies ControlledWorkAnswers
    expect(
      findMissingSteps(costsNeedFrequency, ADULT).find(({ stepCode }) => stepCode === STEPS.sharedOwnershipHousingCosts)
        ?.answerCodes,
    ).to.deep.equal(['combined_frequency'])

    const benefitsNeedDetails = {
      ...costsNeedFrequency,
      combined_frequency: 'monthly',
      housing_benefit_relevant: 'yes',
    } as const satisfies ControlledWorkAnswers
    expect(
      findMissingSteps(benefitsNeedDetails, ADULT).find(({ stepCode }) => stepCode === STEPS.sharedOwnershipHousingCosts)
        ?.answerCodes,
    ).to.deep.equal(['housing_benefit_value', 'housing_benefit_frequency'])
  })

  it('compares Housing Benefit and housing costs using their annualised frequencies', () => {
    const monthlyCosts = {
      rent: '100',
      mortgage: '100',
      combinedFrequency: 'monthly',
      benefitFrequency: 'monthly',
    }
    expect(isHousingBenefitWithinSharedHousingCosts('200', monthlyCosts)).to.equal(true)
    expect(isHousingBenefitWithinSharedHousingCosts('201', monthlyCosts)).to.equal(false)
    expect(
      isHousingBenefitWithinSharedHousingCosts('400', {
        ...monthlyCosts,
        rent: '100',
        mortgage: '0',
        combinedFrequency: 'every_week',
      }),
    ).to.equal(true)
    expect(
      isHousingBenefitWithinSharedHousingCosts('450', {
        ...monthlyCosts,
        rent: '100',
        mortgage: '0',
        combinedFrequency: 'every_week',
      }),
    ).to.equal(false)
    expect(
      isHousingBenefitWithinSharedHousingCosts('0.30', {
        ...monthlyCosts,
        rent: '0.10',
        mortgage: '0.20',
      }),
    ).to.equal(true)
  })

  it('routes into the page only for shared ownership, landlord Yes, and a non-passported means route', () => {
    const nextFromLandlord = {
      ...SHARED_OWNERSHIP_ANSWERS,
      'property-landlord': 'yes',
    } as const satisfies ControlledWorkAnswers
    expect(getApplicableSteps(nextFromLandlord, ADULT)).to.include(STEPS.sharedOwnershipHousingCosts)
    expect(getNextStep(STEPS.propertyLandlord, nextFromLandlord, ADULT)).to.equal(STEPS.sharedOwnershipHousingCosts)
    expect(JSON.stringify(propertyLandlordStep.onSubmission)).to.include(STEPS.sharedOwnershipHousingCosts)

    const otherOwnership = { ...nextFromLandlord, 'property-owned': 'outright' } as const
    const landlordNo = { ...nextFromLandlord, 'property-landlord': 'no' } as const
    const passported = { ...nextFromLandlord, passporting: 'yes' } as const
    expect(getApplicableSteps(otherOwnership, ADULT)).not.to.include(STEPS.sharedOwnershipHousingCosts)
    expect(getApplicableSteps(landlordNo, ADULT)).not.to.include(STEPS.sharedOwnershipHousingCosts)
    expect(getApplicableSteps(passported, ADULT)).not.to.include(STEPS.sharedOwnershipHousingCosts)

    const oldAnswers = {
      ...nextFromLandlord,
      rent: '100',
      shared_ownership_mortgage: '50',
      combined_frequency: 'monthly',
      housing_benefit_relevant: 'no',
    } as const satisfies ControlledWorkAnswers
    expect(
      resolveControlledWorkJourney({ ...oldAnswers, 'property-owned': 'outright' }, ADULT).removedCodes,
    ).to.include.members([
      'property-landlord',
      'rent',
      'shared_ownership_mortgage',
      'combined_frequency',
      'housing_benefit_relevant',
    ])
    expect(
      resolveControlledWorkJourney(
        { ...oldAnswers, rent: '0', shared_ownership_mortgage: '0', housing_benefit_relevant: 'no' },
        ADULT,
      ).removedCodes,
    ).to.include('combined_frequency')
    expect(getNextStep(STEPS.sharedOwnershipHousingCosts, oldAnswers, ADULT)).to.equal(STEPS.propertyEntry)
    expect(isControlledWorkComplete(oldAnswers, ADULT)).to.equal(false)
  })
})
