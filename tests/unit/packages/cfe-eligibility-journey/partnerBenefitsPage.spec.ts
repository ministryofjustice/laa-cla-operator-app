import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import {
  getApplicableSteps,
  getFirstMissingStep,
  getNextStep,
  isControlledWorkComplete,
  isValidControlledWorkAnswer,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  partnerBenefitsPageContent,
  partnerReceivesBenefitsField,
} from '#packages/cfe-eligibility-journey/src/partnerBenefitsPage/partnerBenefitsBlock.js'
import { partnerBenefitsStep } from '#packages/cfe-eligibility-journey/src/partnerBenefitsPage/partnerBenefitsStep.js'

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
} as const
const QUESTION = 'Does the partner get any benefits?'
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf#page=15'

describe('Partner benefits page', () => {
  it('follows partner income and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const partnerIncomeIndex = steps.findIndex(({ code }) => code === STEPS.partnerIncome)
    const partnerBenefitsIndex = steps.findIndex(({ code }) => code === STEPS.partnerBenefits)
    const submission = JSON.stringify(partnerBenefitsStep.onSubmission)

    expect(partnerBenefitsIndex).to.be.greaterThan(partnerIncomeIndex)
    expect(partnerBenefitsStep.path).to.equal('/partner-benefits')
    expect(partnerBenefitsStep.title).to.equal(QUESTION)
    expect(partnerBenefitsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(partnerBenefitsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(partnerBenefitsStep.reachability)).to.include(STEPS.partnerBenefits)
    expect(JSON.stringify(partnerBenefitsStep.onAccess)).to.include(STEPS.partnerIncome)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include(controlledWorkIncompleteStepCode)

    const content = JSON.stringify(partnerBenefitsPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('matches the CCQ question, hint, supporting content, choices and guidance', () => {
    const content = JSON.stringify(partnerBenefitsPageContent)

    expect(content).to.include(`"text":"${QUESTION}"`)
    expect(content).to.include('"content":"Partner"')
    expect(content).to.include('"level":2')
    expect(content).to.include('For example, Child Benefit, tax credits or asylum support payments.')
    expect(content).to.include('Check the guidance (PDF, 599KB)')
    expect(content).to.include('"summaryText":"Examples of Cost of Living Payments"')
    expect(content).to.include('Pensioner Cost of Living Payment')
    expect(content).to.include('Cost of Living Payment')
    expect(content).to.include('Disability Cost of Living Payment')
    expect(content).to.include('Household Support Fund')
    expect(content).to.include('Council Tax rebate')
    expect(content).to.include('Energy Bills Support Scheme (EBSS)')
    expect(content).to.include('Alternative Fuel Payment')
    expect(content).to.include(`"href":["${GUIDANCE_URL}"]`)

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

    expect(partnerReceivesBenefitsField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(partnerReceivesBenefitsField.code).to.equal('partner-receives-benefits')
    expect(partnerReceivesBenefitsField.fieldset?.legend?.text).to.equal(QUESTION)
    expect(partnerReceivesBenefitsField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
  })

  it('requires an exact Yes/No response and reports the CCQ validation message', () => {
    expect(JSON.stringify(partnerReceivesBenefitsField.validWhen)).to.include('^(yes|no)$')
    expect(JSON.stringify(partnerReceivesBenefitsField.validWhen)).to.include(
      '"message":"Select yes if the partner gets any benefits"',
    )
    for (const value of ['yes', 'no']) {
      expect(isValidControlledWorkAnswer('partner-receives-benefits', value)).to.equal(true)
    }
    for (const value of ['', undefined, null, 'true', 'false', 'maybe', true, false, Number.NaN]) {
      expect(isValidControlledWorkAnswer('partner-receives-benefits', value)).to.equal(false)
    }
  })

  it('applies only to a partner on a non-passported means-tested route', () => {
    expect(getApplicableSteps(BASE_ANSWERS, ADULT)).to.include(STEPS.partnerBenefits)
    expect(
      getApplicableSteps({ ...BASE_ANSWERS, 'partner-receives-benefits': 'yes' }, ADULT),
    ).to.include(STEPS.partnerBenefitDetails)
    expect(
      getApplicableSteps({ ...BASE_ANSWERS, 'partner-receives-benefits': 'no' }, ADULT),
    ).to.include(STEPS.partnerOtherIncome)
    expect(getApplicableSteps({ ...BASE_ANSWERS, partner: 'no' }, ADULT)).to.not.include(STEPS.partnerBenefits)
    expect(getApplicableSteps({ ...BASE_ANSWERS, passporting: 'yes' }, ADULT)).to.not.include(STEPS.partnerBenefits)
    expect(
      getApplicableSteps(
        {
          ...BASE_ANSWERS,
          'immigration-or-asylum': 'yes',
          'immigration-or-asylum-type': 'asylum',
          'asylum-support': 'yes',
        },
        ADULT,
      ),
    ).to.not.include(STEPS.partnerBenefits)
  })

  it('routes Yes and No to their corresponding unimplemented pages without completing the journey', () => {
    const yesAnswers = { ...BASE_ANSWERS, 'partner-receives-benefits': 'yes' } as const
    const detailsAnswered = { ...yesAnswers, 'partner-benefit-details-completed': 'yes' } as const
    const noAnswers = { ...BASE_ANSWERS, 'partner-receives-benefits': 'no' } as const

    expect(getNextStep(STEPS.partnerBenefits, yesAnswers, ADULT)).to.equal(STEPS.partnerBenefitDetails)
    expect(getFirstMissingStep(yesAnswers, ADULT)).to.equal(STEPS.partnerBenefitDetails)
    expect(getNextStep(STEPS.partnerBenefits, noAnswers, ADULT)).to.equal(STEPS.partnerOtherIncome)
    expect(getFirstMissingStep(noAnswers, ADULT)).to.equal(STEPS.partnerOtherIncome)
    expect(getNextStep(STEPS.partnerBenefitDetails, detailsAnswered, ADULT)).to.equal(STEPS.partnerOtherIncome)
    expect(isControlledWorkComplete(detailsAnswered, ADULT)).to.equal(false)
    expect(isControlledWorkComplete(noAnswers, ADULT)).to.equal(false)
  })
})
