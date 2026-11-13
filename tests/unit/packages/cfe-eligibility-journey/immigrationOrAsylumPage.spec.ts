import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { CONTROLLED_WORK_STEP_CODES } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  immigrationOrAsylumField,
  immigrationOrAsylumPageContent,
} from '#packages/cfe-eligibility-journey/src/immigrationOrAsylumPage/immigrationOrAsylumBlock.js'
import { immigrationOrAsylumStep } from '#packages/cfe-eligibility-journey/src/immigrationOrAsylumPage/immigrationOrAsylumStep.js'

describe('Immigration or asylum page', () => {
  it('is the first page in the existing eligibility journey', () => {
    expect(eligibilityJourney.steps?.[0].code).to.equal(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum)
    expect(immigrationOrAsylumStep.path).to.equal('/immigration-or-asylum')
    expect(immigrationOrAsylumStep.title).to.equal('Is this an immigration or asylum matter?')
  })

  it('renders the exact required Yes/No question and rejects values outside the answer set', () => {
    expect(immigrationOrAsylumField.fieldset?.legend?.text).to.equal('Is this an immigration or asylum matter?')
    expect(immigrationOrAsylumField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(immigrationOrAsylumField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(immigrationOrAsylumField.validWhen)).to.include(
      '"message":"Select yes if this is an immigration or asylum matter"',
    )
    expect(isValidControlledWorkAnswer('immigration-or-asylum', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('immigration-or-asylum', 'no')).to.equal(true)
    for (const invalid of ['', 'true', 'false', 'maybe', true, false]) {
      expect(isValidControlledWorkAnswer('immigration-or-asylum', invalid)).to.equal(false)
    }
    expect(immigrationOrAsylumStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
  })

  it('places the question, submit button and Guidance panel in responsive left and right columns', () => {
    const layout = JSON.stringify(immigrationOrAsylumPageContent)
    const sharedLayout = JSON.stringify(
      eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }),
    )
    expect(layout).to.include('"width":"two-thirds"')
    expect(layout).to.include('"width":"one-third"')
    expect(layout).to.include('"text":"Is this an immigration or asylum matter?"')
    expect(layout).to.include('"text":"Save and continue"')
    expect(layout).to.include('"text":"Guidance"')
    expect(layout).to.include('"content":"Controlled work (PDF, 599KB)"')
    expect(layout).to.include(
      'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf',
    )
    expect(sharedLayout).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"text":"Guidance"')
  })

  it('continues to under-18 CLR when applicable and otherwise keeps unimplemented routes incomplete', () => {
    const submission = JSON.stringify(immigrationOrAsylumStep.onSubmission)
    expect(immigrationOrAsylumStep.onSubmission).to.have.length(1)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include(CONTROLLED_WORK_DATA_KEYS.nextStep)
    expect(submission).to.include(CONTROLLED_WORK_STEP_CODES.under18Clr)
    expect(submission).to.include('controlled-work-incomplete')
    expect(controlledWorkIncompleteStep.code).to.equal('controlled-work-incomplete')
    const boundaryBlocks = JSON.stringify(controlledWorkIncompleteStep.blocks)
    expect(boundaryBlocks).to.include(
      'Your answer has been saved. Further controlled-work questions are not yet available, so this is not a completed assessment.',
    )
    expect(boundaryBlocks).to.include('Change your answer')
  })
})
