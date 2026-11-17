import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  getApplicableSteps,
  getNextStep,
  isValidControlledWorkAnswer,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  isNetIncomePositive,
  isNonNegativeIncomeAmount,
  isPositiveIncomeAmount,
  isValidIncomeAmount,
} from '#packages/cfe-eligibility-journey/src/controlledWorkIncomePage/incomeBlock.js'
import { partnerEmploymentStatusStep } from '#packages/cfe-eligibility-journey/src/partnerEmploymentStatusPage/partnerEmploymentStatusStep.js'
import {
  partnerEmploymentIncomePageContent,
  partnerGrossIncomeField,
  partnerIncomeFieldCodes,
  partnerIncomeFrequencyField,
  partnerIncomeTypeField,
  partnerIncomeTaxField,
  partnerNationalInsuranceField,
} from '#packages/cfe-eligibility-journey/src/partnerEmploymentIncomePage/partnerEmploymentIncomeBlock.js'
import { partnerEmploymentIncomeStep } from '#packages/cfe-eligibility-journey/src/partnerEmploymentIncomePage/partnerEmploymentIncomeStep.js'

const ADULT = { isUnder18: false }
const BASE_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'yes',
  passporting: 'no',
} as const
const FIELD_VALIDATIONS = JSON.stringify([
  partnerIncomeTypeField.validWhen,
  partnerIncomeFrequencyField.validWhen,
  partnerGrossIncomeField.validWhen,
  partnerIncomeTaxField.validWhen,
  partnerNationalInsuranceField.validWhen,
])

describe('Controlled-work partner employment income page', () => {
  it('follows partner employment status and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const statusIndex = steps.findIndex(({ code }) => code === STEPS.partnerEmploymentStatus)
    const incomeIndex = steps.findIndex(({ code }) => code === STEPS.partnerIncome)

    expect(incomeIndex).to.be.greaterThan(statusIndex)
    expect(partnerEmploymentIncomeStep.path).to.equal('/partner-employment-income')
    expect(partnerEmploymentIncomeStep.title).to.equal("The partner's employment income")
    expect(partnerEmploymentIncomeStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(partnerEmploymentIncomeStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(partnerEmploymentIncomeStep.reachability)).to.include(STEPS.partnerIncome)
    expect(JSON.stringify(partnerEmploymentIncomeStep.onAccess)).to.include('PreparePartnerIncomeDetails')
    expect(JSON.stringify(partnerEmploymentIncomeStep.onSubmission)).to.include('SaveRepeatingItems')
    expect(JSON.stringify(partnerEmploymentIncomeStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(partnerEmploymentIncomeStep.onSubmission)).to.include('controlled-work-incomplete')
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.partnerIncome)
    expect(JSON.stringify(partnerEmploymentStatusStep.onSubmission)).to.include(STEPS.partnerIncome)

    const content = JSON.stringify(partnerEmploymentIncomePageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('uses partner-worded content, repeated fields, frequency choices and employment guidance', () => {
    const content = JSON.stringify(partnerEmploymentIncomePageContent)

    expect(content).to.include("The partner's employment income")
    expect(content).to.include("You can find this on the partner's payslips.")
    expect(content).to.include('Add another employment income')
    expect(content).to.include('Employment income %1')
    expect(content).to.include('Employment income (PDF, 599KB)')
    expect(content).to.include('#page=13')
    expect(content).to.include('Partners who are police officers')
    expect(content).to.include('If the partner is a police officer, the salary entered should include:')
    expect(content).to.include('any rent or force housing allowance the partner gets')
    expect(content).to.include('any police compensatory grant the partner gets')
    expect(content).to.include('Partners in prison')
    expect(content).to.include('If the partner is in prison, include any income they get from:')
    expect(content).to.include('Partners living outside the UK')
    expect(content).to.include('If the partner lives outside the UK, include all income tax payments they made.')
    expect(content).to.include('Only include UK National Insurance contributions.')
    expect(content).to.include('Partners in HM Forces')
    expect(content).to.include('If the partner is a member of HM Forces, include any of the following they get in the gross salary you enter:')
    expect(content).to.include('Self-employed partners, including partners paid in cash')
    expect(content).to.include('If the partner is self-employed, enter their drawings, dividends, bonuses or any benefits in kind from their business as their income.')
    expect(content).to.include('If the partner is paid in cash, their drawings will be any money taken out of their earnings for personal use.')
    expect(partnerIncomeFieldCodes).to.deep.equal([
      'partner_income_type',
      'partner_income_frequency',
      'partner_gross_income',
      'partner_income_tax',
      'partner_national_insurance',
    ])
    expect(partnerIncomeTypeField.fieldset?.legend?.text).to.equal('What type of employment income is this?')
    expect(partnerIncomeTypeField.items).to.deep.equal([
      {
        value: 'employment',
        text: 'A salary or wage',
        hint: 'Including if the partner is a self-employed company director or in a partnership and is paid as an employee',
      },
      { value: 'statutory_pay', text: 'Statutory Sick Pay or Statutory Maternity Pay' },
      {
        value: 'self_employment',
        text: 'Self-employment income',
        hint: 'For example, payment in cash, drawings or dividends or bonuses paid from a company account, and the value of any benefits in kind',
      },
    ])
    expect(partnerIncomeFrequencyField.fieldset?.legend?.text).to.equal(
      'When does the partner normally get this income?',
    )
    expect(partnerIncomeFrequencyField.items).to.deep.equal([
      { value: 'every_week', text: 'Every week' },
      { value: 'every_two_weeks', text: 'Every 2 weeks' },
      { value: 'every_four_weeks', text: 'Every 4 weeks' },
      { value: 'monthly', text: 'Every month' },
      { value: 'three_months', text: 'Total in last 3 months' },
    ])
    expect(JSON.stringify(partnerIncomeFrequencyField.hint)).to.include(
      'We’ll use this to calculate their monthly income. If they do not get income regularly, tell us how much they got in the last 3 months.',
    )
    expect([partnerGrossIncomeField, partnerIncomeTaxField, partnerNationalInsuranceField].map(({ inputType }) => inputType))
      .to.deep.equal(['text', 'text', 'text'])
    const amountFieldDefinitions = JSON.stringify([
      partnerGrossIncomeField,
      partnerIncomeTaxField,
      partnerNationalInsuranceField,
    ])
    for (const label of ['Income before any deductions', 'Income tax', 'National Insurance']) {
      expect(amountFieldDefinitions).to.include(`"text":"${label}"`)
    }
  })

  it('includes required, format, positive, non-negative and net-income error messages', () => {
    for (const message of [
      'Select the employment income type',
      'Select the employment income type for employment income %1',
      'Select when the partner normally gets this income',
      'Select when the partner normally gets income %1',
      'Enter the income before any deductions',
      'Enter the income before any deductions for employment income %1',
      'Income before any deductions must be a number',
      'Income before any deductions for employment income %1 must be a number',
      'Income before any deductions must be more than 0',
      'Income before any deductions for employment income %1 must be more than 0',
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
      expect(FIELD_VALIDATIONS).to.include(`"${message}"`)
    }

    expect(isValidControlledWorkAnswer('partner-income-completed', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('partner-income-completed', 'no')).to.equal(false)
  })

  it('accepts valid partner income choices and amounts and rejects invalid formats', () => {
    expect(isValidIncomeAmount('£1,234.56')).to.equal(true)
    expect(isValidIncomeAmount('12.3')).to.equal(true)
    expect(isValidIncomeAmount('1,23.45')).to.equal(false)
    expect(isValidIncomeAmount('not a number')).to.equal(false)
    expect(isPositiveIncomeAmount('0.01')).to.equal(true)
    expect(isPositiveIncomeAmount('0')).to.equal(false)
    expect(isNonNegativeIncomeAmount('0')).to.equal(true)
    expect(isNonNegativeIncomeAmount('-0.01')).to.equal(false)
    expect(isNetIncomePositive('100', '20', '10')).to.equal(true)
    expect(isNetIncomePositive('30', '20', '10')).to.equal(false)
  })

  it('is applicable only when the partner is employed on a non-passported means route', () => {
    const employed = { ...BASE_ANSWERS, 'partner-employment-status': 'in_work' } as const
    const unemployed = { ...BASE_ANSWERS, 'partner-employment-status': 'unemployed' } as const

    expect(getApplicableSteps(employed, ADULT)).to.include(STEPS.partnerIncome)
    expect(getApplicableSteps(unemployed, ADULT)).to.not.include(STEPS.partnerIncome)
    expect(getApplicableSteps({ ...employed, partner: 'no' }, ADULT)).to.not.include(STEPS.partnerIncome)
    expect(getApplicableSteps({ ...employed, passporting: 'yes' }, ADULT)).to.not.include(STEPS.partnerIncome)
    expect(getNextStep(STEPS.partnerEmploymentStatus, employed, ADULT)).to.equal(STEPS.partnerIncome)
    expect(getNextStep(STEPS.partnerEmploymentStatus, unemployed, ADULT)).to.equal(undefined)
    expect(getNextStep(STEPS.partnerIncome, { ...employed, 'partner-income-completed': 'yes' }, ADULT)).to.equal(
      undefined,
    )
  })
})
