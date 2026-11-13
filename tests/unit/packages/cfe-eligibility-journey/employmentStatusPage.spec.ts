import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep, controlledWorkIncompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { getApplicableSteps, isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  employmentStatusField,
  employmentStatusPageContent,
} from '#packages/cfe-eligibility-journey/src/employmentStatusPage/employmentStatusBlock.js'
import { employmentStatusStep } from '#packages/cfe-eligibility-journey/src/employmentStatusPage/employmentStatusStep.js'

const QUESTION = "What is your client's employment status?"
const CONTROLLED_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'child-dependants': 'no',
  'adult-dependants': 'no',
} as const
const ADULT = { isUnder18: false }

describe('Controlled-work employment status page', () => {
  it('follows dependant questions and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const dependantIncomeIndex = steps.findIndex(({ code }) => code === STEPS.dependantIncomeDetails)
    const employmentStatusIndex = steps.findIndex(({ code }) => code === STEPS.employmentStatus)

    expect(employmentStatusIndex).to.be.greaterThan(dependantIncomeIndex)
    expect(employmentStatusStep.path).to.equal('/employment-status')
    expect(employmentStatusStep.title).to.equal(QUESTION)
    expect(employmentStatusStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(employmentStatusStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.employmentStatus)

    const content = JSON.stringify(employmentStatusPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('renders the exact CCQ question, employment options, hints and required validation', () => {
    expect(employmentStatusField.code).to.equal('employment-status')
    expect(employmentStatusField.fieldset?.legend?.text).to.equal(QUESTION)
    expect(employmentStatusField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(employmentStatusField.items).to.deep.equal([
      {
        value: 'in_work',
        text: 'Employed or self-employed',
        hint: 'Including if your client is paid in cash, is a sole trader, is a company director, is in a partnership, or gets Statutory Sick Pay or Statutory Maternity Pay',
      },
      {
        value: 'unemployed',
        text: 'Unemployed',
        hint: 'Including anyone without employment income, for example retired clients',
      },
    ])
    expect(JSON.stringify(employmentStatusField.validWhen)).to.include('^(in_work|unemployed)$')
    expect(JSON.stringify(employmentStatusField.validWhen)).to.include('"message":"Select an employment status"')
    expect(isValidControlledWorkAnswer('employment-status', 'in_work')).to.equal(true)
    expect(isValidControlledWorkAnswer('employment-status', 'unemployed')).to.equal(true)
    for (const invalid of ['', undefined, null, 'employed', 'retired', true, false, 1]) {
      expect(isValidControlledWorkAnswer('employment-status', invalid)).to.equal(false)
    }
  })

  it('applies only to means-tested clients who are not passported', () => {
    expect(getApplicableSteps(CONTROLLED_ANSWERS, ADULT)).to.include(STEPS.employmentStatus)
    expect(getApplicableSteps({ ...CONTROLLED_ANSWERS, passporting: 'yes' }, ADULT)).to.not.include(STEPS.employmentStatus)
  })

  it('saves valid answers and keeps both unimplemented branches at the incomplete boundary', () => {
    const submission = JSON.stringify(employmentStatusStep.onSubmission)
    const access = JSON.stringify(employmentStatusStep.onAccess)

    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include(controlledWorkIncompleteStepCode)
    expect(access).to.include(STEPS.dependantIncome)
    expect(controlledWorkIncompleteStep.code).to.equal(controlledWorkIncompleteStepCode)
  })
})
