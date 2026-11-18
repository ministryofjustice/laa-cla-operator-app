import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import {
  getApplicableSteps,
  findMissingSteps,
  getFirstMissingStep,
  getNextStep,
  isControlledWorkComplete,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS, type ControlledWorkAnswers } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { propertyLandlordPageContent, propertyLandlordField } from '#packages/cfe-eligibility-journey/src/propertyLandlordPage/propertyLandlordBlock.js'
import {
  cannotUseServiceStep,
  cannotUseServiceStepCode,
} from '#packages/cfe-eligibility-journey/src/propertyLandlordPage/cannotUseServiceStep.js'
import { propertyLandlordStep } from '#packages/cfe-eligibility-journey/src/propertyLandlordPage/propertyLandlordStep.js'
import { propertyStep } from '#packages/cfe-eligibility-journey/src/propertyPage/propertyStep.js'

const QUESTION = 'Is the landlord the only other joint-owner?'
const PASSPORTED_SHARED_OWNERSHIP: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'yes',
  'property-owned': 'shared_ownership',
}

describe('Controlled-work property landlord page', () => {
  it('uses the shared eligibility-question layout, H2 question, and exact Yes/No options', () => {
    const content = JSON.stringify(propertyLandlordPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const field = JSON.stringify(propertyLandlordField)

    expect(propertyLandlordStep.title).to.equal(QUESTION)
    expect(propertyLandlordStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include(`"text":"${QUESTION}"`)
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"content":"Properties (PDF, 599KB)"')
    expect(sharedLayout).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"text":"Guidance"')
    expect(propertyLandlordField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(propertyLandlordField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(field).to.include('"message":"Select yes if the landlord is the only other joint-owner"')
  })

  it('requires a valid Yes/No answer and uses the exact CCQ validation message', () => {
    const field = JSON.stringify(propertyLandlordField)

    expect(field).to.include('^(yes|no)$')
    expect(field).to.include('"message":"Select yes if the landlord is the only other joint-owner"')
    expect(isValidControlledWorkAnswer('property-landlord', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('property-landlord', 'no')).to.equal(true)
    for (const invalid of ['', undefined, null, 'maybe', 'true', true, false]) {
      expect(isValidControlledWorkAnswer('property-landlord', invalid)).to.equal(false)
    }
  })

  it('only adds the page for a shared-ownership main home and routes there from property', () => {
    const steps = eligibilityJourney.steps ?? []
    const propertyIndex = steps.findIndex(({ code }) => code === STEPS.property)
    const landlordIndex = steps.findIndex(({ code }) => code === STEPS.propertyLandlord)
    const noServiceIndex = steps.findIndex(({ code }) => code === cannotUseServiceStepCode)

    expect(landlordIndex).to.be.greaterThan(propertyIndex)
    expect(noServiceIndex).to.be.greaterThan(landlordIndex)
    expect(getApplicableSteps(PASSPORTED_SHARED_OWNERSHIP, { isUnder18: false })).to.include(STEPS.propertyLandlord)
    expect(
      findMissingSteps(PASSPORTED_SHARED_OWNERSHIP, { isUnder18: false }).find(
        ({ stepCode }) => stepCode === STEPS.propertyLandlord,
      )?.answerCodes,
    ).to.deep.equal(['property-landlord'])
    expect(getFirstMissingStep(PASSPORTED_SHARED_OWNERSHIP, { isUnder18: false })).to.equal(STEPS.propertyLandlord)
    expect(getNextStep(STEPS.property, PASSPORTED_SHARED_OWNERSHIP, { isUnder18: false })).to.equal(
      STEPS.propertyLandlord,
    )

    const otherOwnership: ControlledWorkAnswers = {
      ...PASSPORTED_SHARED_OWNERSHIP,
      'property-owned': 'outright',
    }
    expect(getApplicableSteps(otherOwnership, { isUnder18: false })).not.to.include(STEPS.propertyLandlord)
    expect(getNextStep(STEPS.property, otherOwnership, { isUnder18: false })).to.equal(undefined)
    expect(JSON.stringify(propertyStep.onSubmission)).to.include(CONTROLLED_WORK_DATA_KEYS.nextStep)
    expect(JSON.stringify(propertyStep.onSubmission)).to.include(STEPS.propertyLandlord)
  })

  it('routes No to the CCQ denial screen and Yes to the explicit incomplete boundary', () => {
    const submission = JSON.stringify(propertyLandlordStep.onSubmission)
    const denial = JSON.stringify(cannotUseServiceStep.blocks)

    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include('"arguments":["no"]')
    expect(submission).to.include(cannotUseServiceStepCode)
    expect(submission).to.include('controlled-work-incomplete')
    expect(JSON.stringify(propertyLandlordStep.onAccess)).to.include(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
    expect(JSON.stringify(propertyLandlordStep.onAccess)).to.include(STEPS.property)
    expect(cannotUseServiceStep.title).to.equal('You cannot use this service')
    expect(denial).to.include(
      'You cannot use this service if your client joint-owns a shared ownership property with the landlord and someone else.',
    )
    expect(denial).to.include('Change your answer')
    expect(JSON.stringify(cannotUseServiceStep.reachability)).to.include('"arguments":["no"]')
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.propertyLandlord)

    const yesAnswers = { ...PASSPORTED_SHARED_OWNERSHIP, 'property-landlord': 'yes' } as const
    const noAnswers = { ...PASSPORTED_SHARED_OWNERSHIP, 'property-landlord': 'no' } as const
    expect(getNextStep(STEPS.propertyLandlord, yesAnswers, { isUnder18: false })).to.equal(undefined)
    expect(isControlledWorkComplete(yesAnswers, { isUnder18: false })).to.equal(false)
    expect(getNextStep(STEPS.propertyLandlord, noAnswers, { isUnder18: false })).to.equal(undefined)
  })

  it('prunes the landlord answer when the shared-ownership route no longer applies', () => {
    const answers = { ...PASSPORTED_SHARED_OWNERSHIP, 'property-landlord': 'yes' } as const

    expect(resolveControlledWorkJourney(answers, { isUnder18: false }).answers['property-landlord']).to.equal('yes')
    expect(
      resolveControlledWorkJourney(
        { ...answers, 'property-owned': 'none' },
        { isUnder18: false },
      ).removedCodes,
    ).to.include('property-landlord')
  })
})
