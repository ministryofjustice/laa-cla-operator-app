import { Answer, Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock, type BlockDefinition } from '@ministryofjustice/hmpps-forge/core/components'
import {
  GovUKDetails,
  GovUKHeading,
  GovUKRadioInput,
  GovUKTextInput,
  GovUKUtilityClasses,
} from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import {
  isValidMortgageOrLoanPayment,
  isValidMortgageOrLoanPaymentFrequency,
} from '../controlledWork/mortgageOrLoanPaymentAnswers.js'
import { parseSharedOwnershipHousingCost } from '../controlledWork/sharedOwnershipHousingCostsValidation.js'
import { HOUSING_LOAN_PAYMENT_FREQUENCIES } from '../controlledWork/controlledWorkTypes.js'
import { moneyConditions } from '../moneyFieldHelpers.js'

const QUESTION = 'What are the mortgage or loan payments for the home your client usually lives in?'
const QUESTION_HEADING_LEVEL = 2
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const FREQUENCY_LABELS = {
  every_week: 'Every week',
  every_two_weeks: 'Every 2 weeks',
  every_four_weeks: 'Every 4 weeks',
  monthly: 'Every month',
} as const
const isCurrencyAmountOrEmpty = moneyConditions.register(
  'IsMortgageOrLoanPaymentNumber',
  () => (value) =>
    value === undefined || value === null || value === '' || parseSharedOwnershipHousingCost(value) !== undefined,
)
const isZeroOrMore = moneyConditions.register(
  'IsMortgageOrLoanPaymentZeroOrMore',
  () => (value) => parseSharedOwnershipHousingCost(value) === undefined || isValidMortgageOrLoanPayment(value),
)
const hasRequiredFrequency = moneyConditions.register(
  'IsValidMortgageOrLoanPaymentFrequency',
  () => (value, payment) => isValidMortgageOrLoanPaymentFrequency(value, payment),
)

const householdTag: BlockDefinition = {
  ...HtmlBlock({
    tag: 'div',
    classes: 'govuk-tag govuk-tag--orange govuk-!-margin-bottom-2',
    content: 'Household',
  }),
  visibleWhen: Answer('partner').match(Condition.Equals('yes')),
}

const livingWithSomeoneElseDetails = GovUKDetails({
  summaryText: 'Living with someone else',
  html: `<p>If your client lives with their ex-partner, or someone else whose means are not included in the assessment, enter the amount paid by your client. The Legal Aid Agency will assume that your client is liable for 50% of the housing costs unless there is evidence otherwise. If your client’s share is being paid or partially paid by this person, enter the amount paid on your client’s behalf as income for your client on the ‘Your client's other income’ page.</p>
<p>You may need to provide evidence for this if you make a full application or open a controlled work file for your client.</p>`,
})

const paymentField = GovUKTextInput({
  code: 'housing_loan_payments',
  label: { text: 'Enter full amount due' },
  hint: { text: 'Enter 0 if this does not apply' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the mortgage or loan payments amount.',
    }),
    validation({
      condition: Self().match(isCurrencyAmountOrEmpty()),
      message: 'Mortgage or loan payments must be a number.',
    }),
    validation({
      condition: Self().match(isZeroOrMore()),
      message: 'Mortgage or loan payments must be 0 or more.',
    }),
  ],
})

const frequencyField = GovUKRadioInput({
  code: 'housing_payments_loan_frequency',
  fieldset: { legend: { text: 'Select frequency', classes: 'govuk-fieldset__legend--s govuk-!-font-weight-regular' } },
  items: HOUSING_LOAN_PAYMENT_FREQUENCIES.map((value) => ({ value, text: FREQUENCY_LABELS[value] })),
  validWhen: [
    validation({
      condition: Self().match(hasRequiredFrequency(Answer('housing_loan_payments'))),
      message: 'Select frequency of mortgage payments.',
    }),
  ],
})

const guidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Housing costs (PDF, 599KB)',
})

export const mortgageOrLoanPaymentFields = {
  payment: paymentField,
  frequency: frequencyField,
}

export const mortgageOrLoanPaymentPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    householdTag,
    GovUKHeading({ text: QUESTION, size: 'l', level: QUESTION_HEADING_LEVEL }),
    livingWithSomeoneElseDetails,
    paymentField,
    frequencyField,
  ],
  guidanceBlocks: [guidanceLink],
})
