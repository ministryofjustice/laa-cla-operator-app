import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { getApplicableSteps, getFirstMissingStep, isControlledWorkComplete } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  benefitDetailsPageContent,
  isPositiveBenefitAmount,
  isValidBenefitAmount,
} from '#packages/cfe-eligibility-journey/src/benefitDetailsPage/benefitDetailsBlock.js'
import { benefitDetailsStep } from '#packages/cfe-eligibility-journey/src/benefitDetailsPage/benefitDetailsStep.js'

const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const ADULT = { isUnder18: false }
const BASE_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'child-dependants': 'no',
  'adult-dependants': 'no',
  'employment-status': 'unemployed',
} as const

describe('Controlled-work benefit details page', () => {
  it('uses the shared eligibility form and follows the controlled-work benefits gate', () => {
    const steps = eligibilityJourney.steps ?? []
    const benefitsIndex = steps.findIndex(({ code }) => code === STEPS.benefits)
    const detailsIndex = steps.findIndex(({ code }) => code === STEPS.benefitDetails)
    const submission = JSON.stringify(benefitDetailsStep.onSubmission)
    const access = JSON.stringify(benefitDetailsStep.onAccess)

    expect(detailsIndex).to.be.greaterThan(benefitsIndex)
    expect(benefitDetailsStep.path).to.equal('/benefit-details')
    expect(benefitDetailsStep.title).to.equal('Add benefit details')
    expect(benefitDetailsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(benefitDetailsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(access).to.include('PrepareBenefitDetails')
    expect(access).to.include(STEPS.benefits)
    expect(submission).to.include('AddRepeatingItem')
    expect(submission).to.include('RemoveRepeatingItem')
    expect(submission).to.include('SaveRepeatingItems')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')
  })

  it('matches the CCQ heading, supporting content, repeated fields and guidance', () => {
    const content = JSON.stringify(benefitDetailsPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))

    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Add benefit details"')
    expect(content).to.include('Add details of any non-passporting benefits your client gets.')
    expect(content).to.include('Check the guidance (PDF, 599KB)')
    expect(content).to.include('Benefit name')
    expect(content).to.include(
      'Enter the name of a benefit, or select one from the suggestions that appear when you start to enter the name.',
    )
    expect(content).to.include('Benefit amount')
    expect(content).to.include('When does your client normally get this benefit?')
    expect(content).to.include('Add another benefit')
    expect(content).to.include('Remove')
    expect(content).to.include('benefit-suggestions')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"href":["' + GUIDANCE_URL + '#page=15"]')
    expect(content).to.include('Disregarded benefits (PDF, 599KB)')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')

    for (const excludedBenefit of [
      'Housing Benefit',
      'State Pension',
      'Personal Independence Payment (PIP)',
      'Carer’s Allowance',
      'Community Care direct payments',
      'Fostering allowance',
      'Cost of Living Payments',
    ]) {
      expect(content).to.include(`<li>${excludedBenefit}</li>`)
    }

    expect(content).to.include('Every week')
    expect(content).to.include('Every 2 weeks')
    expect(content).to.include('Every 4 weeks')
    expect(content).to.include('Every month')
    expect(content).to.not.include('Total in last 3 months')
  })

  it('includes exact required, invalid-number, non-positive and repeated-row validation messages', () => {
    const content = JSON.stringify(benefitDetailsPageContent)

    for (const message of [
      'Enter the benefit name',
      'Enter benefit %1 name',
      'Enter benefit amount',
      'Enter benefit amount for benefit %1',
      'Benefit amount must be a number',
      'Benefit amount for benefit %1 must be a number',
      'Benefit amount must be more than 0',
      'Benefit amount for benefit %1 must be more than 0',
      'Select when your client normally gets this benefit',
      'Select when your client normally gets benefit %1',
    ]) {
      expect(content).to.include(message)
    }

    expect(isValidBenefitAmount('1')).to.equal(true)
    expect(isValidBenefitAmount('£1,234.56')).to.equal(true)
    for (const invalid of ['', '1,2', 'not a number', '1.2.3', Number.NaN, Number.POSITIVE_INFINITY]) {
      if (invalid === '') continue
      expect(isValidBenefitAmount(invalid)).to.equal(false)
    }

    expect(isPositiveBenefitAmount('0.01')).to.equal(true)
    for (const invalid of ['0', '-1', '-0.01']) {
      expect(isPositiveBenefitAmount(invalid)).to.equal(false)
    }
  })

  it('routes Yes to benefit details and keeps the following unimplemented page incomplete', () => {
    const yesAnswers = { ...BASE_ANSWERS, 'receives-benefits': 'yes' } as const
    const detailsAnswered = { ...yesAnswers, 'benefit-details-completed': 'yes' } as const
    const noAnswers = { ...BASE_ANSWERS, 'receives-benefits': 'no' } as const

    expect(getApplicableSteps(yesAnswers, ADULT)).to.include(STEPS.benefitDetails)
    expect(getFirstMissingStep(yesAnswers, ADULT)).to.equal(STEPS.benefitDetails)
    expect(getApplicableSteps(noAnswers, ADULT)).to.not.include(STEPS.benefitDetails)
    expect(getFirstMissingStep(noAnswers, ADULT)).to.equal(STEPS.otherIncome)
    expect(getFirstMissingStep(detailsAnswered, ADULT)).to.equal(STEPS.otherIncome)
    expect(isControlledWorkComplete(detailsAnswered, ADULT)).to.equal(false)
  })
})
