import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  getApplicableSteps,
  getNextStep,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { asylumSupportField, asylumSupportPageContent } from '#packages/cfe-eligibility-journey/src/asylumSupportPage/asylumSupportBlock.js'
import { asylumSupportStep } from '#packages/cfe-eligibility-journey/src/asylumSupportPage/asylumSupportStep.js'

const QUESTION = 'Does your client get Asylum Support?'
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const ADULT = { isUnder18: false }
const PRIOR_ANSWERS = {
  'immigration-or-asylum': 'yes',
  'immigration-or-asylum-type': 'asylum',
} as const

describe('Asylum support page', () => {
  it('is registered after matter type and uses the shared eligibility form', () => {
    const steps = eligibilityJourney.steps ?? []
    const typeIndex = steps.findIndex(({ code }) => code === STEPS.immigrationOrAsylumType)
    const supportIndex = steps.findIndex(({ code }) => code === STEPS.asylumSupport)

    expect(supportIndex).to.be.greaterThan(typeIndex)
    expect(asylumSupportStep.path).to.equal('/asylum-support')
    expect(asylumSupportStep.title).to.equal(QUESTION)
    expect(asylumSupportStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(asylumSupportStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(asylumSupportStep.reachability)).to.include(STEPS.asylumSupport)
  })

  it('renders the exact supporting content, required radio choices, and validation message', () => {
    expect(asylumSupportField.code).to.equal('asylum-support')
    expect(asylumSupportField.fieldset?.legend?.text).to.equal(QUESTION)
    expect(asylumSupportField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(asylumSupportField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No, continue with the means check' },
    ])
    expect(JSON.stringify(asylumSupportField.validWhen)).to.include(
      '"message":"Select if your client receives section 4 or section 95 Asylum Support"',
    )
    expect(isValidControlledWorkAnswer('asylum-support', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('asylum-support', 'no')).to.equal(true)
    for (const invalid of ['', undefined, null, 'true', 'false', 'maybe', true, false, 1]) {
      expect(isValidControlledWorkAnswer('asylum-support', invalid)).to.equal(false)
    }

    const content = JSON.stringify(asylumSupportPageContent)
    expect(content).to.include(`"text":"${QUESTION}"`)
    expect(content).to.include('"level":2')
    expect(content).to.include(
      'This means Asylum Support as defined in Section 4 or Section 95 of the Immigration and Asylum Act 1999.',
    )
    expect(content).to.include(
      'Your client will not need an income or capital assessment if they receive this type of Asylum Support.',
    )
    expect(content).to.include("Also select yes if your client is named in their partner's Asylum Support claim.")
    expect(content).to.include('If your client does not have evidence of Asylum Support')
    expect(content).to.include(
      'consider answering no to this question instead of waiting. They are likely to pass the means test and be eligible for legal aid if you complete a full means check.',
    )
    expect(content).to.include('evidence (PDF, 599KB)')
  })

  it('uses the shared two-column layout and both controlled-work guidance links', () => {
    const content = JSON.stringify(asylumSupportPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))

    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"content":"Asylum Support (PDF, 599KB)"')
    expect(content).to.include('"content":"Controlled work (PDF, 599KB)"')
    expect(content).to.include(`${GUIDANCE_URL}#page=7`)
    expect(content).to.include(`${GUIDANCE_URL}#page=54`)
    expect(sharedLayout).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"text":"Guidance"')
  })

  it('follows the Yes exemption and No means-check routes, removing answers made irrelevant by a change', () => {
    expect(
      getApplicableSteps({ ...PRIOR_ANSWERS, 'asylum-support': 'yes' }, ADULT),
    ).to.not.include(STEPS.applicant)
    expect(
      getApplicableSteps({ ...PRIOR_ANSWERS, 'asylum-support': 'no' }, ADULT),
    ).to.include(STEPS.applicant)
    expect(getNextStep(STEPS.asylumSupport, { ...PRIOR_ANSWERS, 'asylum-support': 'yes' }, ADULT)).to.equal(undefined)
    expect(getNextStep(STEPS.asylumSupport, { ...PRIOR_ANSWERS, 'asylum-support': 'no' }, ADULT)).to.equal(STEPS.applicant)

    const yesRoute = resolveControlledWorkJourney(
      { ...PRIOR_ANSWERS, 'asylum-support': 'yes', partner: 'yes', passporting: 'no' },
      ADULT,
    )
    expect(yesRoute.removedCodes).to.have.members(['partner', 'passporting'])

    const changedToNo = resolveControlledWorkJourney({ ...yesRoute.answers, 'asylum-support': 'no' }, ADULT)
    expect(changedToNo.steps).to.include(STEPS.applicant)
    expect(changedToNo.answers.partner).to.equal(undefined)
    expect(changedToNo.answers.passporting).to.equal(undefined)
  })

  it('saves valid answers and leaves later unimplemented pages at the explicit incomplete boundary', () => {
    const submission = JSON.stringify(asylumSupportStep.onSubmission)
    const boundary = JSON.stringify(controlledWorkIncompleteStep.blocks)

    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include('controlled-work-incomplete')
    expect(boundary).to.include(
      'Your answer has been saved. Further controlled-work questions are not yet available, so this is not a completed assessment.',
    )
  })

  it('routes back to matter type if support is accessed before that required answer', () => {
    expect(JSON.stringify(asylumSupportStep.onAccess)).to.include(STEPS.immigrationOrAsylumType)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.asylumSupport)
  })
})
