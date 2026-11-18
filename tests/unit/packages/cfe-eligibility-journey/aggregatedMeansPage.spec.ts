import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import {
  getNextStep,
  isStepApplicable,
  isValidControlledWorkAnswer,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { aggregatedMeansField, aggregatedMeansPageContent } from '#packages/cfe-eligibility-journey/src/aggregatedMeansPage/aggregatedMeansBlock.js'
import { aggregatedMeansStep } from '#packages/cfe-eligibility-journey/src/aggregatedMeansPage/aggregatedMeansStep.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'

describe('Aggregated means page', () => {
  it('registers after CLR and uses the shared eligibility form', () => {
    const steps = eligibilityJourney.steps ?? []
    const clrIndex = steps.findIndex((journeyStep) => journeyStep.code === STEPS.under18Clr)
    const aggregatedMeansIndex = steps.findIndex((journeyStep) => journeyStep.code === STEPS.aggregatedMeans)

    expect(clrIndex).to.be.lessThan(aggregatedMeansIndex)
    expect(aggregatedMeansStep.path).to.equal('/aggregated-means')
    expect(aggregatedMeansStep.title).to.equal("Will you aggregate your client's means with another person's means?")
    expect(aggregatedMeansStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(aggregatedMeansStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(aggregatedMeansStep.reachability)).to.include('Array.Contains')
  })

  it('renders the exact question, explanation, details and Yes/No options', () => {
    expect(aggregatedMeansField.code).to.equal('aggregated-means')
    expect(aggregatedMeansField.fieldset?.legend?.text).to.equal(
      "Will you aggregate your client's means with another person's means?",
    )
    expect(aggregatedMeansField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(aggregatedMeansField.validWhen)).to.include(
      'Select yes if you will aggregate your client’s means with another person’s means',
    )
    const content = JSON.stringify(aggregatedMeansPageContent)
    expect(content).to.include('"level":2')
    expect(content).to.include(
      "If your client's means are aggregated with the means of another person, such as a maintaining adult, they must have a full means test.",
    )
    expect(content).to.include('"summaryText":"What we mean by aggregation of means"')
    expect(content).to.include('A maintaining adult is any other person who is responsible for maintaining the child.')
    expect(content).to.include('a parent or guardian who gives your client financial support')
    expect(content).to.include("anyone who contributes substantially to your client's maintenance")
    expect(content).to.include('Exceptions to this are when:')
    expect(content).to.include('a parent or guardian has a conflict of interest in the matter')
    expect(content).to.include('the client is financially independent')
    expect(content).to.include('the client is in local authority or foster care')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('Controlled work (PDF, 599KB)')
    expect(content).to.include('Means aggregation for under 18s (PDF, 599KB)')
    expect(content).to.include('#page=48')
  })

  it('requires an allowed Yes/No value and follows the answer-dependent route', () => {
    expect(JSON.stringify(aggregatedMeansField.validWhen)).to.include('"condition"')
    expect(isValidControlledWorkAnswer('aggregated-means', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('aggregated-means', 'no')).to.equal(true)
    for (const invalid of ['', 'true', 'false', 'maybe', true, false]) {
      expect(isValidControlledWorkAnswer('aggregated-means', invalid)).to.equal(false)
    }
    expect(isStepApplicable(STEPS.aggregatedMeans, { 'controlled-legal-representation': 'no' }, { isUnder18: true })).to.equal(
      true,
    )
    expect(isStepApplicable(STEPS.aggregatedMeans, { 'controlled-legal-representation': 'yes' }, { isUnder18: true })).to.equal(
      false,
    )
    expect(getNextStep(STEPS.aggregatedMeans, { 'controlled-legal-representation': 'no', 'aggregated-means': 'yes' }, { isUnder18: true })).to.equal(
      STEPS.howToAggregate,
    )
    expect(getNextStep(STEPS.aggregatedMeans, { 'controlled-legal-representation': 'no', 'aggregated-means': 'no' }, { isUnder18: true })).to.equal(
      STEPS.regularIncome,
    )
  })

  it('saves valid answers before continuing to the explicit incomplete boundary', () => {
    const submission = JSON.stringify(aggregatedMeansStep.onSubmission)

    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('validate')
    expect(submission).to.include(STEPS.howToAggregate)
    expect(submission).to.include(STEPS.regularIncome)
    expect(submission).to.include('controlled-work-incomplete')
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.aggregatedMeans)
  })
})
