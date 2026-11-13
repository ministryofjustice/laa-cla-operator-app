import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { CONTROLLED_WORK_STEP_CODES } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { controlledWorkIncompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  immigrationOrAsylumTypeField,
  immigrationOrAsylumTypePageContent,
} from '#packages/cfe-eligibility-journey/src/immigrationOrAsylumTypePage/immigrationOrAsylumTypeBlock.js'
import { immigrationOrAsylumTypeStep } from '#packages/cfe-eligibility-journey/src/immigrationOrAsylumTypePage/immigrationOrAsylumTypeStep.js'

const QUESTION = 'What type of immigration or asylum matter is this?'
const LEGISLATION_URL = 'https://www.legislation.gov.uk/ukpga/2012/10/schedule/1'
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'

describe('Immigration or asylum type page', () => {
  it('is included in the existing journey after under-18 screening', () => {
    const stepCodes = eligibilityJourney.steps?.map(({ code }) => code)
    expect(stepCodes?.indexOf(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylumType)).to.be.greaterThan(
      stepCodes?.indexOf(CONTROLLED_WORK_STEP_CODES.under18Assets) ?? -1, // eslint-disable-line @typescript-eslint/no-magic-numbers -- A missing step has index -1.
    )
    expect(immigrationOrAsylumTypeStep.path).to.equal('/immigration-or-asylum-type')
    expect(immigrationOrAsylumTypeStep.title).to.equal(QUESTION)
    expect(immigrationOrAsylumTypeStep.view?.template).to.equal(
      'case_details/forge_forms/eligibility-question-form',
    )
    expect(JSON.stringify(immigrationOrAsylumTypeStep.reachability)).to.include(
      CONTROLLED_WORK_STEP_CODES.immigrationOrAsylumType,
    )
  })

  it('renders the exact question, hint, options, and required-answer validation', () => {
    expect(immigrationOrAsylumTypeField.code).to.equal('immigration-or-asylum-type')
    expect(immigrationOrAsylumTypeField.fieldset?.legend?.text).to.equal(QUESTION)
    expect(immigrationOrAsylumTypeField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(immigrationOrAsylumTypeField.items).to.deep.equal([
      {
        value: 'immigration_clr',
        text: 'Immigration - controlled legal representation (CLR) in the First-tier Tribunal',
      },
      { value: 'immigration_legal_help', text: 'Immigration - legal help or help at court' },
      {
        value: 'asylum',
        text: 'Asylum - legal help, help at court, or controlled legal representation (CLR) in the First-tier Tribunal',
      },
    ])
    expect(immigrationOrAsylumTypeField.hint).to.deep.equal({
      html: `Guidance for these matters is in paragraphs 24 to 30, 32(1) and 32A(1) of Part 1 of Schedule 1 to the <a href="${LEGISLATION_URL}" target="_blank" rel="noreferrer noopener">Legal Aid, Sentencing and Punishment of Offenders Act 2012</a> (LASPO).`,
    })
    expect(JSON.stringify(immigrationOrAsylumTypeField.validWhen)).to.include(
      '"message":"Select what type of immigration or asylum matter this is"',
    )
    for (const value of ['immigration_clr', 'immigration_legal_help', 'asylum']) {
      expect(isValidControlledWorkAnswer('immigration-or-asylum-type', value)).to.equal(true)
    }
    for (const value of ['', 'true', 'false', 'Immigration CLR', 'unknown', true, null]) {
      expect(isValidControlledWorkAnswer('immigration-or-asylum-type', value)).to.equal(false)
    }
  })

  it('uses the shared two-column layout and both CCQ guidance links', () => {
    const layout = JSON.stringify(immigrationOrAsylumTypePageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(layout).to.include('"width":"two-thirds"')
    expect(layout).to.include('"width":"one-third"')
    expect(layout).to.include(`"text":"${QUESTION}"`)
    expect(layout).to.include('"text":"Save and continue"')
    expect(layout).to.include('"text":"Guidance"')
    expect(layout).to.include('"content":"Controlled work (PDF, 599KB)"')
    expect(layout).to.include('"content":"Legacy case Appeals and Reviews in the Upper Tribunal (PDF, 599KB)"')
    expect(layout).to.include(LEGISLATION_URL)
    expect(layout).to.include(`${GUIDANCE_URL}#page=3`)
    expect(sharedLayout).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"text":"Guidance"')
  })

  it('saves valid answers and continues to the asylum-support page', () => {
    const submission = JSON.stringify(immigrationOrAsylumTypeStep.onSubmission)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylumType)
    expect(submission).to.include(CONTROLLED_WORK_STEP_CODES.asylumSupport)
    expect(submission).not.to.include(controlledWorkIncompleteStepCode)
  })
})
