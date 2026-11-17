import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { benefitsStep as legacyBenefitsStep } from '#packages/cfe-eligibility-journey/src/benefitsPage/benefitsStep.js'
import {
  controlledWorkIncompleteStep,
  controlledWorkIncompleteStepCode,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { getApplicableSteps, isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  controlledWorkBenefitsPageContent,
  receivesBenefitsField,
} from '#packages/cfe-eligibility-journey/src/controlledWorkBenefitsPage/controlledWorkBenefitsBlock.js'
import { controlledWorkBenefitsStep } from '#packages/cfe-eligibility-journey/src/controlledWorkBenefitsPage/controlledWorkBenefitsStep.js'
import { benefitDetailsStep } from '#packages/cfe-eligibility-journey/src/benefitDetailsPage/benefitDetailsStep.js'

const QUESTION = 'Does your client get any non-passporting benefits?'
const ADULT = { isUnder18: false }
const MEANS_TESTED_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'child-dependants': 'no',
  'adult-dependants': 'no',
  'employment-status': 'unemployed',
} as const

describe('Controlled-work benefits page', () => {
  it('uses the shared eligibility layout and keeps the legacy benefits route intact', () => {
    const steps = eligibilityJourney.steps ?? []
    const incomeIndex = steps.findIndex(({ code }) => code === STEPS.income)
    const benefitsIndex = steps.findIndex(({ code }) => code === STEPS.benefits)
    const legacyBenefitsIndex = steps.findIndex(({ code }) => code === legacyBenefitsStep.code)
    const content = JSON.stringify(controlledWorkBenefitsPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))

    expect(steps[benefitsIndex]?.code).to.equal(controlledWorkBenefitsStep.code)
    expect(benefitsIndex).to.be.greaterThan(incomeIndex)
    expect(legacyBenefitsIndex).to.be.greaterThan(benefitsIndex)
    expect(legacyBenefitsStep.path).to.equal('/benefits')
    expect(controlledWorkBenefitsStep.path).to.equal('/controlled-work-benefits')
    expect(controlledWorkBenefitsStep.title).to.equal(QUESTION)
    expect(controlledWorkBenefitsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(controlledWorkBenefitsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.benefits)
    expect(content).to.include('"level":2')
    expect(content).to.include(`"text":"${QUESTION}"`)
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include('Disregarded benefits (PDF, 599KB)')
    expect(sharedLayout).to.include('"text":"Guidance"')
  })

  it('renders the approved question, Yes/No options, supporting content and required error', () => {
    expect(receivesBenefitsField.code).to.equal('receives-benefits')
    expect(receivesBenefitsField.fieldset?.legend?.text).to.equal(QUESTION)
    expect(receivesBenefitsField.fieldset?.legend?.classes).to.equal('govuk-visually-hidden')
    expect(receivesBenefitsField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    const content = JSON.stringify(controlledWorkBenefitsPageContent)
    expect(content).to.include(
      'For example, Child Benefit, tax credits or asylum support payments.',
    )
    expect(content).to.include('Check the guidance (PDF, 599KB)')
    expect(content).to.include('#page=15')
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
    expect(JSON.stringify(receivesBenefitsField.validWhen)).to.include('^(yes|no)$')
    expect(JSON.stringify(receivesBenefitsField.validWhen)).to.include(
      '"message":"Select yes if your client gets any benefits"',
    )
    expect(isValidControlledWorkAnswer('receives-benefits', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('receives-benefits', 'no')).to.equal(true)
    for (const invalid of ['', undefined, null, 'true', 'false', 'maybe', true, false]) {
      expect(isValidControlledWorkAnswer('receives-benefits', invalid)).to.equal(false)
    }
  })

  it('applies only to means-tested clients who are not passported', () => {
    expect(getApplicableSteps(MEANS_TESTED_ANSWERS, ADULT)).to.include(STEPS.benefits)
    expect(getApplicableSteps({ ...MEANS_TESTED_ANSWERS, passporting: 'yes' }, ADULT)).to.not.include(STEPS.benefits)
  })

  it('saves the answer after validating and gates access on preceding pages', () => {
    const submission = JSON.stringify(controlledWorkBenefitsStep.onSubmission)
    const access = JSON.stringify(controlledWorkBenefitsStep.onAccess)

    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include(controlledWorkIncompleteStepCode)
    expect(access).to.include(STEPS.employmentStatus)
    expect(access).to.include(STEPS.income)
  })

  it('routes an affirmative answer through benefit details and leaves other income at the explicit boundary', () => {
    const steps = eligibilityJourney.steps ?? []
    const benefitsIndex = steps.findIndex(({ code }) => code === STEPS.benefits)
    const benefitDetailsIndex = steps.findIndex(({ code }) => code === STEPS.benefitDetails)
    const submission = JSON.stringify(controlledWorkBenefitsStep.onSubmission)

    expect(benefitDetailsIndex).to.be.greaterThan(benefitsIndex)
    expect(steps[benefitDetailsIndex]?.code).to.equal(benefitDetailsStep.code)
    expect(submission).to.include(controlledWorkIncompleteStepCode)
    expect(benefitDetailsStep.code).to.equal(STEPS.benefitDetails)
    expect(JSON.stringify(benefitDetailsStep.onSubmission)).to.include(controlledWorkIncompleteStepCode)
    expect(controlledWorkBenefitsStep.code).to.equal(STEPS.benefits)
  })
})
