import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import {
  getNextStep,
  isValidControlledWorkAnswer,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { regularIncomeField, regularIncomePageContent } from '#packages/cfe-eligibility-journey/src/regularIncomePage/regularIncomeBlock.js'
import { regularIncomeStep } from '#packages/cfe-eligibility-journey/src/regularIncomePage/regularIncomeStep.js'

describe('Regular income page', () => {
  it('registers after aggregation screening and uses the shared eligibility form', () => {
    const steps = eligibilityJourney.steps ?? []
    const aggregationIndex = steps.findIndex((journeyStep) => journeyStep.code === STEPS.aggregatedMeans)
    const regularIncomeIndex = steps.findIndex((journeyStep) => journeyStep.code === STEPS.regularIncome)

    expect(regularIncomeIndex).to.be.greaterThan(aggregationIndex)
    expect(regularIncomeStep.path).to.equal('/regular-income')
    expect(regularIncomeStep.title).to.equal('Does your client get regular income?')
    expect(regularIncomeStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(regularIncomeStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(regularIncomeStep.reachability)).to.include('Array.Contains')
  })

  it('renders the exact question, explanation, exclusions, Yes/No options, and guidance links', () => {
    expect(regularIncomeField.code).to.equal('regular-income')
    expect(regularIncomeField.fieldset?.legend?.text).to.equal('Does your client get regular income?')
    expect(regularIncomeField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(regularIncomeField.validWhen)).to.include(
      'Select yes if your client gets regular income',
    )

    const content = JSON.stringify(regularIncomePageContent)
    expect(content).to.include('"level":2')
    expect(content).to.include(
      'For example, payment from a full time job or local authority financial support for a care leaver. If they get regular income, they must have a full means test.',
    )
    expect(content).to.include('Do not include:')
    expect(content).to.include('part-time earnings (less than 16 hours per week)')
    expect(content).to.include('holiday jobs')
    expect(content).to.include('pocket money')
    expect(content).to.include('any maintenance paid for the child')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('Controlled work (PDF, 599KB)')
    expect(content).to.include('Income (PDF, 599KB)')
    expect(content).to.include('#page=49')
  })

  it('requires an explicit Yes/No answer and follows the under-18 branch', () => {
    expect(isValidControlledWorkAnswer('regular-income', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('regular-income', 'no')).to.equal(true)
    for (const invalid of ['', 'true', 'false', 'maybe', true, false]) {
      expect(isValidControlledWorkAnswer('regular-income', invalid)).to.equal(false)
    }

    const earlierAnswers = {
      'immigration-or-asylum': 'no',
      'controlled-legal-representation': 'no',
      'aggregated-means': 'no',
    } as const
    expect(
      getNextStep(STEPS.regularIncome, { ...earlierAnswers, 'regular-income': 'no' }, { isUnder18: true }),
    ).to.equal(STEPS.under18Assets)
    expect(
      getNextStep(STEPS.regularIncome, { ...earlierAnswers, 'regular-income': 'yes' }, { isUnder18: true }),
    ).to.equal(STEPS.applicant)
  })

  it('saves before the incomplete boundary and lets the boundary forward to this question', () => {
    const submission = JSON.stringify(regularIncomeStep.onSubmission)
    const boundary = JSON.stringify(controlledWorkIncompleteStep.onAccess)

    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('validate')
    expect(submission).to.include('controlled-work-incomplete')
    expect(boundary).to.include(STEPS.regularIncome)
  })
})
