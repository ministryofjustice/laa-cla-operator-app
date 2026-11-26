import { Answer, Format, Transformer } from '@ministryofjustice/hmpps-forge/core/authoring'
import type { ResolvableString } from '@ministryofjustice/hmpps-forge/core/components'
import { Transformers } from '../formatters.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS, type ControlledWorkAnswerCode, type ControlledWorkStepCode } from '../controlledWork/controlledWorkTypes.js'

export const CONTROLLED_WORK_CHECK_STEP_TITLES: Record<ControlledWorkStepCode, string> = {
  [STEPS.immigrationOrAsylum]: 'Immigration or asylum matter',
  [STEPS.under18Clr]: 'Controlled legal representation',
  [STEPS.aggregatedMeans]: 'Aggregated means',
  [STEPS.howToAggregate]: 'Aggregating means',
  [STEPS.regularIncome]: 'Regular income',
  [STEPS.under18Assets]: 'Under-18 assets',
  [STEPS.immigrationOrAsylumType]: 'Matter type',
  [STEPS.asylumSupport]: 'Asylum support',
  [STEPS.applicant]: 'Applicant',
  [STEPS.dependantDetails]: 'Dependants',
  [STEPS.dependantIncome]: 'Dependant income',
  [STEPS.dependantIncomeDetails]: 'Dependant income details',
  [STEPS.employmentStatus]: 'Employment',
  [STEPS.income]: 'Income',
  [STEPS.benefits]: 'Benefits',
  [STEPS.benefitDetails]: 'Benefit details',
  [STEPS.otherIncome]: 'Other income',
  [STEPS.partnerDetails]: 'Partner details',
  [STEPS.partnerEmploymentStatus]: 'Partner employment',
  [STEPS.partnerIncome]: 'Partner income',
  [STEPS.partnerBenefits]: 'Partner benefits',
  [STEPS.partnerBenefitDetails]: 'Partner benefit details',
  [STEPS.partnerOtherIncome]: 'Partner other income',
  [STEPS.outgoings]: 'Outgoings',
  [STEPS.partnerOutgoings]: 'Partner outgoings',
  [STEPS.property]: 'Property',
  [STEPS.propertyLandlord]: 'Shared ownership',
  [STEPS.sharedOwnershipHousingCosts]: 'Shared ownership housing costs',
  [STEPS.mortgageOrLoanPayment]: 'Mortgage or loan payments',
  [STEPS.housingCosts]: 'Housing costs',
  [STEPS.propertyEntry]: 'Main property details',
  [STEPS.additionalProperty]: 'Additional property',
  [STEPS.additionalPropertyDetails]: 'Additional property details',
  [STEPS.partnerAdditionalProperty]: 'Partner additional property',
  [STEPS.partnerAdditionalPropertyDetails]: 'Partner additional property details',
  [STEPS.assets]: 'Client assets',
  [STEPS.partnerAssets]: 'Partner assets',
}

export const CONTROLLED_WORK_CHECK_ANSWER_LABELS: Partial<Record<ControlledWorkAnswerCode, string>> = {
  'immigration-or-asylum': 'Is this an immigration or asylum matter?',
  'controlled-legal-representation': 'Is the work controlled legal representation (CLR)?',
  'aggregated-means': "Will you aggregate your client's means with another person's means?",
  'regular-income': 'Does your client get regular income?',
  'under-18-assets': 'Does your client have assets worth £2,500 or more?',
  'immigration-or-asylum-type': 'What type of immigration or asylum matter is this?',
  'asylum-support': 'Does your client receive asylum support?',
  partner: 'Does your client have a partner?',
  passporting: 'Does your client receive a passporting benefit?',
  'child-dependants': 'Does your client have any child dependants?',
  'child-dependants-count': 'How many child dependants are there?',
  'adult-dependants': 'Does your client have any adult dependants?',
  'adult-dependants-count': 'How many adult dependants are there?',
  'dependants-get-income': 'Do any of the dependants aged 16 or over get regular income?',
  'partner-over-60': 'Is your client’s partner aged 60 or over?',
  'employment-status': 'What is your client’s employment status?',
  'receives-benefits': 'Does your client get any non-passporting benefits?',
  'partner-employment-status': 'What is your client’s partner’s employment status?',
  'partner-receives-benefits': 'Does your client’s partner get any non-passporting benefits?',
  friends_or_family_relevant: 'Does your client receive money from friends or family?',
  friends_or_family_conditional_value: 'Amount',
  friends_or_family_frequency: 'Frequency',
  maintenance_relevant: 'Does your client receive maintenance?',
  maintenance_conditional_value: 'Amount',
  maintenance_frequency: 'Frequency',
  property_or_lodger_relevant: 'Does your client receive rent from a property or lodger?',
  property_or_lodger_conditional_value: 'Amount',
  property_or_lodger_frequency: 'Frequency',
  pension_relevant: 'Does your client receive a pension?',
  pension_conditional_value: 'Amount',
  pension_frequency: 'Frequency',
  student_finance_relevant: 'Does your client receive student finance?',
  student_finance_conditional_value: 'Amount',
  other_relevant: 'Does your client receive any other income?',
  other_conditional_value: 'Amount',
  partner_friends_or_family_relevant: 'Does your client’s partner receive money from friends or family?',
  partner_friends_or_family_conditional_value: 'Amount',
  partner_friends_or_family_frequency: 'Frequency',
  partner_maintenance_relevant: 'Does your client’s partner receive maintenance?',
  partner_maintenance_conditional_value: 'Amount',
  partner_maintenance_frequency: 'Frequency',
  partner_property_or_lodger_relevant: 'Does your client’s partner receive rent from a property or lodger?',
  partner_property_or_lodger_conditional_value: 'Amount',
  partner_property_or_lodger_frequency: 'Frequency',
  partner_pension_relevant: 'Does your client’s partner receive a pension?',
  partner_pension_conditional_value: 'Amount',
  partner_pension_frequency: 'Frequency',
  partner_student_finance_relevant: 'Does your client’s partner receive student finance?',
  partner_student_finance_conditional_value: 'Amount',
  partner_other_relevant: 'Does your client’s partner receive any other income?',
  partner_other_conditional_value: 'Amount',
  childcare_payments_relevant: 'Does your client pay for childcare?',
  childcare_payments_conditional_value: 'Amount',
  childcare_payments_frequency: 'Frequency',
  maintenance_payments_relevant: 'Does your client pay maintenance?',
  maintenance_payments_conditional_value: 'Amount',
  maintenance_payments_frequency: 'Frequency',
  legal_aid_payments_relevant: 'Does your client make legal aid payments?',
  legal_aid_payments_conditional_value: 'Amount',
  legal_aid_payments_frequency: 'Frequency',
  partner_childcare_payments_relevant: 'Does your client’s partner pay for childcare?',
  partner_childcare_payments_conditional_value: 'Amount',
  partner_childcare_payments_frequency: 'Frequency',
  partner_maintenance_payments_relevant: 'Does your client’s partner pay maintenance?',
  partner_maintenance_payments_conditional_value: 'Amount',
  partner_maintenance_payments_frequency: 'Frequency',
  partner_legal_aid_payments_relevant: 'Does your client’s partner make legal aid payments?',
  partner_legal_aid_payments_conditional_value: 'Amount',
  partner_legal_aid_payments_frequency: 'Frequency',
  'property-owned': 'Does your client own the home they usually live in?',
  'property-landlord': 'Is the landlord the only other joint-owner?',
  rent: 'Enter amount of rent payments',
  shared_ownership_mortgage: 'Enter the mortgage payment',
  combined_frequency: 'Select frequency of mortgage and rent payments',
  housing_benefit_relevant: 'Does your client receive Housing Benefit?',
  housing_benefit_value: 'Amount',
  housing_benefit_frequency: 'Frequency',
  housing_loan_payments: 'Enter full amount due',
  housing_payments_loan_frequency: 'Select frequency',
  housing_payments: 'Enter amount',
  housing_payments_frequency: 'Select frequency',
  house_value: 'Home value',
  mortgage: 'How much is left to pay on the mortgage?',
  percentage_owned: 'What percentage of the home do they own?',
  house_in_dispute: 'This asset is a subject matter of dispute',
  'additional-property-owned': 'Does your client own any other property, a holiday home or land?',
  'partner-additional-property-owned': 'Does the partner own any other property, a holiday home or land?',
  investments_relevant: 'Does your client have any investments?',
  investments: 'Total of all investments',
  investments_in_dispute: 'This asset is a subject matter of dispute',
  valuables_relevant: 'Does your client have valuable items worth £500 or more?',
  valuables: 'Total of all valuable items',
  valuables_in_dispute: 'This asset is a subject matter of dispute',
  partner_investments_relevant: 'Does the partner have any investments?',
  partner_investments: 'Total of all investments',
  partner_valuables_relevant: 'Does the partner have valuable items worth £500 or more?',
  partner_valuables: 'Total of all valuable items',
}

export const CONTROLLED_WORK_CHECK_INTERNAL_ANSWER_CODES = new Set<ControlledWorkAnswerCode>([
  'income-completed',
  'benefit-details-completed',
  'other-income-completed',
  'partner-income-completed',
  'partner-benefit-details-completed',
  'partner-other-income-completed',
  'additional-property-details-completed',
  'partner-additional-property-details-completed',
  'assets-completed',
  'partner-assets-completed',
])

const CURRENCY_ANSWER_CODES = new Set<ControlledWorkAnswerCode>([
  'friends_or_family_conditional_value',
  'maintenance_conditional_value',
  'property_or_lodger_conditional_value',
  'pension_conditional_value',
  'student_finance_conditional_value',
  'other_conditional_value',
  'partner_friends_or_family_conditional_value',
  'partner_maintenance_conditional_value',
  'partner_property_or_lodger_conditional_value',
  'partner_pension_conditional_value',
  'partner_student_finance_conditional_value',
  'partner_other_conditional_value',
  'childcare_payments_conditional_value',
  'maintenance_payments_conditional_value',
  'legal_aid_payments_conditional_value',
  'partner_childcare_payments_conditional_value',
  'partner_maintenance_payments_conditional_value',
  'partner_legal_aid_payments_conditional_value',
  'rent',
  'shared_ownership_mortgage',
  'housing_benefit_value',
  'housing_loan_payments',
  'housing_payments',
  'house_value',
  'mortgage',
  'investments',
  'valuables',
  'partner_investments',
  'partner_valuables',
])

const FREQUENCY_LABELS: Record<string, string> = {
  every_week: 'Every week',
  every_two_weeks: 'Every 2 weeks',
  every_four_weeks: 'Every 4 weeks',
  monthly: 'Every month',
  three_months: 'Total in last 3 months',
  total: 'Total in last 3 months',
}

const CHOICE_LABELS: Partial<Record<string, Record<string, string>>> = {
  'immigration-or-asylum-type': {
    immigration_clr: 'Immigration CLR',
    immigration_legal_help: 'Immigration legal help',
    asylum: 'Asylum',
  },
  'employment-status': { in_work: 'In work', unemployed: 'Unemployed' },
  'partner-employment-status': { in_work: 'In work', unemployed: 'Unemployed' },
  income_type: {
    employment: 'A salary or wage',
    statutory_pay: 'Statutory Sick Pay or Statutory Maternity Pay',
    self_employment: 'Self-employment income',
  },
  partner_income_type: {
    employment: 'A salary or wage',
    statutory_pay: 'Statutory Sick Pay or Statutory Maternity Pay',
    self_employment: 'Self-employment income',
  },
  'property-owned': {
    with_mortgage: 'Yes, with a mortgage or loan',
    shared_ownership: 'Yes, through a shared ownership scheme',
    outright: 'Yes, owned outright',
    none: 'No',
  },
  'additional-property-owned': {
    with_mortgage: 'With a mortgage',
    shared_ownership: 'Shared ownership',
    outright: 'Owned outright',
    none: 'None',
  },
  'partner-additional-property-owned': {
    with_mortgage: 'With a mortgage',
    shared_ownership: 'Shared ownership',
    outright: 'Owned outright',
    none: 'None',
  },
}

const FREQUENCY_ANSWER_CODES = new Set<ControlledWorkAnswerCode>([
  'friends_or_family_frequency',
  'maintenance_frequency',
  'property_or_lodger_frequency',
  'pension_frequency',
  'partner_friends_or_family_frequency',
  'partner_maintenance_frequency',
  'partner_property_or_lodger_frequency',
  'partner_pension_frequency',
  'childcare_payments_frequency',
  'maintenance_payments_frequency',
  'legal_aid_payments_frequency',
  'partner_childcare_payments_frequency',
  'partner_maintenance_payments_frequency',
  'partner_legal_aid_payments_frequency',
  'combined_frequency',
  'housing_benefit_frequency',
  'housing_payments_loan_frequency',
  'housing_payments_frequency',
])

/**
 * Formats an answer using the labels already used by the controlled-work form fields.
 * @param {ControlledWorkAnswerCode} code The saved answer code
 * @returns {ResolvableString} The summary value expression
 */
export function formatControlledWorkAnswer(code: ControlledWorkAnswerCode): ResolvableString {
  if (CURRENCY_ANSWER_CODES.has(code)) return Answer(code).pipe(Transformers.Currency())
  if (code === 'percentage_owned') return Format('%1%', Answer(code))

  const { [code]: choiceLabels } = CHOICE_LABELS
  if (choiceLabels !== undefined) {
    return Object.entries(choiceLabels).reduce(
      (value, [storedValue, label]) => value.pipe(Transformer.String.Replace(storedValue, label)),
      Answer(code),
    )
  }
  if (FREQUENCY_ANSWER_CODES.has(code)) {
    return Object.entries(FREQUENCY_LABELS).reduce(
      (value, [storedValue, label]) => value.pipe(Transformer.String.Replace(storedValue, label)),
      Answer(code),
    )
  }
  return Answer(code).pipe(Transformer.String.Capitalize())
}

/**
 * Formats repeating-row values with the corresponding form field formatter.
 * @param {ResolvableString} value The stored collection value
 * @param {'choice' | 'currency' | 'frequency' | 'yes-no' | undefined} format The display format
 * @param {string} code The collection field code
 * @returns {ResolvableString} The formatted collection value
 */
export function formatControlledWorkRecordValue(
  value: ResolvableString,
  format: 'choice' | 'currency' | 'frequency' | 'yes-no' | undefined,
  code: string,
): ResolvableString {
  const expression = Format('%1', value)
  if (format === 'currency') return expression.pipe(Transformers.Currency())
  if (format === 'choice') {
    const { [code]: choiceLabels } = CHOICE_LABELS
    if (choiceLabels === undefined) return expression
    return Object.entries(choiceLabels).reduce(
      (formatted, [storedValue, displayLabel]) => formatted.pipe(Transformer.String.Replace(storedValue, displayLabel)),
      expression,
    )
  }
  if (format === 'frequency') {
    return Object.entries(FREQUENCY_LABELS).reduce(
      (formatted, [storedValue, displayLabel]) => formatted.pipe(Transformer.String.Replace(storedValue, displayLabel)),
      expression,
    )
  }
  if (format === 'yes-no') {
    return expression
      .pipe(Transformer.String.Replace('true', 'Yes'))
      .pipe(Transformer.String.Replace('false', 'No'))
      .pipe(Transformer.String.Capitalize())
  }
  return expression
}
