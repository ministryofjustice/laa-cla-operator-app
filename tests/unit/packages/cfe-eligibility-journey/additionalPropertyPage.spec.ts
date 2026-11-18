import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  getApplicableSteps,
  getNextStep,
  isControlledWorkComplete,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  PROPERTY_OWNERSHIP_OPTIONS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { additionalPropertyField, additionalPropertyPageContent } from '#packages/cfe-eligibility-journey/src/additionalPropertyPage/additionalPropertyBlock.js'
import { additionalPropertyStep } from '#packages/cfe-eligibility-journey/src/additionalPropertyPage/additionalPropertyStep.js'
import { propertyEntryStep } from '#packages/cfe-eligibility-journey/src/propertyEntryPage/propertyEntryStep.js'
import { propertyStep } from '#packages/cfe-eligibility-journey/src/propertyPage/propertyStep.js'
import {
  cannotUseServiceStep,
  cannotUseServiceStepCode,
} from '#packages/cfe-eligibility-journey/src/propertyLandlordPage/cannotUseServiceStep.js'

const QUESTION = 'Does your client own any other property, a holiday home or land?'
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const ADULT = { isUnder18: false }
const PASSPORTED_HOMELESS: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'yes',
  'property-owned': 'none',
}

describe('Controlled-work additional property page', () => {
  it('uses the shared eligibility-question layout, an H2 and the exact CCQ question and hints', () => {
    const steps = eligibilityJourney.steps ?? []
    const propertyEntryIndex = steps.findIndex(({ code }) => code === STEPS.propertyEntry)
    const additionalPropertyIndex = steps.findIndex(({ code }) => code === STEPS.additionalProperty)
    const content = JSON.stringify(additionalPropertyPageContent)
    const field = JSON.stringify(additionalPropertyField)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const propertySubmission = JSON.stringify(propertyStep.onSubmission)
    const propertyEntrySubmission = JSON.stringify(propertyEntryStep.onSubmission)

    expect(additionalPropertyIndex).to.be.greaterThan(propertyEntryIndex)
    expect(additionalPropertyStep.path).to.equal('/additional-property')
    expect(additionalPropertyStep.title).to.equal(QUESTION)
    expect(additionalPropertyStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(propertySubmission).to.include(STEPS.additionalProperty)
    expect(propertyEntrySubmission).to.include(STEPS.additionalProperty)
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include(`"text":"${QUESTION}"`)
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include(
      'This can be the sole property owned if not the home the client lives in, even if the property is abroad or not providing an income.',
    )
    expect(content).to.include(
      'If your client and their partner share other property, a holiday home or land, include this here.',
    )
    expect(content).to.include('"visibleWhen"')
    expect(content).to.include('immigration-or-asylum')
    expect(content).to.include('"partner"')
    expect(sharedLayout).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"text":"Guidance"')
    expect(additionalPropertyField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(additionalPropertyField.items).to.deep.equal([
      { value: 'with_mortgage', text: 'Yes, with a mortgage or loan' },
      { value: 'shared_ownership', text: 'Yes, through a shared ownership scheme' },
      { value: 'outright', text: 'Yes, owned outright' },
      { value: 'none', text: 'No' },
    ])
    expect(field).to.include('"message":"Select if your client owns any other property"')
  })

  it('shows the additional-property guidance and matter-specific subject-matter guidance', () => {
    const content = JSON.stringify(additionalPropertyPageContent)

    expect(content).to.include(
      '"content":"Properties owned that are not the \'main house\' (PDF, 599KB)"',
    )
    expect(content).to.include(`"href":["${GUIDANCE_URL}#page=36"]`)
    expect(content).to.include('"content":"Trapped capital (PDF, 599KB)"')
    expect(content).to.include(`"href":["${GUIDANCE_URL}#page=26"]`)
    expect(content).to.include('"content":"Subject matter of dispute (PDF, 599KB)"')
    expect(content).to.include(`"href":["${GUIDANCE_URL}#page=37"]`)
  })

  it('requires one of the four ownership options and reports the exact CCQ validation error', () => {
    const field = JSON.stringify(additionalPropertyField)

    expect(field).to.include('^(with_mortgage|shared_ownership|outright|none)$')
    expect(field).to.include('"message":"Select if your client owns any other property"')
    for (const value of PROPERTY_OWNERSHIP_OPTIONS) {
      expect(isValidControlledWorkAnswer('additional-property-owned', value)).to.equal(true)
    }
    for (const invalid of ['', undefined, null, 'yes', 'mortgage', true, false]) {
      expect(isValidControlledWorkAnswer('additional-property-owned', invalid)).to.equal(false)
    }
  })

  it('places the page after the applicable main-home questions without bypassing unavailable routes', () => {
    expect(getApplicableSteps(PASSPORTED_HOMELESS, ADULT)).to.deep.equal([
      STEPS.immigrationOrAsylum,
      STEPS.applicant,
      STEPS.property,
      STEPS.additionalProperty,
    ])
    expect(getNextStep(STEPS.property, PASSPORTED_HOMELESS, ADULT)).to.equal(STEPS.additionalProperty)

    const ownedHome = {
      ...PASSPORTED_HOMELESS,
      'property-owned': 'outright',
    } as const
    expect(getApplicableSteps(ownedHome, ADULT)).to.include(STEPS.propertyEntry)
    expect(getNextStep(STEPS.propertyEntry, ownedHome, ADULT)).to.equal(STEPS.additionalProperty)

    const sharedOwnershipHome = {
      ...PASSPORTED_HOMELESS,
      'property-owned': 'shared_ownership',
      'property-landlord': 'yes',
    } as const
    expect(getApplicableSteps(sharedOwnershipHome, ADULT)).to.include(STEPS.propertyEntry)
    expect(getApplicableSteps(sharedOwnershipHome, ADULT)).to.include(STEPS.additionalProperty)
    expect(getNextStep(STEPS.propertyEntry, sharedOwnershipHome, ADULT)).to.equal(STEPS.additionalProperty)

    const nonPassportedNoHome = {
      ...PASSPORTED_HOMELESS,
      passporting: 'no',
    } as const
    expect(getApplicableSteps(nonPassportedNoHome, ADULT)).to.not.include(STEPS.additionalProperty)
    expect(getNextStep(STEPS.property, nonPassportedNoHome, ADULT)).to.equal(undefined)
  })

  it('routes shared ownership to the existing cannot-use-service outcome and leaves other branches incomplete', () => {
    const submission = JSON.stringify(additionalPropertyStep.onSubmission)
    const sharedOwnershipAnswers = { ...PASSPORTED_HOMELESS, 'additional-property-owned': 'shared_ownership' } as const
    const noAdditionalPropertyAnswers = { ...PASSPORTED_HOMELESS, 'additional-property-owned': 'none' } as const
    const ownedAdditionalPropertyAnswers = {
      ...PASSPORTED_HOMELESS,
      'additional-property-owned': 'outright',
    } as const

    expect(additionalPropertyStep.onSubmission).to.have.length(1)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include(cannotUseServiceStepCode)
    expect(submission).to.include('controlled-work-incomplete')
    expect(JSON.stringify(additionalPropertyStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(additionalPropertyStep.onAccess)).to.include(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
    expect(JSON.stringify(cannotUseServiceStep.reachability)).to.include('additional-property-owned')
    expect(JSON.stringify(cannotUseServiceStep.blocks)).to.include(
      'You cannot use this service if your client owns a shared ownership property that they do not live in.',
    )
    expect(JSON.stringify(cannotUseServiceStep.blocks)).to.include('/change/additional-property')
    expect(getNextStep(STEPS.additionalProperty, sharedOwnershipAnswers, ADULT)).to.equal(undefined)
    expect(getNextStep(STEPS.additionalProperty, noAdditionalPropertyAnswers, ADULT)).to.equal(undefined)
    expect(getNextStep(STEPS.additionalProperty, ownedAdditionalPropertyAnswers, ADULT)).to.equal(undefined)
    expect(isControlledWorkComplete(noAdditionalPropertyAnswers, ADULT)).to.equal(false)
    expect(JSON.stringify(controlledWorkIncompleteStep.blocks)).to.include(
      'Further controlled-work questions are not yet available',
    )
  })

  it('prunes the answer when the client moves to a route without capital questions', () => {
    const withAdditionalProperty = {
      ...PASSPORTED_HOMELESS,
      'additional-property-owned': 'outright',
    } as const
    const noLongerApplicable = resolveControlledWorkJourney(
      {
        ...withAdditionalProperty,
        'immigration-or-asylum': 'yes',
        'asylum-support': 'yes',
      },
      ADULT,
    )

    expect(resolveControlledWorkJourney(withAdditionalProperty, ADULT).answers['additional-property-owned']).to.equal(
      'outright',
    )
    expect(noLongerApplicable.removedCodes).to.include('additional-property-owned')
  })
})
