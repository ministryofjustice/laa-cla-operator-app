import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { type MoneyFieldConfig, createAmountField, createFrequencyField, createMoneyFieldRow } from '../moneyFieldHelpers.js'

export const incomeHeading = GovUKHeading({
  text: 'Your income',
  size: 'm',
})

export const selfEmployedField = GovUKRadioInput({
  code: 'self-employed',
  fieldset: {
    legend: {
      text: 'Are you self employed?',
    },
  },
  classes: GovUKUtilityClasses.Radios.Inline,
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Select yes if you are self employed',
    }),
  ],
})

const earningsConfig: MoneyFieldConfig = {
  code: 'earnings',
  label: 'What did you earn before tax? (Check your most recent payslips)',
  emptyMessage: 'Enter what you earned before tax, or enter \'0\' if none',
  invalidMessage: 'What you earned before tax must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for what you earned before tax',
  frequencyMessage: 'Select the frequency for what you earned before tax',
}
export const earningsField = createAmountField(earningsConfig)
export const earningsFrequencyField = createFrequencyField(earningsConfig)
export const earningsRow = createMoneyFieldRow(earningsConfig, earningsField, earningsFrequencyField)

const incomeTaxConfig: MoneyFieldConfig = {
  code: 'income-tax',
  label: 'How much tax do you pay?',
  emptyMessage: 'Enter how much tax you pay, or enter \'0\' if none',
  invalidMessage: 'How much tax you pay must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for how much tax you pay',
  frequencyMessage: 'Select the frequency for how much tax you pay',
}
export const incomeTaxField = createAmountField(incomeTaxConfig)
export const incomeTaxFrequencyField = createFrequencyField(incomeTaxConfig)
export const incomeTaxRow = createMoneyFieldRow(incomeTaxConfig, incomeTaxField, incomeTaxFrequencyField)

const nationalInsuranceConfig: MoneyFieldConfig = {
  code: 'national-insurance',
  label: 'How much National Insurance do you pay?',
  emptyMessage: 'Enter how much National Insurance you pay, or enter \'0\' if none',
  invalidMessage: 'How much National Insurance you pay must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for how much National Insurance you pay',
  frequencyMessage: 'Select the frequency for how much National Insurance you pay',
}
export const nationalInsuranceField = createAmountField(nationalInsuranceConfig)
export const nationalInsuranceFrequencyField = createFrequencyField(nationalInsuranceConfig)
export const nationalInsuranceRow = createMoneyFieldRow(nationalInsuranceConfig, nationalInsuranceField, nationalInsuranceFrequencyField)

const selfEmploymentDrawingsConfig: MoneyFieldConfig = {
  code: 'self-employment-drawings',
  label: 'Self employed drawings (Before Tax)',
  emptyMessage: 'Enter your self employed drawings (before tax), or enter \'0\' if none',
  invalidMessage: 'Your self employed drawings (before tax) must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for your self employed drawings (before tax)',
  frequencyMessage: 'Select the frequency for your self employed drawings (before tax)',
}
export const selfEmploymentDrawingsField = createAmountField(selfEmploymentDrawingsConfig)
export const selfEmploymentDrawingsFrequencyField = createFrequencyField(selfEmploymentDrawingsConfig)
export const selfEmploymentDrawingsRow = createMoneyFieldRow(selfEmploymentDrawingsConfig, selfEmploymentDrawingsField, selfEmploymentDrawingsFrequencyField)

const incomeBenefitsConfig: MoneyFieldConfig = {
  code: 'income-benefits',
  label: 'Benefits',
  emptyMessage: 'Enter the total of any benefits you get, or enter \'0\' if none',
  invalidMessage: 'The total of any benefits you get must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any benefits you get',
  frequencyMessage: 'Select the frequency for the total of any benefits you get',
}
export const incomeBenefitsField = createAmountField(incomeBenefitsConfig)
export const incomeBenefitsFrequencyField = createFrequencyField(incomeBenefitsConfig)
export const incomeBenefitsRow = createMoneyFieldRow(incomeBenefitsConfig, incomeBenefitsField, incomeBenefitsFrequencyField)

const taxCreditsConfig: MoneyFieldConfig = {
  code: 'tax-credits',
  label: 'Tax credits',
  emptyMessage: 'Enter the total of any tax credits you get, or enter \'0\' if none',
  invalidMessage: 'The total of any tax credits you get must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any tax credits you get',
  frequencyMessage: 'Select the frequency for the total of any tax credits you get',
}
export const taxCreditsField = createAmountField(taxCreditsConfig)
export const taxCreditsFrequencyField = createFrequencyField(taxCreditsConfig)
export const taxCreditsRow = createMoneyFieldRow(taxCreditsConfig, taxCreditsField, taxCreditsFrequencyField)

const childBenefitConfig: MoneyFieldConfig = {
  code: 'child-benefit',
  label: 'Child Benefit (for household)',
  emptyMessage: 'Enter the total of any child benefit you get, or enter \'0\' if none',
  invalidMessage: 'The total of any child benefit you get must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any child benefit you get',
  frequencyMessage: 'Select the frequency for the total of any child benefit you get',
}
export const childBenefitField = createAmountField(childBenefitConfig)
export const childBenefitFrequencyField = createFrequencyField(childBenefitConfig)
export const childBenefitRow = createMoneyFieldRow(childBenefitConfig, childBenefitField, childBenefitFrequencyField)

const maintenanceReceivedConfig: MoneyFieldConfig = {
  code: 'maintenance-received',
  label: 'Maintenance received',
  emptyMessage: 'Enter the total of any maintenance you get, or enter \'0\' if none',
  invalidMessage: 'The total of any maintenance you get must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any maintenance you get',
  frequencyMessage: 'Select the frequency for the total of any maintenance you get',
}
export const maintenanceReceivedField = createAmountField(maintenanceReceivedConfig)
export const maintenanceReceivedFrequencyField = createFrequencyField(maintenanceReceivedConfig)
export const maintenanceReceivedRow = createMoneyFieldRow(maintenanceReceivedConfig, maintenanceReceivedField, maintenanceReceivedFrequencyField)

const pensionIncomeConfig: MoneyFieldConfig = {
  code: 'pension-income',
  label: 'Pension income',
  emptyMessage: 'Enter the total of any pension income you get, or enter \'0\' if none',
  invalidMessage: 'The total of any pension income you get must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any pension income you get',
  frequencyMessage: 'Select the frequency for the total of any pension income you get',
}
export const pensionIncomeField = createAmountField(pensionIncomeConfig)
export const pensionIncomeFrequencyField = createFrequencyField(pensionIncomeConfig)
export const pensionIncomeRow = createMoneyFieldRow(pensionIncomeConfig, pensionIncomeField, pensionIncomeFrequencyField)

const otherIncomeConfig: MoneyFieldConfig = {
  code: 'other-income',
  label: 'Other income',
  emptyMessage: 'Enter the total of any other income you get, or enter \'0\' if none',
  invalidMessage: 'The total of any other income you get must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any other income you get',
  frequencyMessage: 'Select the frequency for the total of any other income you get',
}
export const otherIncomeField = createAmountField(otherIncomeConfig)
export const otherIncomeFrequencyField = createFrequencyField(otherIncomeConfig)
export const otherIncomeRow = createMoneyFieldRow(otherIncomeConfig, otherIncomeField, otherIncomeFrequencyField)
