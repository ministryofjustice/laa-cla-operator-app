import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { getNextStep, isStepApplicable } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { howToAggregatePageContent } from '#packages/cfe-eligibility-journey/src/howToAggregatePage/howToAggregateBlock.js'
import { howToAggregateStep } from '#packages/cfe-eligibility-journey/src/howToAggregatePage/howToAggregateStep.js'

const AGGREGATING_ANSWERS = {
  'immigration-or-asylum': 'no',
  'controlled-legal-representation': 'no',
  'aggregated-means': 'yes',
} as const

describe('How to aggregate page', () => {
  it('registers after aggregation and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const aggregationIndex = steps.findIndex((journeyStep) => journeyStep.code === STEPS.aggregatedMeans)
    const howToAggregateIndex = steps.findIndex((journeyStep) => journeyStep.code === STEPS.howToAggregate)

    expect(aggregationIndex).to.be.lessThan(howToAggregateIndex)
    expect(howToAggregateStep.path).to.equal('/how-to-aggregate')
    expect(howToAggregateStep.title).to.equal("You are going to aggregate your client's means with another person's means")
    expect(howToAggregateStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(howToAggregateStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(howToAggregateStep.reachability)).to.include('Array.Contains')
  })

  it('renders the CCQ title, supporting text, guidance and legislation link', () => {
    const content = JSON.stringify(howToAggregatePageContent)

    expect(content).to.include('"level":2')
    expect(content).to.include("You are going to aggregate your client's means with another person's means")
    expect(content).to.include(
      "If your client's means are aggregated with the means of another person, such as a maintaining adult, they must have a full means test.",
    )
    expect(content).to.include('What happens next')
    expect(content).to.include(
      "For all questions that refer to 'your client' or 'the client', such as if your client has dependants or owns the home they live in, answer them with reference to both your client and the maintaining adult.",
    )
    expect(content).to.include('add any relevant income or spending amounts for your client to those of the maintaining adult')
    expect(content).to.include("enter these combined amounts in the relevant fields that refer to 'your client'")
    expect(content).to.include('regulation 16')
    expect(content).to.include('https://www.legislation.gov.uk/uksi/2013/480/regulation/16/made')
    expect(content).to.include('answer any partner-related questions as if the maintaining adult is the client')
    expect(content).to.include('continue to treat the combined income and expenditure of your client and the maintaining adult as that of your client')
    expect(content).to.include('"summaryText":"What we mean by a maintaining adult"')
    expect(content).to.include(
      'A maintaining adult is any other person who is responsible for maintaining the child. For example, the other person could be one of the following:',
    )
    expect(content).to.include('a parent or guardian who gives your client financial support')
    expect(content).to.include("anyone who contributes substantially to your client's maintenance")
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('Controlled work (PDF, 599KB)')
    expect(content).to.include('Means aggregation for under 18s (PDF, 599KB)')
    expect(content).to.include('#page=48')
    expect(content).to.include('"text":"Continue"')
    expect(content).not.to.include('Save and continue')
  })

  it('has no input or validation and continues to the explicit incomplete boundary', () => {
    const content = JSON.stringify(howToAggregatePageContent)
    const submission = JSON.stringify(howToAggregateStep.onSubmission)

    expect(content).not.to.include('aggregated-means')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include('controlled-work-incomplete')
  })

  it('is shown only after aggregation is Yes and follows the current branch', () => {
    const minor = { isUnder18: true }
    const aggregationNo = { ...AGGREGATING_ANSWERS, 'aggregated-means': 'no' as const }
    const matterYes = { ...AGGREGATING_ANSWERS, 'immigration-or-asylum': 'yes' as const }

    expect(isStepApplicable(STEPS.howToAggregate, AGGREGATING_ANSWERS, minor)).to.equal(true)
    expect(getNextStep(STEPS.aggregatedMeans, AGGREGATING_ANSWERS, minor)).to.equal(STEPS.howToAggregate)
    expect(getNextStep(STEPS.howToAggregate, AGGREGATING_ANSWERS, minor)).to.equal(STEPS.applicant)
    expect(getNextStep(STEPS.howToAggregate, matterYes, minor)).to.equal(STEPS.immigrationOrAsylumType)
    expect(isStepApplicable(STEPS.howToAggregate, aggregationNo, minor)).to.equal(false)
    expect(getNextStep(STEPS.aggregatedMeans, aggregationNo, minor)).to.equal(STEPS.regularIncome)
  })
})
