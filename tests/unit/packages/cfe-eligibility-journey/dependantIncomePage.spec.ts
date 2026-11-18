import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { getApplicableSteps, isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  dependantIncomeField,
  dependantIncomePageContent,
} from '#packages/cfe-eligibility-journey/src/dependantIncomePage/dependantIncomeBlock.js'
import { dependantIncomeStep } from '#packages/cfe-eligibility-journey/src/dependantIncomePage/dependantIncomeStep.js'

const QUESTION = 'Do any of the dependants aged 16 or over get regular income?'
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const ADULT = { isUnder18: false }
const PRIOR_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'child-dependants': 'yes',
  'child-dependants-count': '1',
  'adult-dependants': 'no',
} as const

describe('Controlled-work dependant income page', () => {
  it('follows dependant details and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const detailsIndex = steps.findIndex(({ code }) => code === STEPS.dependantDetails)
    const incomeIndex = steps.findIndex(({ code }) => code === STEPS.dependantIncome)

    expect(incomeIndex).to.be.greaterThan(detailsIndex)
    expect(dependantIncomeStep.path).to.equal('/dependant-income')
    expect(dependantIncomeStep.title).to.equal(QUESTION)
    expect(dependantIncomeStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(dependantIncomeStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.dependantIncome)

    const content = JSON.stringify(dependantIncomePageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('renders the exact CCQ question, examples, Yes/No choices, and required validation', () => {
    expect(dependantIncomeField.code).to.equal('dependants-get-income')
    expect(dependantIncomeField.fieldset?.legend?.text).to.equal(QUESTION)
    expect(dependantIncomeField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(dependantIncomeField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(dependantIncomeField.validWhen).includes('"message":"Select yes if any dependants aged 16 or over get income"')).to.equal(
      true,
    )
    expect(isValidControlledWorkAnswer('dependants-get-income', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('dependants-get-income', 'no')).to.equal(true)
    for (const invalid of ['', undefined, null, 'true', 'false', 'maybe', true, false, 1]) {
      expect(isValidControlledWorkAnswer('dependants-get-income', invalid)).to.equal(false)
    }

    const content = JSON.stringify(dependantIncomePageContent)
    expect(content).to.include('Examples of dependant income:')
    expect(content).to.include('a grant received by a child dependant over 16 who is in full-time education or training')
    expect(content).to.include('a wage received by a child dependant in an apprenticeship')
    expect(content).to.include('benefits received by an adult dependant')
    expect(content).to.include('earnings from part-time work if the dependant works more than 16 hours per week')
  })

  it('includes the controlled-work dependants income guidance link', () => {
    const content = JSON.stringify(dependantIncomePageContent)

    expect(content).to.include(`"href":["${GUIDANCE_URL}#page=22"]`)
    expect(content).to.include("Dependants' income (PDF, 599KB)")
  })

  it('is applicable only when the means-tested client has selected at least one dependant', () => {
    expect(getApplicableSteps(PRIOR_ANSWERS, ADULT)).to.include(STEPS.dependantIncome)
    expect(
      getApplicableSteps(
        { ...PRIOR_ANSWERS, 'child-dependants': 'no', 'child-dependants-count': undefined },
        ADULT,
      ),
    ).to.not.include(STEPS.dependantIncome)
    expect(
      getApplicableSteps({ ...PRIOR_ANSWERS, passporting: 'yes' }, ADULT),
    ).to.not.include(STEPS.dependantIncome)
  })

  it('saves valid answers and leaves later unimplemented pages at the explicit incomplete boundary', () => {
    const submission = JSON.stringify(dependantIncomeStep.onSubmission)
    const access = JSON.stringify(dependantIncomeStep.onAccess)
    const boundary = JSON.stringify(controlledWorkIncompleteStep.blocks)

    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include('controlled-work-incomplete')
    expect(access).to.include(STEPS.applicant)
    expect(access).to.include(STEPS.dependantDetails)
    expect(boundary).to.include(
      'Your answer has been saved. Further controlled-work questions are not yet available, so this is not a completed assessment.',
    )
  })
})
