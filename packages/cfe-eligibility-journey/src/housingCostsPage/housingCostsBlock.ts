import { Answer, Condition, Conditional, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
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
  isValidHousingPayment,
  isValidHousingPaymentFrequency,
} from '../controlledWork/housingCostsAnswers.js'
import {
  isHousingBenefitWithinSharedHousingCosts,
  parseSharedOwnershipHousingCost,
  type SharedHousingCostValues,
} from '../controlledWork/sharedOwnershipHousingCostsValidation.js'
import { HOUSING_COST_PAYMENT_FREQUENCIES, SHARED_OWNERSHIP_HOUSING_BENEFIT_FREQUENCIES } from '../controlledWork/controlledWorkTypes.js'
import { moneyConditions } from '../moneyFieldHelpers.js'

const QUESTION = 'Housing costs'
const QUESTION_HEADING_LEVEL = 2
const SECTION_HEADING_LEVEL = 3
const ZERO = 0
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const PARTNER_PRESENT = Answer('partner').match(Condition.Equals('yes'))
const HAS_HOUSING_BENEFIT = Answer('housing_benefit_relevant').match(Condition.Equals('yes'))
const FREQUENCY_LABELS = {
  every_week: 'Every week',
  every_two_weeks: 'Every 2 weeks',
  every_four_weeks: 'Every 4 weeks',
  monthly: 'Every month',
} as const
const HOUSING_FREQUENCIES = HOUSING_COST_PAYMENT_FREQUENCIES.map((value) => ({
  value,
  text: FREQUENCY_LABELS[value],
}))
const BENEFIT_FREQUENCIES = SHARED_OWNERSHIP_HOUSING_BENEFIT_FREQUENCIES.map((value) => ({
  value,
  text: FREQUENCY_LABELS[value],
}))

const validAmount = moneyConditions.register(
  'IsValidHousingPayment',
  () => (value) => value === undefined || value === null || value === '' || parseSharedOwnershipHousingCost(value) !== undefined,
)
const nonNegativeAmount = moneyConditions.register(
  'IsNonNegativeHousingPayment',
  () => (value) => {
    const amount = parseSharedOwnershipHousingCost(value)
    return amount === undefined || isValidHousingPayment(amount)
  },
)
const validHousingFrequency = moneyConditions.register(
  'IsValidHousingPaymentFrequency',
  () => (value, housingPayments) =>
    isValidHousingPaymentFrequency(value, { housing_payments: housingPayments }),
)
const positiveBenefitAmount = moneyConditions.register(
  'IsPositiveHousingBenefit',
  () => (value) => {
    const amount = parseSharedOwnershipHousingCost(value)
    return amount === undefined || amount > ZERO
  },
)
const benefitWithinCosts = moneyConditions.register(
  'IsHousingBenefitWithinHousingCosts',
  () => (value: unknown, housingCosts: SharedHousingCostValues) =>
    isHousingBenefitWithinSharedHousingCosts(value, {
      ...housingCosts,
      rent: housingCosts.rent,
      mortgage: '0',
      combinedFrequency: housingCosts.combinedFrequency,
    }),
)

const householdTag: BlockDefinition = {
  ...HtmlBlock({
    tag: 'div',
    classes: 'govuk-tag govuk-tag--orange govuk-!-margin-bottom-2',
    content: 'Household',
  }),
  visibleWhen: PARTNER_PRESENT,
}

const headingHints = [
  GovUKHeading({ text: QUESTION, size: 'l', level: QUESTION_HEADING_LEVEL }),
  HtmlBlock({
    tag: 'p',
    classes: 'govuk-body',
    content: 'Enter the housing costs for the home your client lives in.',
  }),
  {
    ...HtmlBlock({
      tag: 'p',
      classes: 'govuk-body',
      content: 'If your client and their partner live separately, do not include the partner’s housing costs.',
    }),
    visibleWhen: PARTNER_PRESENT,
  },
]

const housingPaymentField = GovUKTextInput({
  code: 'housing_payments',
  label: { text: 'Enter amount' },
  hint: { text: 'Enter 0 if this does not apply.' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({ condition: Self().match(Condition.IsRequired()), message: 'Enter the housing payments amount. Enter 0 if this does not apply.' }),
    validation({ condition: Self().match(validAmount()), message: 'Housing payments must be a number. Enter 0 if this does not apply.' }),
    validation({ condition: Self().match(nonNegativeAmount()), message: 'Housing payments must be 0 or more.' }),
  ],
})

const housingPaymentFrequencyField = GovUKRadioInput({
  code: 'housing_payments_frequency',
  fieldset: { legend: { text: 'Select frequency', classes: 'govuk-fieldset__legend--s govuk-!-font-weight-regular' } },
  items: HOUSING_FREQUENCIES,
  validWhen: [
    validation({
      condition: Self().match(validHousingFrequency(Answer('housing_payments'))),
      message: 'Select frequency of housing payments.',
    }),
  ],
})

const housingBenefitAmountField = GovUKTextInput({
  code: 'housing_benefit_value',
  label: { text: 'Enter amount' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  visibleWhen: HAS_HOUSING_BENEFIT,
  dependentWhen: HAS_HOUSING_BENEFIT,
  validWhen: [
    validation({ condition: Self().match(Condition.IsRequired()), message: 'Enter the Housing Benefit amount.' }),
    validation({ condition: Self().match(validAmount()), message: 'Housing Benefit must be a number.' }),
    validation({ condition: Self().match(positiveBenefitAmount()), message: 'Housing Benefit must be more than 0' }),
    validation({
      condition: Self().match(benefitWithinCosts({
        rent: Answer('housing_payments'),
        mortgage: '0',
        combinedFrequency: Answer('housing_payments_frequency'),
        benefitFrequency: Answer('housing_benefit_frequency'),
      })),
      message: 'Housing Benefit cannot be higher than housing costs',
    }),
  ],
})

const housingBenefitFrequencyField = GovUKRadioInput({
  code: 'housing_benefit_frequency',
  fieldset: { legend: { text: 'Frequency', classes: 'govuk-fieldset__legend--s govuk-!-font-weight-regular' } },
  items: BENEFIT_FREQUENCIES,
  visibleWhen: HAS_HOUSING_BENEFIT,
  dependentWhen: HAS_HOUSING_BENEFIT,
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(every_week|every_two_weeks|every_four_weeks|monthly)$')),
      message: 'Select frequency of Housing Benefit.',
    }),
  ],
})

export const housingBenefitField = GovUKRadioInput({
  code: 'housing_benefit_relevant',
  fieldset: {
    legend: {
      text: Conditional({
        when: PARTNER_PRESENT,
        then: 'Does your client or their partner get Housing Benefit for this home?',
        else: 'Is Housing Benefit claimed at the home the client lives in?',
      }),
    },
  },
  hint: {
    text: Conditional({
      when: PARTNER_PRESENT,
      then: 'Include any Housing Benefit paid to the client, partner or landlord.',
      else: 'Include any Housing Benefit paid to the client or landlord.',
    }),
  },
  items: [
    { value: 'yes', text: 'Yes', hint: { text: 'If yes, enter amount and frequency', classes: 'govuk-visually-hidden' }, block: [housingBenefitAmountField, housingBenefitFrequencyField] },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if housing benefit is claimed at the home your client lives in',
    }),
  ],
})

const whatToInclude = GovUKDetails({
  summaryText: 'What to include with housing payments',
  html: `<p>Do not make any deductions for Housing Benefit.</p>
<p>If your client is paying board and lodgings, enter the portion of the costs that relates to lodgings or, if you are unsure, 50% of the total costs.</p>
<p>If your client is paying all or part of their ex-partner's housing costs for the former matrimonial home, do not include this here - add it as maintenance payments to a former partner instead.</p>`,
})

const livingWithSomeoneElse = GovUKDetails({
  summaryText: 'Living with someone else',
  html: `<p>If your client lives with their ex-partner, or someone else whose means are not included in the assessment, enter the amount paid by your client.</p>
<p>The Legal Aid Agency will assume that your client is liable for 50% of the housing costs unless there is evidence otherwise. If your client’s share is being paid or partially paid by this person, enter the amount paid on your client’s behalf as income for your client on the ‘Your client's other income’ page.</p>
<p>You may need to provide evidence for this if you make a full application or open a controlled work file for your client.</p>`,
})

const guidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Housing costs (PDF, 599KB)',
})

export const housingCostsFields = {
  payment: housingPaymentField,
  frequency: housingPaymentFrequencyField,
  housingBenefit: housingBenefitField,
  housingBenefitAmount: housingBenefitAmountField,
  housingBenefitFrequency: housingBenefitFrequencyField,
}

export const housingCostsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    householdTag,
    ...headingHints,
    GovUKHeading({ text: 'Housing payments', size: 'm', level: SECTION_HEADING_LEVEL }),
    HtmlBlock({ tag: 'p', classes: 'govuk-hint', content: 'For example, rent, mortgage or board and lodgings.' }),
    whatToInclude,
    livingWithSomeoneElse,
    housingPaymentField,
    housingPaymentFrequencyField,
    housingBenefitField,
  ],
  guidanceBlocks: [guidanceLink],
})
