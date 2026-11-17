import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  controlledWorkIncompleteStep,
  controlledWorkIncompleteStepCode,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import {
  getApplicableSteps,
  getNextStep,
  isValidControlledWorkAnswer,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { partnerDetailsStep } from '#packages/cfe-eligibility-journey/src/partnerDetailsPage/partnerDetailsStep.js'
import {
  partnerEmploymentStatusField,
  partnerEmploymentStatusPageContent,
} from '#packages/cfe-eligibility-journey/src/partnerEmploymentStatusPage/partnerEmploymentStatusBlock.js'
import { partnerEmploymentStatusStep } from '#packages/cfe-eligibility-journey/src/partnerEmploymentStatusPage/partnerEmploymentStatusStep.js'
import { partnerEmploymentIncomeStep } from '#packages/cfe-eligibility-journey/src/partnerEmploymentIncomePage/partnerEmploymentIncomeStep.js'

const ADULT = { isUnder18: false }
const BASE_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'yes',
  passporting: 'no',
} as const
const QUESTION = "What is the partner's employment status?"
const EMPLOYED_HINT =
  'Including if the partner is paid in cash, is a sole trader, is a company director, is in a partnership, or gets Statutory Sick Pay or Statutory Maternity Pay'
const UNEMPLOYED_HINT = 'Including anyone without employment income, for example retired partners'

describe('Partner employment status page', () => {
  it('follows partner details and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const partnerDetailsIndex = steps.findIndex(({ code }) => code === STEPS.partnerDetails)
    const partnerEmploymentStatusIndex = steps.findIndex(({ code }) => code === STEPS.partnerEmploymentStatus)

    expect(partnerEmploymentStatusIndex).to.be.greaterThan(partnerDetailsIndex)
    expect(partnerEmploymentStatusStep.path).to.equal('/partner-employment-status')
    expect(partnerEmploymentStatusStep.title).to.equal(QUESTION)
    expect(partnerEmploymentStatusStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(partnerEmploymentStatusStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(partnerEmploymentStatusStep.reachability)).to.include(STEPS.partnerEmploymentStatus)
    expect(JSON.stringify(partnerEmploymentStatusStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(partnerEmploymentStatusStep.onSubmission)).to.include(controlledWorkIncompleteStepCode)
    expect(JSON.stringify(partnerEmploymentStatusStep.onAccess)).to.include(STEPS.partnerDetails)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.partnerEmploymentStatus)

    const partnerDetailsSubmission = JSON.stringify(partnerDetailsStep.onSubmission)
    expect(partnerDetailsSubmission).to.include(CONTROLLED_WORK_DATA_KEYS.nextStep)
    expect(partnerDetailsSubmission).to.include(STEPS.partnerEmploymentStatus)

    const layout = JSON.stringify(partnerEmploymentStatusPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(layout).to.include('"width":"two-thirds"')
    expect(layout).to.include('"width":"one-third"')
    expect(layout).to.include('"text":"Guidance"')
    expect(layout).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('renders the exact CCQ heading, choices, hints and required validation', () => {
    expect(partnerEmploymentStatusField.code).to.equal('partner-employment-status')
    expect(partnerEmploymentStatusField.fieldset?.legend?.text).to.equal(QUESTION)
    expect(partnerEmploymentStatusField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(partnerEmploymentStatusField.items).to.deep.equal([
      { value: 'in_work', text: 'Employed or self-employed', hint: EMPLOYED_HINT },
      { value: 'unemployed', text: 'Unemployed', hint: UNEMPLOYED_HINT },
    ])
    expect(JSON.stringify(partnerEmploymentStatusField.validWhen)).to.include('^(in_work|unemployed)$')
    expect(JSON.stringify(partnerEmploymentStatusField.validWhen)).to.include('"message":"Select an employment status"')

    for (const value of ['in_work', 'unemployed']) {
      expect(isValidControlledWorkAnswer('partner-employment-status', value)).to.equal(true)
    }
    for (const invalid of ['', undefined, null, 'employed', 'retired', 'yes', true, false]) {
      expect(isValidControlledWorkAnswer('partner-employment-status', invalid)).to.equal(false)
    }
  })

  it('applies only when a partner is present on a means-tested route', () => {
    expect(getApplicableSteps(BASE_ANSWERS, ADULT)).to.include(STEPS.partnerEmploymentStatus)
    expect(getApplicableSteps({ ...BASE_ANSWERS, passporting: 'yes' }, ADULT)).to.not.include(
      STEPS.partnerEmploymentStatus,
    )
    expect(getApplicableSteps({ ...BASE_ANSWERS, partner: 'no' }, ADULT)).to.not.include(
      STEPS.partnerEmploymentStatus,
    )
    expect(getApplicableSteps({ 'immigration-or-asylum': 'no', partner: 'yes' }, ADULT)).to.not.include(
      STEPS.partnerEmploymentStatus,
    )
  })

  it('continues from partner details and routes employed partners to their income page', () => {
    expect(getNextStep(STEPS.partnerDetails, { ...BASE_ANSWERS, 'partner-over-60': 'no' }, ADULT)).to.equal(
      STEPS.partnerEmploymentStatus,
    )

    const employed = { ...BASE_ANSWERS, 'partner-employment-status': 'in_work' } as const
    const unemployed = { ...BASE_ANSWERS, 'partner-employment-status': 'unemployed' } as const
    expect(getNextStep(STEPS.partnerEmploymentStatus, employed, ADULT)).to.equal(STEPS.partnerIncome)
    expect(getNextStep(STEPS.partnerEmploymentStatus, unemployed, ADULT)).to.equal(STEPS.partnerBenefits)

    const submission = JSON.stringify(partnerEmploymentStatusStep.onSubmission)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include(partnerEmploymentIncomeStep.code)
    expect(submission).to.include(controlledWorkIncompleteStepCode)
  })
})
