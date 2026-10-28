import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { type MoneyFieldConfig, createAmountField, createFrequencyField, createMoneyFieldRow } from '../moneyFieldHelpers.js'

export const partnerIncomeHeading = GovUKHeading({
  text: 'Your partner\'s income',
  size: 'm',
})

export const selfEmployedPartnerField = GovUKRadioInput({
  code: 'self-employed-partner',
  fieldset: {
    legend: {
      text: 'Is your partner self employed?',
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
      message: 'Select yes if your partner is self employed',
    }),
  ],
})

const earningsPartnerConfig: MoneyFieldConfig = {
  code: 'earnings-partner',
  label: 'What did your partner earn before tax? (Check their most recent payslips)',
  emptyMessage: 'Enter what your partner earned before tax, or enter \'0\' if none',
  invalidMessage: 'What your partner earned before tax must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for what your partner earned before tax',
  frequencyMessage: 'Select the frequency for what your partner earned before tax',
}
export const earningsPartnerField = createAmountField(earningsPartnerConfig)
export const earningsPartnerFrequencyField = createFrequencyField(earningsPartnerConfig)
export const earningsPartnerRow = createMoneyFieldRow(earningsPartnerConfig, earningsPartnerField, earningsPartnerFrequencyField)

const incomeTaxPartnerConfig: MoneyFieldConfig = {
  code: 'income-tax-partner',
  label: 'How much tax does your partner pay?',
  emptyMessage: 'Enter how much tax your partner pays, or enter \'0\' if none',
  invalidMessage: 'How much tax your partner pays must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for how much tax your partner pays',
  frequencyMessage: 'Select the frequency for how much tax your partner pays',
}
export const incomeTaxPartnerField = createAmountField(incomeTaxPartnerConfig)
export const incomeTaxPartnerFrequencyField = createFrequencyField(incomeTaxPartnerConfig)
export const incomeTaxPartnerRow = createMoneyFieldRow(incomeTaxPartnerConfig, incomeTaxPartnerField, incomeTaxPartnerFrequencyField)

const nationalInsurancePartnerConfig: MoneyFieldConfig = {
  code: 'national-insurance-partner',
  label: 'How much National Insurance does your partner pay?',
  emptyMessage: 'Enter how much National Insurance your partner pays, or enter \'0\' if none',
  invalidMessage: 'How much National Insurance your partner pays must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for how much National Insurance your partner pays',
  frequencyMessage: 'Select the frequency for how much National Insurance your partner pays',
}
export const nationalInsurancePartnerField = createAmountField(nationalInsurancePartnerConfig)
export const nationalInsurancePartnerFrequencyField = createFrequencyField(nationalInsurancePartnerConfig)
export const nationalInsurancePartnerRow = createMoneyFieldRow(nationalInsurancePartnerConfig, nationalInsurancePartnerField, nationalInsurancePartnerFrequencyField)

// Kept as "Self employed drawings (Before Tax)", matching the Figma design exactly (not reworded to "your partner's")
const selfEmploymentDrawingsPartnerConfig: MoneyFieldConfig = {
  code: 'self-employment-drawings-partner',
  label: 'Self employed drawings (Before Tax)',
  emptyMessage: 'Enter your partner\'s self employed drawings (before tax), or enter \'0\' if none',
  invalidMessage: 'Your partner\'s self employed drawings (before tax) must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for your partner\'s self employed drawings (before tax)',
  frequencyMessage: 'Select the frequency for your partner\'s self employed drawings (before tax)',
}
export const selfEmploymentDrawingsPartnerField = createAmountField(selfEmploymentDrawingsPartnerConfig)
export const selfEmploymentDrawingsPartnerFrequencyField = createFrequencyField(selfEmploymentDrawingsPartnerConfig)
export const selfEmploymentDrawingsPartnerRow = createMoneyFieldRow(selfEmploymentDrawingsPartnerConfig, selfEmploymentDrawingsPartnerField, selfEmploymentDrawingsPartnerFrequencyField)

const incomeBenefitsPartnerConfig: MoneyFieldConfig = {
  code: 'income-benefits-partner',
  label: 'Benefits',
  emptyMessage: 'Enter the total of any benefits your partner gets, or enter \'0\' if none',
  invalidMessage: 'The total of any benefits your partner gets must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any benefits your partner gets',
  frequencyMessage: 'Select the frequency for the total of any benefits your partner gets',
}
export const incomeBenefitsPartnerField = createAmountField(incomeBenefitsPartnerConfig)
export const incomeBenefitsPartnerFrequencyField = createFrequencyField(incomeBenefitsPartnerConfig)
export const incomeBenefitsPartnerRow = createMoneyFieldRow(incomeBenefitsPartnerConfig, incomeBenefitsPartnerField, incomeBenefitsPartnerFrequencyField)

const taxCreditsPartnerConfig: MoneyFieldConfig = {
  code: 'tax-credits-partner',
  label: 'Tax credits',
  emptyMessage: 'Enter the total of any tax credits your partner gets, or enter \'0\' if none',
  invalidMessage: 'The total of any tax credits your partner gets must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any tax credits your partner gets',
  frequencyMessage: 'Select the frequency for the total of any tax credits your partner gets',
}
export const taxCreditsPartnerField = createAmountField(taxCreditsPartnerConfig)
export const taxCreditsPartnerFrequencyField = createFrequencyField(taxCreditsPartnerConfig)
export const taxCreditsPartnerRow = createMoneyFieldRow(taxCreditsPartnerConfig, taxCreditsPartnerField, taxCreditsPartnerFrequencyField)

const maintenanceReceivedPartnerConfig: MoneyFieldConfig = {
  code: 'maintenance-received-partner',
  label: 'Maintenance received',
  emptyMessage: 'Enter the total of any maintenance your partner gets, or enter \'0\' if none',
  invalidMessage: 'The total of any maintenance your partner gets must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any maintenance your partner gets',
  frequencyMessage: 'Select the frequency for the total of any maintenance your partner gets',
}
export const maintenanceReceivedPartnerField = createAmountField(maintenanceReceivedPartnerConfig)
export const maintenanceReceivedPartnerFrequencyField = createFrequencyField(maintenanceReceivedPartnerConfig)
export const maintenanceReceivedPartnerRow = createMoneyFieldRow(maintenanceReceivedPartnerConfig, maintenanceReceivedPartnerField, maintenanceReceivedPartnerFrequencyField)

const pensionIncomePartnerConfig: MoneyFieldConfig = {
  code: 'pension-income-partner',
  label: 'Pension income',
  emptyMessage: 'Enter the total of any pension income your partner gets, or enter \'0\' if none',
  invalidMessage: 'The total of any pension income your partner gets must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any pension income your partner gets',
  frequencyMessage: 'Select the frequency for the total of any pension income your partner gets',
}
export const pensionIncomePartnerField = createAmountField(pensionIncomePartnerConfig)
export const pensionIncomePartnerFrequencyField = createFrequencyField(pensionIncomePartnerConfig)
export const pensionIncomePartnerRow = createMoneyFieldRow(pensionIncomePartnerConfig, pensionIncomePartnerField, pensionIncomePartnerFrequencyField)

const otherIncomePartnerConfig: MoneyFieldConfig = {
  code: 'other-income-partner',
  label: 'Other income',
  emptyMessage: 'Enter the total of any other income your partner gets, or enter \'0\' if none',
  invalidMessage: 'The total of any other income your partner gets must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for the total of any other income your partner gets',
  frequencyMessage: 'Select the frequency for the total of any other income your partner gets',
}
export const otherIncomePartnerField = createAmountField(otherIncomePartnerConfig)
export const otherIncomePartnerFrequencyField = createFrequencyField(otherIncomePartnerConfig)
export const otherIncomePartnerRow = createMoneyFieldRow(otherIncomePartnerConfig, otherIncomePartnerField, otherIncomePartnerFrequencyField)
