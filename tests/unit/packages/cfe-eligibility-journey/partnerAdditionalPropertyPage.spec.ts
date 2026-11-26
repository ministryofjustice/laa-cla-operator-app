import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  getApplicableSteps,
  getFirstMissingStep,
  getNextStep,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  PROPERTY_OWNERSHIP_OPTIONS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  cannotUseServiceStep,
  cannotUseServiceStepCode,
} from '#packages/cfe-eligibility-journey/src/propertyLandlordPage/cannotUseServiceStep.js'
import { additionalPropertyStep } from '#packages/cfe-eligibility-journey/src/additionalPropertyPage/additionalPropertyStep.js'
import { additionalPropertyDetailsStep } from '#packages/cfe-eligibility-journey/src/additionalPropertyDetailsPage/additionalPropertyDetailsStep.js'
import {
  partnerAdditionalPropertyField,
  partnerAdditionalPropertyPageContent,
} from '#packages/cfe-eligibility-journey/src/partnerAdditionalPropertyPage/partnerAdditionalPropertyBlock.js'
import { partnerAdditionalPropertyStep } from '#packages/cfe-eligibility-journey/src/partnerAdditionalPropertyPage/partnerAdditionalPropertyStep.js'
import { partnerAdditionalPropertyDetailsStep } from '#packages/cfe-eligibility-journey/src/partnerAdditionalPropertyDetailsPage/partnerAdditionalPropertyDetailsStep.js'

const QUESTION = 'Does the partner own any other property, a holiday home or land?'
const ADULT = { isUnder18: false }
const PASSPORTED_PARTNER_BASE: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'yes',
  passporting: 'yes',
  'partner-over-60': 'no',
  'property-owned': 'none',
  'additional-property-owned': 'none',
}

describe('Controlled-work partner additional property page', () => {
  it('uses the shared eligibility-question layout, an H2 and the exact CCQ content', () => {
    const steps = eligibilityJourney.steps ?? []
    const additionalPropertyIndex = steps.findIndex(({ code }) => code === STEPS.additionalProperty)
    const additionalPropertyDetailsIndex = steps.findIndex(({ code }) => code === STEPS.additionalPropertyDetails)
    const partnerAdditionalPropertyIndex = steps.findIndex(({ code }) => code === STEPS.partnerAdditionalProperty)
    const partnerAdditionalPropertyDetailsIndex = steps.findIndex(
      ({ code }) => code === STEPS.partnerAdditionalPropertyDetails,
    )
    const content = JSON.stringify(partnerAdditionalPropertyPageContent)
    const field = JSON.stringify(partnerAdditionalPropertyField)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const submission = JSON.stringify(partnerAdditionalPropertyStep.onSubmission)
    const additionalPropertySubmission = JSON.stringify(additionalPropertyStep.onSubmission)
    const additionalPropertyDetailsSubmission = JSON.stringify(additionalPropertyDetailsStep.onSubmission)

    expect(partnerAdditionalPropertyIndex).to.be.greaterThan(additionalPropertyIndex)
    expect(partnerAdditionalPropertyIndex).to.be.greaterThan(additionalPropertyDetailsIndex)
    expect(partnerAdditionalPropertyDetailsIndex).to.be.greaterThan(partnerAdditionalPropertyIndex)
    expect(partnerAdditionalPropertyStep.path).to.equal('/partner-additional-property')
    expect(partnerAdditionalPropertyStep.title).to.equal(QUESTION)
    expect(partnerAdditionalPropertyStep.view?.template).to.equal(
      'case_details/forge_forms/eligibility-question-form',
    )
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include(`"text":"${QUESTION}"`)
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include(
      'This can be the sole property owned if not the home the client lives in, even if the property is abroad or not providing an income.',
    )
    expect(content).to.include('Do not include any property or land already entered for your client.')
    expect(sharedLayout).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"text":"Guidance"')
    expect(partnerAdditionalPropertyField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(partnerAdditionalPropertyField.items).to.deep.equal([
      { value: 'with_mortgage', text: 'Yes, with a mortgage or loan' },
      { value: 'shared_ownership', text: 'Yes, through a shared ownership scheme' },
      { value: 'outright', text: 'Yes, owned outright' },
      { value: 'none', text: 'No' },
    ])
    expect(field).to.include('"message":"Select if the partner owns any other property"')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include(cannotUseServiceStepCode)
    expect(submission).to.include('controlled-work-incomplete')
    expect(submission).to.include(STEPS.assets)
    expect(submission).to.include(STEPS.partnerAdditionalPropertyDetails)
    expect(additionalPropertySubmission).to.include(STEPS.partnerAdditionalProperty)
    expect(additionalPropertyDetailsSubmission).to.include(STEPS.partnerAdditionalProperty)
    expect(JSON.stringify(partnerAdditionalPropertyStep.reachability)).to.include(
      CONTROLLED_WORK_DATA_KEYS.applicableSteps,
    )
  })

  it('requires one of the four ownership options and reports the exact CCQ validation error', () => {
    const field = JSON.stringify(partnerAdditionalPropertyField)

    expect(field).to.include('^(with_mortgage|shared_ownership|outright|none)$')
    expect(field).to.include('"message":"Select if the partner owns any other property"')
    for (const value of PROPERTY_OWNERSHIP_OPTIONS) {
      expect(isValidControlledWorkAnswer('partner-additional-property-owned', value)).to.equal(true)
    }
    for (const invalid of ['', undefined, null, 'yes', 'mortgage', true, false]) {
      expect(isValidControlledWorkAnswer('partner-additional-property-owned', invalid)).to.equal(false)
    }
  })

  it('follows the client additional-property gate and requires its details before this page', () => {
    const noClientProperty = { ...PASSPORTED_PARTNER_BASE }
    expect(getApplicableSteps(noClientProperty, ADULT)).to.include(STEPS.partnerAdditionalProperty)
    expect(getNextStep(STEPS.additionalProperty, noClientProperty, ADULT)).to.equal(STEPS.partnerAdditionalProperty)
    expect(getFirstMissingStep(noClientProperty, ADULT)).to.equal(STEPS.partnerAdditionalProperty)

    const clientPropertyNeedsDetails = {
      ...noClientProperty,
      'additional-property-owned': 'outright',
    } as const
    expect(getApplicableSteps(clientPropertyNeedsDetails, ADULT)).to.include(STEPS.additionalPropertyDetails)
    expect(getApplicableSteps(clientPropertyNeedsDetails, ADULT)).not.to.include(STEPS.partnerAdditionalProperty)

    const clientDetailsCompleted = {
      ...clientPropertyNeedsDetails,
      'additional-property-details-completed': 'yes',
    } as const
    expect(getNextStep(STEPS.additionalPropertyDetails, clientDetailsCompleted, ADULT)).to.equal(
      STEPS.partnerAdditionalProperty,
    )
  })

  it('prunes the answer when the partner or the relevant client property route no longer applies', () => {
    const answered = {
      ...PASSPORTED_PARTNER_BASE,
      'partner-additional-property-owned': 'outright',
    } as const
    const noPartner = resolveControlledWorkJourney({ ...answered, partner: 'no' }, ADULT)
    expect(noPartner.answers).not.to.have.property('partner-additional-property-owned')
    expect(noPartner.removedCodes).to.include('partner-additional-property-owned')

    const newlyRequiredClientDetails = resolveControlledWorkJourney(
      { ...answered, 'additional-property-owned': 'with_mortgage' },
      ADULT,
    )
    expect(newlyRequiredClientDetails.steps).to.include(STEPS.additionalPropertyDetails)
    expect(newlyRequiredClientDetails.steps).not.to.include(STEPS.partnerAdditionalProperty)
    expect(newlyRequiredClientDetails.removedCodes).to.include('partner-additional-property-owned')
  })

  it('routes shared ownership to the existing cannot-use-service outcome without inventing later pages', () => {
    const sharedOwnershipAnswers = {
      ...PASSPORTED_PARTNER_BASE,
      'partner-additional-property-owned': 'shared_ownership',
    } as const
    const submission = JSON.stringify(partnerAdditionalPropertyStep.onSubmission)
    const exit = JSON.stringify(cannotUseServiceStep)

    expect(getNextStep(STEPS.partnerAdditionalProperty, sharedOwnershipAnswers, ADULT)).to.equal(undefined)
    expect(submission).to.include(cannotUseServiceStepCode)
    expect(exit).to.include('partner-additional-property-owned')
    expect(exit).to.include(
      'You cannot use this service if your client or their partner owns a shared ownership property that they do not live in.',
    )
    expect(exit).to.include('/change/partner-additional-property')

    const ownedPropertyAnswers = {
      ...PASSPORTED_PARTNER_BASE,
      'partner-additional-property-owned': 'outright',
    } as const
    expect(getNextStep(STEPS.partnerAdditionalProperty, ownedPropertyAnswers, ADULT)).to.equal(
      STEPS.partnerAdditionalPropertyDetails,
    )
    expect(getApplicableSteps(ownedPropertyAnswers, ADULT)).to.include(STEPS.partnerAdditionalPropertyDetails)
    expect(JSON.stringify(partnerAdditionalPropertyDetailsStep.onAccess)).to.include(
      CONTROLLED_WORK_DATA_KEYS.firstMissingStep,
    )
  })
})
