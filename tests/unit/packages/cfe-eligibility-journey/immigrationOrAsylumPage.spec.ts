import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { controlledWorkGuidanceLink, immigrationOrAsylumField } from '#packages/cfe-eligibility-journey/src/immigrationOrAsylumPage/immigrationOrAsylumBlock.js'
import { immigrationOrAsylumStep } from '#packages/cfe-eligibility-journey/src/immigrationOrAsylumPage/immigrationOrAsylumStep.js'

describe('Immigration or asylum page', () => {
  it('is the first page in the existing eligibility journey', () => {
    expect(eligibilityJourney.steps?.[0].code).to.equal(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum)
    expect(immigrationOrAsylumStep.path).to.equal('/immigration-or-asylum')
    expect(immigrationOrAsylumStep.title).to.equal('Is this an immigration or asylum matter?')
  })

  it('renders the exact required Yes/No question and rejects values outside the answer set', () => {
    expect(immigrationOrAsylumField.fieldset?.legend?.text).to.equal('Is this an immigration or asylum matter?')
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
    expect(JSON.stringify(immigrationOrAsylumStep.blocks)).to.include('"text":"Save and continue"')
  })

  it('includes the CCQ controlled-work guidance link', () => {
    expect(controlledWorkGuidanceLink.content).to.equal('Controlled work (PDF, 599KB)')
    expect(JSON.stringify(controlledWorkGuidanceLink.attributes)).to.include(
      'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf',
    )
  })

  it('saves the answer before displaying a boundary that states the assessment is incomplete', () => {
    const submission = JSON.stringify(immigrationOrAsylumStep.onSubmission)
    expect(immigrationOrAsylumStep.onSubmission).to.have.length(1)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')
    expect(controlledWorkIncompleteStep.code).to.equal('controlled-work-incomplete')
    const boundaryBlocks = JSON.stringify(controlledWorkIncompleteStep.blocks)
    expect(boundaryBlocks).to.include(
      'Your answer has been saved. Further controlled-work questions are not yet available, so this is not a completed assessment.',
    )
    expect(boundaryBlocks).to.include('Change your answer')
  })
})
