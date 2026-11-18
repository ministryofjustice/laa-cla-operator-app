import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { getApplicableSteps, getNextStep, isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  grossIncomeField,
  incomeFrequencyField,
  incomePageContent,
  incomeTaxField,
  incomeTypeField,
  isNetIncomePositive,
  isNonNegativeIncomeAmount,
  isPositiveIncomeAmount,
  isValidIncomeAmount,
  nationalInsuranceField,
} from '#packages/cfe-eligibility-journey/src/controlledWorkIncomePage/incomeBlock.js'
import { incomeStep } from '#packages/cfe-eligibility-journey/src/controlledWorkIncomePage/incomeStep.js'

const ADULT = { isUnder18: false }
const VALID_AMOUNT = 10
const PRIOR_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'child-dependants': 'no',
  'adult-dependants': 'no',
} as const

describe('Controlled-work employment income page', () => {
  it('follows employment status and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const statusIndex = steps.findIndex(({ code }) => code === STEPS.employmentStatus)
    const incomeIndex = steps.findIndex(({ code }) => code === STEPS.income)

    expect(incomeIndex).to.be.greaterThan(statusIndex)
    expect(incomeStep.path).to.equal('/income')
    expect(incomeStep.title).to.equal("Your client's employment income")
    expect(incomeStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(incomeStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(incomeStep.onAccess)).to.include('PrepareIncomeDetails')
    expect(JSON.stringify(incomeStep.onSubmission)).to.include('SaveRepeatingItems')
    expect(JSON.stringify(incomeStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(incomeStep.onSubmission)).to.include('controlled-work-incomplete')
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.income)

    const content = JSON.stringify(incomePageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('matches CCQ page copy, type and frequency options, row controls, and guidance', () => {
    const content = JSON.stringify(incomePageContent)

    expect(content).to.include("Your client's employment income")
    expect(content).to.include("You can find this on your client's payslips")
    expect(incomeTypeField.fieldset?.legend?.text).to.equal('What type of employment income is this?')
    expect(incomeTypeField.items).to.deep.equal([
      {
        value: 'employment',
        text: 'A salary or wage',
        hint: 'Including if your client is a self-employed company director or in a partnership and is paid as an employee',
      },
      { value: 'statutory_pay', text: 'Statutory Sick Pay or Statutory Maternity Pay' },
      {
        value: 'self_employment',
        text: 'Self-employment income',
        hint: 'For example, payment in cash, drawings or dividends or bonuses paid from a company account, and the value of any benefits in kind',
      },
    ])
    expect(incomeFrequencyField.items).to.deep.equal([
      { value: 'every_week', text: 'Every week' },
      { value: 'every_two_weeks', text: 'Every 2 weeks' },
      { value: 'every_four_weeks', text: 'Every 4 weeks' },
      { value: 'monthly', text: 'Every month' },
      { value: 'three_months', text: 'Total in last 3 months' },
    ])
    expect(JSON.stringify(incomeFrequencyField.hint)).to.include(
      'We’ll use this to calculate their monthly income. If they do not get income regularly, tell us how much they got in the last 3 months.',
    )
    expect(content).to.include('Add another employment income')
    expect(content).to.include('Employment income (PDF, 599KB)')
    expect(content).to.include('#page=13')
    expect(content).to.include('Clients who are police officers')
    expect(content).to.include('Clients in prison')
    expect(content).to.include('Clients living outside the UK')
    expect(content).to.include('Clients in HM Forces')
    expect(content).to.include('Self-employed clients, including clients paid in cash')
    const labels = JSON.stringify([grossIncomeField, incomeTaxField, nationalInsuranceField].map(({ label }) => label))
    expect(labels).to.include('Income before any deductions')
    expect(labels).to.include('Income tax')
    expect(labels).to.include('National Insurance')
    expect([grossIncomeField, incomeTaxField, nationalInsuranceField].map(({ inputType }) => inputType)).to.deep.equal([
      'text',
      'text',
      'text',
    ])
  })

  it('uses the exact CCQ validation messages for each row and field', () => {
    const validationContent = JSON.stringify([
      incomeTypeField.validWhen,
      incomeFrequencyField.validWhen,
      grossIncomeField.validWhen,
      incomeTaxField.validWhen,
      nationalInsuranceField.validWhen,
    ])

    for (const message of [
      'Select the employment income type',
      'Select the employment income type for employment income %1',
      'Select when your client normally gets this income',
      'Select when your client normally gets income %1',
      'Enter the income before any deductions',
      'Enter the income before any deductions for employment income %1',
      'Income before any deductions must be more than 0',
      'Income before any deductions for employment income %1 must be more than 0',
      'Income before any deductions must be a number',
      'Income before any deductions for employment income %1 must be a number',
      'Income before any deductions must be more than income tax and National Insurance combined',
      'Income before any deductions for employment income %1 must be more than income tax and National Insurance combined',
      'Enter the income tax amount',
      'Enter the income tax amount for employment income %1',
      'Income tax amount must be a number',
      'Income tax amount for employment income %1 must be a number',
      'Income tax amount must be 0 or more',
      'Income tax amount for employment income %1 must be 0 or more',
      'Enter the National Insurance amount',
      'Enter the National Insurance amount for employment income %1',
      'National Insurance amount must be a number',
      'National Insurance amount for employment income %1 must be a number',
      'National Insurance amount must be 0 or more',
      'National Insurance amount for employment income %1 must be 0 or more',
    ]) {
      expect(validationContent).to.include(`"${message}"`)
    }

    expect(isValidControlledWorkAnswer('income-completed', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('income-completed', 'no')).to.equal(false)
  })

  it('validates missing, malformed, non-positive, negative, and net income values', () => {
    expect(isValidIncomeAmount('£1,234.56')).to.equal(true)
    expect(isValidIncomeAmount(VALID_AMOUNT)).to.equal(true)
    for (const invalid of ['not a number', '1.2.3', '1,23.45', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isValidIncomeAmount(invalid)).to.equal(false)
    }

    expect(isPositiveIncomeAmount('0.01')).to.equal(true)
    for (const invalid of ['0', '-1', '-0.01']) {
      expect(isPositiveIncomeAmount(invalid)).to.equal(false)
    }
    expect(isNonNegativeIncomeAmount('0')).to.equal(true)
    expect(isNonNegativeIncomeAmount('0.01')).to.equal(true)
    expect(isNonNegativeIncomeAmount('-0.01')).to.equal(false)
    expect(isNetIncomePositive('100', '20', '10')).to.equal(true)
    expect(isNetIncomePositive('30', '20', '10')).to.equal(false)
    expect(isNetIncomePositive('not a number', '20', '10')).to.equal(true)
  })

  it('applies income only to employed, means-tested clients and keeps the next page incomplete', () => {
    const employed = { ...PRIOR_ANSWERS, 'employment-status': 'in_work' } as const
    const unemployed = { ...PRIOR_ANSWERS, 'employment-status': 'unemployed' } as const

    expect(getApplicableSteps(employed, ADULT)).to.include(STEPS.income)
    expect(getApplicableSteps(unemployed, ADULT)).to.not.include(STEPS.income)
    expect(getApplicableSteps({ ...employed, passporting: 'yes' }, ADULT)).to.not.include(STEPS.income)
    expect(getNextStep(STEPS.employmentStatus, employed, ADULT)).to.equal(STEPS.income)
    expect(getNextStep(STEPS.employmentStatus, unemployed, ADULT)).to.equal(STEPS.benefits)
    expect(getNextStep(STEPS.income, { ...employed, 'income-completed': 'yes' }, ADULT)).to.equal(STEPS.benefits)
  })
})
