import { Format } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading } from '@ministryofjustice/hmpps-forge/govuk-components'
import { type MoneyFieldConfig, createAmountField, createFrequencyField, createMoneyFieldRow, lastCalendarMonthDate } from '../moneyFieldHelpers.js'

export const expensesHeading = GovUKHeading({
  text: 'Your expenses',
  size: 'm',
})

const mortgageConfig: MoneyFieldConfig = {
  code: 'mortgage',
  label: 'How much do you pay for your mortgage?',
  emptyMessage: 'Enter how much you pay for your mortgage, or enter \'0\' if none',
  invalidMessage: 'How much you pay for your mortgage must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for how much you pay for your mortgage',
  frequencyMessage: 'Select the frequency for when you pay your mortgage',
}
export const mortgageField = createAmountField(mortgageConfig)
export const mortgageFrequencyField = createFrequencyField(mortgageConfig)
export const mortgageRow = createMoneyFieldRow(mortgageConfig, mortgageField, mortgageFrequencyField)

const rentConfig: MoneyFieldConfig = {
  code: 'rent',
  label: 'How much do you pay for rent? The amount entered should not include any housing benefit or payments for bills.',
  emptyMessage: 'Enter how much you pay for rent, or enter \'0\' if none',
  invalidMessage: 'How much you pay for rent must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for how much you pay for rent',
  frequencyMessage: 'Select the frequency for when you pay rent',
}
export const rentField = createAmountField(rentConfig)
export const rentFrequencyField = createFrequencyField(rentConfig)
export const rentRow = createMoneyFieldRow(rentConfig, rentField, rentFrequencyField)

const maintenancePaidConfig: MoneyFieldConfig = {
  code: 'maintenance-paid',
  label: Format('How much maintenance have you paid during the last calendar month (today back to %1)?', lastCalendarMonthDate()),
  emptyMessage: 'Enter how much maintenance you paid during the last calendar month, or enter \'0\' if none',
  invalidMessage: 'How much maintenance you paid during the last calendar month must be a positive number, like 100 or 240.50',
  frequencyLabel: 'Frequency for how much maintenance you paid during the last calendar month',
  frequencyMessage: 'Select the frequency for when you pay maintenance',
}
export const maintenancePaidField = createAmountField(maintenancePaidConfig)
export const maintenancePaidFrequencyField = createFrequencyField(maintenancePaidConfig)
export const maintenancePaidRow = createMoneyFieldRow(maintenancePaidConfig, maintenancePaidField, maintenancePaidFrequencyField)

const childcareCostsConfig: MoneyFieldConfig = {
  code: 'childcare-costs',
  label: 'Do you have any childcare costs because of work or study? If so, how much?',
  emptyMessage: 'Enter any childcare costs you have because of work or study, or enter \'0\' if none',
  invalidMessage: 'Any childcare costs you have because of work or study must be a positive number, like 100 or 240.50',
  frequencyLabel: 'Frequency for any childcare costs you have because of work or study',
  frequencyMessage: 'Select the frequency for when you pay any childcare costs you have because of work or study',
}
export const childcareCostsField = createAmountField(childcareCostsConfig)
export const childcareCostsFrequencyField = createFrequencyField(childcareCostsConfig)
export const childcareCostsRow = createMoneyFieldRow(childcareCostsConfig, childcareCostsField, childcareCostsFrequencyField)

// No paired frequency field - the API always stores this as 'per_month' (see criminal_legalaid_contributions in
// transformFinancialEligibility.ts), and the ticket's spec omits a "frequency is empty" validation message for it.
const legalAidContributionsConfig: MoneyFieldConfig = {
  code: 'legal-aid-contributions',
  label: Format('Are you currently paying towards legal aid for criminal defence? If so, how much have you paid during the last calendar month (today back to %1)?', lastCalendarMonthDate()),
  emptyMessage: 'Enter how much you paid towards legal aid for criminal defence in the last calendar month, or enter \'0\' if none',
  invalidMessage: 'How much you paid towards legal aid for criminal defence in the last calendar month must be a number, like 100 or 240.50',
  frequencyLabel: '',
  frequencyMessage: '',
  fixedFrequencySuffix: 'Monthly',
}
export const legalAidContributionsHeading = GovUKHeading({ text: legalAidContributionsConfig.label, size: 's', classes: 'govuk-!-margin-bottom-2' })
export const legalAidContributionsField = createAmountField(legalAidContributionsConfig)
