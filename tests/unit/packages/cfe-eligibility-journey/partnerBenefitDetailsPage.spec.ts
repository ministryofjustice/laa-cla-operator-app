import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import {
  getApplicableSteps,
  getFirstMissingStep,
  getNextStep,
  isControlledWorkComplete,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  createBenefitDetailsPageContent,
  isPositiveBenefitAmount,
  isValidBenefitAmount,
} from '#packages/cfe-eligibility-journey/src/benefitDetailsPage/benefitDetailsBlock.js'
import { partnerBenefitDetailsPageContent } from '#packages/cfe-eligibility-journey/src/partnerBenefitDetailsPage/partnerBenefitDetailsBlock.js'
import { partnerBenefitDetailsStep } from '#packages/cfe-eligibility-journey/src/partnerBenefitDetailsPage/partnerBenefitDetailsStep.js'

const ADULT = { isUnder18: false }
const BASE_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'yes',
  passporting: 'no',
  'child-dependants': 'no',
  'adult-dependants': 'no',
  'employment-status': 'unemployed',
  'receives-benefits': 'no',
  friends_or_family_relevant: 'no',
  maintenance_relevant: 'no',
  property_or_lodger_relevant: 'no',
  pension_relevant: 'no',
  student_finance_relevant: 'no',
  other_relevant: 'no',
  'other-income-completed': 'yes',
  'partner-over-60': 'no',
  'partner-employment-status': 'unemployed',
  'partner-receives-benefits': 'yes',
} as const
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf#page=15'

describe('Partner benefit details page', () => {
  it('uses the shared eligibility form and follows partner benefits', () => {
    const steps = eligibilityJourney.steps ?? []
    const benefitsIndex = steps.findIndex(({ code }) => code === STEPS.partnerBenefits)
    const detailsIndex = steps.findIndex(({ code }) => code === STEPS.partnerBenefitDetails)
    const submission = JSON.stringify(partnerBenefitDetailsStep.onSubmission)
    const access = JSON.stringify(partnerBenefitDetailsStep.onAccess)

    expect(detailsIndex).to.be.greaterThan(benefitsIndex)
    expect(partnerBenefitDetailsStep.path).to.equal('/partner-benefit-details')
    expect(partnerBenefitDetailsStep.title).to.equal('Add benefit details')
    expect(partnerBenefitDetailsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(partnerBenefitDetailsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(partnerBenefitDetailsStep.reachability)).to.include(STEPS.partnerBenefitDetails)
    expect(access).to.include('PreparePartnerBenefitDetails')
    expect(access).to.include('LoadBenefitSuggestions')
    expect(access).to.include(STEPS.partnerBenefits)
    expect(submission).to.include('AddRepeatingItem')
    expect(submission).to.include('RemoveRepeatingItem')
    expect(submission).to.include('SaveRepeatingItems')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include(controlledWorkIncompleteStepCode)

    const content = JSON.stringify(partnerBenefitDetailsPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
  })

  it('matches the CCQ heading, supporting content, repeat fields and guidance', () => {
    const content = JSON.stringify(partnerBenefitDetailsPageContent)

    expect(content).to.include('"content":"Partner"')
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Add benefit details"')
    expect(content).to.include('Add details of any benefits the partner gets.')
    expect(content).to.include('Check the guidance (PDF, 599KB)')
    expect(content).to.include(`"href":["${GUIDANCE_URL}"]`)
    expect(content).to.include('Disregarded benefits (PDF, 599KB)')
    expect(content).to.include('"text":"Benefit name"')
    expect(content).to.include(
      'Enter the name of a benefit, or select one from the suggestions that appear when you start to enter the name.',
    )
    expect(content).to.include('"text":"Benefit amount"')
    expect(content).to.include('When does the partner normally get this benefit?')
    expect(content).to.include('"text":"Add another benefit"')
    expect(content).to.include('"id":["suggestions"]')
    expect(content).to.include('"list":"suggestions"')
    expect(content).to.include('"summaryText":"Examples of Cost of Living Payments"')

    for (const excludedBenefit of [
      'Housing Benefit',
      'State Pension',
      'Personal Independence Payment (PIP)',
      'Carer’s Allowance',
      'Community Care direct payments',
      'Fostering allowance',
      'Cost of Living Payments',
      'Pensioner Cost of Living Payment',
      'Household Support Fund',
      'Alternative Fuel Payment',
    ]) {
      expect(content).to.include(excludedBenefit)
    }

    expect(content).to.include('Every week')
    expect(content).to.include('Every 2 weeks')
    expect(content).to.include('Every 4 weeks')
    expect(content).to.include('Every month')
  })

  it('uses the CCQ required, numeric, positive and frequency validation messages', () => {
    const content = JSON.stringify(partnerBenefitDetailsPageContent)

    for (const message of [
      'Enter the benefit name',
      'Enter benefit %1 name',
      'Enter benefit amount',
      'Enter benefit amount for benefit %1',
      'Benefit amount must be a number',
      'Benefit amount for benefit %1 must be a number',
      'Benefit amount must be more than 0',
      'Benefit amount for benefit %1 must be more than 0',
      'Select when the partner normally gets this benefit',
      'Select when the partner normally gets benefit %1',
    ]) {
      expect(content).to.include(message)
    }

    expect(isValidBenefitAmount('1')).to.equal(true)
    expect(isValidBenefitAmount('£1,234.56')).to.equal(true)
    for (const invalid of ['1,2', 'not a number', '1.2.3', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isValidBenefitAmount(invalid)).to.equal(false)
    }

    expect(isPositiveBenefitAmount('0.01')).to.equal(true)
    for (const invalid of ['0', '-1', '-0.01']) {
      expect(isPositiveBenefitAmount(invalid)).to.equal(false)
    }
  })

  it('routes only the Yes branch to details and keeps the following page incomplete', () => {
    const yesAnswers = { ...BASE_ANSWERS }
    const detailsAnswered = { ...yesAnswers, 'partner-benefit-details-completed': 'yes' } as const
    const noAnswers = { ...BASE_ANSWERS, 'partner-receives-benefits': 'no' } as const

    expect(getApplicableSteps(yesAnswers, ADULT)).to.include(STEPS.partnerBenefitDetails)
    expect(getFirstMissingStep(yesAnswers, ADULT)).to.equal(STEPS.partnerBenefitDetails)
    expect(getNextStep(STEPS.partnerBenefits, yesAnswers, ADULT)).to.equal(STEPS.partnerBenefitDetails)
    expect(getApplicableSteps(noAnswers, ADULT)).to.not.include(STEPS.partnerBenefitDetails)
    expect(getNextStep(STEPS.partnerBenefits, noAnswers, ADULT)).to.equal(STEPS.partnerOtherIncome)
    expect(getNextStep(STEPS.partnerBenefitDetails, detailsAnswered, ADULT)).to.equal(STEPS.partnerOtherIncome)
    expect(isControlledWorkComplete(detailsAnswered, ADULT)).to.equal(false)
  })

  it('builds the matching client form without changing its recipient-specific copy', () => {
    const clientContent = JSON.stringify(
      createBenefitDetailsPageContent({
        collectionCode: CONTROLLED_WORK_DATA_KEYS.benefitCollection,
        recipient: 'client',
        suggestionListId: 'benefit-suggestions',
      }),
    )

    expect(clientContent).to.include('Add details of any non-passporting benefits your client gets.')
    expect(clientContent).to.include('When does your client normally get this benefit?')
  })
})
