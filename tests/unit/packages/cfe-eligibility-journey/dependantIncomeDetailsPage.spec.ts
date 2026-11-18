import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  dependantIncomeAmountField,
  dependantIncomeDetailsPageContent,
  dependantIncomeFrequencyField,
  isBelowDependantIncomeLimit,
  isPositiveDependantIncomeAmount,
  isValidDependantIncomeAmount,
} from '#packages/cfe-eligibility-journey/src/dependantIncomeDetailsPage/dependantIncomeDetailsBlock.js'
import { dependantIncomeDetailsStep } from '#packages/cfe-eligibility-journey/src/dependantIncomeDetailsPage/dependantIncomeDetailsStep.js'

const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'

describe('Controlled-work dependant income details page', () => {
  it('follows dependant income and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const incomeIndex = steps.findIndex(({ code }) => code === STEPS.dependantIncome)
    const detailsIndex = steps.findIndex(({ code }) => code === STEPS.dependantIncomeDetails)

    expect(detailsIndex).to.be.greaterThan(incomeIndex)
    expect(dependantIncomeDetailsStep.path).to.equal('/dependant-income-details')
    expect(dependantIncomeDetailsStep.title).to.equal('Add income for dependants aged 16 or over')
    expect(dependantIncomeDetailsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(dependantIncomeDetailsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(dependantIncomeDetailsStep.onAccess)).to.include('PrepareDependantIncomeDetails')
    expect(JSON.stringify(dependantIncomeDetailsStep.onSubmission)).to.include('SaveRepeatingItems')
    expect(JSON.stringify(dependantIncomeDetailsStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(dependantIncomeDetailsStep.onSubmission)).to.include('controlled-work-incomplete')
    expect(JSON.stringify(dependantIncomeDetailsStep.onSubmission)).to.include('add-another-dependant-income')
    expect(JSON.stringify(dependantIncomeDetailsStep.onSubmission)).to.include('remove_')

    const content = JSON.stringify(dependantIncomeDetailsPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('shows the CCQ heading, hint, amount and add-another controls', () => {
    const content = JSON.stringify(dependantIncomeDetailsPageContent)

    expect(content).to.include('Add income for dependants aged 16 or over')
    expect(content).to.include('Income they receive will be deducted from your client’s dependant allowance.')
    expect(content).to.include('Dependant %1')
    expect(content).to.include('Income')
    expect(content).to.include("Add another dependant's income")
    expect(content).to.include('Remove')
    expect(content).to.include('controlledWorkDependantIncomeMaxRows')
    expect(content.indexOf('When does the dependant normally get this income?')).to.be.lessThan(content.indexOf('"text":"Income"'))
    expect(dependantIncomeAmountField.inputType).to.equal('text')
    expect(dependantIncomeAmountField.attributes).to.deep.equal({ inputmode: 'decimal' })
    expect(dependantIncomeAmountField.label).to.deep.equal({ text: 'Income', classes: 'govuk-label--s' })
  })

  it('uses the CCQ frequency options and exact validation errors', () => {
    expect(dependantIncomeFrequencyField.items).to.deep.equal([
      { value: 'every_week', text: 'Every week' },
      { value: 'every_two_weeks', text: 'Every 2 weeks' },
      { value: 'every_four_weeks', text: 'Every 4 weeks' },
      { value: 'monthly', text: 'Every month' },
      { value: 'three_months', text: 'Total in last 3 months' },
    ])

    const amountValidations = JSON.stringify(dependantIncomeAmountField.validWhen)
    const frequencyValidations = JSON.stringify(dependantIncomeFrequencyField.validWhen)
    expect(amountValidations).to.include('Enter income the dependant gets')
    expect(amountValidations).to.include('Enter income dependant %1 gets')
    expect(amountValidations).to.include('Income for the dependant must be a number')
    expect(amountValidations).to.include('Income for dependant %1 must be a number')
    expect(amountValidations).to.include('Income for the dependant must be more than 0')
    expect(amountValidations).to.include('Income for dependant %1 must be more than 0')
    expect(amountValidations).to.include(
      'If this dependant gets income equivalent to £381.86 or more per month, go back and remove them as a dependant to continue with this check.',
    )
    expect(frequencyValidations).to.include('Select when the dependant normally gets this income')
    expect(frequencyValidations).to.include('Select when dependant %1 normally gets this income')
  })

  it('accepts numeric positive amounts and rejects missing, non-numeric and non-positive values', () => {
    expect(isValidDependantIncomeAmount('1')).to.equal(true)
    expect(isValidDependantIncomeAmount('12.34')).to.equal(true)
    expect(isValidDependantIncomeAmount('£1,234.56')).to.equal(true)
    for (const invalid of ['not a number', '1.2.3', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isValidDependantIncomeAmount(invalid)).to.equal(false)
    }

    expect(isPositiveDependantIncomeAmount('0.01')).to.equal(true)
    for (const invalid of ['0', '-1', '-0.01']) {
      expect(isPositiveDependantIncomeAmount(invalid)).to.equal(false)
    }
  })

  it('rejects income at the CCQ monthly-equivalent limit for each frequency', () => {
    const limits = [
      ['every_week', 88.12],
      ['every_two_weeks', 176.24],
      ['every_four_weeks', 352.49],
      ['monthly', 381.86],
      ['three_months', 1145.58],
    ] as const

    for (const [frequency, limit] of limits) {
      expect(isBelowDependantIncomeLimit(String(limit - 0.01), frequency)).to.equal(true)
      expect(isBelowDependantIncomeLimit(String(limit), frequency)).to.equal(false)
      expect(isBelowDependantIncomeLimit(String(limit + 0.01), frequency)).to.equal(false)
    }
    expect(isBelowDependantIncomeLimit('88.119', 'every_week')).to.equal(false)
    expect(isBelowDependantIncomeLimit('not a number', 'monthly')).to.equal(true)
    expect(isBelowDependantIncomeLimit('400', 'not-a-frequency')).to.equal(true)
  })

  it('includes the controlled-work dependant-income guidance link', () => {
    const content = JSON.stringify(dependantIncomeDetailsPageContent)

    expect(content).to.include(`"href":["${GUIDANCE_URL}#page=22"]`)
    expect(content).to.include("Dependants' income (PDF, 599KB)")
  })
})
