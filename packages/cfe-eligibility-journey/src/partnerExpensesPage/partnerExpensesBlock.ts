import { Format } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading } from '@ministryofjustice/hmpps-forge/govuk-components'
import { type MoneyFieldConfig, createAmountField, createFrequencyField, createMoneyFieldRow, lastCalendarMonthDate } from '../moneyFieldHelpers.js'

export const partnerExpensesHeading = GovUKHeading({
  text: 'Your partner\'s expenses',
  size: 'm',
})

const mortgagePartnerConfig: MoneyFieldConfig = {
  code: 'mortgage-partner',
  label: 'How much does your partner pay for their mortgage?',
  emptyMessage: 'Enter how much your partner pays for their mortgage, or enter \'0\' if none',
  invalidMessage: 'How much your partner pays for their mortgage must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for how much your partner pays for their mortgage',
  frequencyMessage: 'Select the frequency for when your partner pays their mortgage',
}
export const mortgagePartnerField = createAmountField(mortgagePartnerConfig)
export const mortgagePartnerFrequencyField = createFrequencyField(mortgagePartnerConfig)
export const mortgagePartnerRow = createMoneyFieldRow(mortgagePartnerConfig, mortgagePartnerField, mortgagePartnerFrequencyField)

const rentPartnerConfig: MoneyFieldConfig = {
  code: 'rent-partner',
  label: 'How much does your partner pay for their rent? The amount entered should not include any housing benefit or payment for bills',
  emptyMessage: 'Enter how much your partner pays for their rent, or enter \'0\' if none',
  invalidMessage: 'How much your partner pays for their rent must be a positive number, like 1000 or 2400.50',
  frequencyLabel: 'Frequency for how much your partner pays for their rent',
  frequencyMessage: 'Select the frequency for when your partner pays rent',
}
export const rentPartnerField = createAmountField(rentPartnerConfig)
export const rentPartnerFrequencyField = createFrequencyField(rentPartnerConfig)
export const rentPartnerRow = createMoneyFieldRow(rentPartnerConfig, rentPartnerField, rentPartnerFrequencyField)

const maintenancePaidPartnerConfig: MoneyFieldConfig = {
  code: 'maintenance-paid-partner',
  label: Format('How much maintenance has your partner paid during the last calendar month (today back to %1)?', lastCalendarMonthDate()),
  emptyMessage: 'Enter how much maintenance your partner paid during the last calendar month, or enter \'0\' if none',
  invalidMessage: 'How much maintenance your partner paid during the last calendar month must be a positive number, like 100 or 240.50',
  frequencyLabel: 'Frequency for how much maintenance your partner paid during the last calendar month',
  frequencyMessage: 'Select the frequency for when your partner pays maintenance',
}
export const maintenancePaidPartnerField = createAmountField(maintenancePaidPartnerConfig)
export const maintenancePaidPartnerFrequencyField = createFrequencyField(maintenancePaidPartnerConfig)
export const maintenancePaidPartnerRow = createMoneyFieldRow(maintenancePaidPartnerConfig, maintenancePaidPartnerField, maintenancePaidPartnerFrequencyField)

const childcareCostsPartnerConfig: MoneyFieldConfig = {
  code: 'childcare-costs-partner',
  label: 'Does your partner have any childcare costs because of work or study? If so, how much?',
  emptyMessage: 'Enter any childcare costs your partner has because of work or study, or enter \'0\' if none',
  invalidMessage: 'Any childcare costs your partner has because of work or study must be a positive number, like 100 or 240.50',
  frequencyLabel: 'Frequency for any childcare costs your partner has because of work or study',
  frequencyMessage: 'Select the frequency for when your partner pays any childcare costs they have because of work or study',
}
export const childcareCostsPartnerField = createAmountField(childcareCostsPartnerConfig)
export const childcareCostsPartnerFrequencyField = createFrequencyField(childcareCostsPartnerConfig)
export const childcareCostsPartnerRow = createMoneyFieldRow(childcareCostsPartnerConfig, childcareCostsPartnerField, childcareCostsPartnerFrequencyField)

// No paired frequency field - the API always stores this as 'per_month' (see criminal_legalaid_contributions in
// transformFinancialEligibility.ts), and the ticket's spec omits a "frequency is empty" validation message for it.
const legalAidContributionsPartnerConfig: MoneyFieldConfig = {
  code: 'legal-aid-contributions-partner',
  label: Format('Is your partner currently paying towards legal aid for criminal defence? If so, how much has your partner paid in the last calendar month (today back to %1)?', lastCalendarMonthDate()),
  emptyMessage: 'Enter how much your partner paid towards legal aid for criminal defence in the last calendar month, or enter \'0\' if none',
  invalidMessage: 'How much your partner paid towards legal aid for criminal defence in the last calendar month must be a number, like 100 or 240.50',
  frequencyLabel: '',
  frequencyMessage: '',
  fixedFrequencySuffix: 'Monthly',
}
export const legalAidContributionsPartnerHeading = GovUKHeading({ text: legalAidContributionsPartnerConfig.label, size: 's', classes: 'govuk-!-margin-bottom-2' })
export const legalAidContributionsPartnerField = createAmountField(legalAidContributionsPartnerConfig)
