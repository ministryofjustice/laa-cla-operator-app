import { Answer, Condition, Conditional, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock, type BlockDefinition } from '@ministryofjustice/hmpps-forge/core/components'
import {
  GovUKBody,
  GovUKDetails,
  GovUKHeading,
  GovUKRadioInput,
  GovUKTextInput,
  GovUKUtilityClasses,
} from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import {
  isHousingBenefitWithinSharedHousingCosts,
  isValidSharedHousingCostsFrequency,
  isValidSharedOwnershipHousingCost,
  parseSharedOwnershipHousingCost,
  type SharedHousingCostValues,
} from '../controlledWork/sharedOwnershipHousingCostsValidation.js'
import {
  SHARED_OWNERSHIP_HOUSING_BENEFIT_FREQUENCIES,
  SHARED_OWNERSHIP_HOUSING_COST_FREQUENCIES,
} from '../controlledWork/controlledWorkTypes.js'
import { moneyConditions } from '../moneyFieldHelpers.js'
import { SHARED_OWNERSHIP_HOUSING_FIELD_CODES } from '../controlledWork/sharedOwnershipHousingCostsAnswers.js'

const QUESTION = 'Housing costs'
const ZERO = 0
const QUESTION_HEADING_LEVEL = 2
const SECTION_HEADING_LEVEL = 3
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const PARTNER_PRESENT = Answer('partner').match(Condition.Equals('yes'))
const HAS_HOUSING_BENEFIT = Answer(SHARED_OWNERSHIP_HOUSING_FIELD_CODES.housing_benefit_relevant).match(
  Condition.Equals('yes'),
)
const FREQUENCY_LABELS = {
  every_week: 'Every week',
  every_two_weeks: 'Every 2 weeks',
  every_four_weeks: 'Every 4 weeks',
  monthly: 'Every month',
  total: 'Total in last 3 months',
} as const
const HOUSING_FREQUENCIES = SHARED_OWNERSHIP_HOUSING_COST_FREQUENCIES.map((value) => ({
  value,
  text: FREQUENCY_LABELS[value],
}))
const BENEFIT_FREQUENCIES = SHARED_OWNERSHIP_HOUSING_BENEFIT_FREQUENCIES.map((value) => ({
  value,
  text: FREQUENCY_LABELS[value],
}))
const validAmount = moneyConditions.register(
  'IsValidSharedOwnershipHousingCost',
  () => (value) => value === undefined || value === null || value === '' || isValidSharedOwnershipHousingCost(value),
)
const nonNegativeAmount = moneyConditions.register(
  'IsNonNegativeSharedOwnershipHousingCost',
  () => (value) => {
    const amount = parseSharedOwnershipHousingCost(value)
    return amount === undefined || amount >= ZERO
  },
)
const positiveBenefitAmount = moneyConditions.register(
  'IsPositiveSharedOwnershipHousingCost',
  () => (value) => {
    const amount = parseSharedOwnershipHousingCost(value)
    return amount === undefined || amount > ZERO
  },
)
const validCombinedFrequency = moneyConditions.register(
  'IsValidSharedHousingCostsFrequency',
  () => (value, rent, mortgage) => isValidSharedHousingCostsFrequency(value, rent, mortgage),
)
const benefitWithinCosts = moneyConditions.register(
  'IsHousingBenefitWithinSharedHousingCosts',
  () => (value: unknown, housingCosts: SharedHousingCostValues) =>
    isHousingBenefitWithinSharedHousingCosts(value, housingCosts),
)

const rentField = GovUKTextInput({
  code: 'rent',
  label: { text: 'Enter amount of rent payments', classes: 'govuk-visually-hidden' },
  hint: { text: 'Enter 0 if this does not apply.' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the rent amount.',
    }),
    validation({
      condition: Self().match(validAmount()),
      message: 'Rent must be a number. Enter 0 if this does not apply.',
    }),
    validation({
      condition: Self().match(nonNegativeAmount()),
      message: 'Rent must be greater than or equal to 0',
    }),
  ],
})

const mortgageField = GovUKTextInput({
  code: 'shared_ownership_mortgage',
  label: { text: 'Enter the mortgage payment', classes: 'govuk-visually-hidden' },
  hint: { text: 'Enter 0 if this does not apply.' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the mortgage payment. Enter 0 if this does not apply.',
    }),
    validation({
      condition: Self().match(validAmount()),
      message: 'Mortgage payment must be a number. Enter 0 if this does not apply.',
    }),
    validation({
      condition: Self().match(nonNegativeAmount()),
      message: 'Mortgage must be greater than or equal to 0',
    }),
  ],
})

const combinedFrequencyField = GovUKRadioInput({
  code: 'combined_frequency',
  fieldset: {
    legend: {
      text: 'Select frequency of mortgage and rent payments',
      classes: 'govuk-visually-hidden',
    },
  },
  items: [...HOUSING_FREQUENCIES],
  validWhen: [
    validation({
      condition: Self().match(validCombinedFrequency(Answer('rent'), Answer('shared_ownership_mortgage'))),
      message: 'Select frequency of rent payments.',
    }),
  ],
})

const housingBenefitAmountField = GovUKTextInput({
  code: SHARED_OWNERSHIP_HOUSING_FIELD_CODES.housing_benefit_value,
  label: { text: 'Amount' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  visibleWhen: HAS_HOUSING_BENEFIT,
  dependentWhen: HAS_HOUSING_BENEFIT,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the Housing Benefit amount.',
    }),
    validation({
      condition: Self().match(validAmount()),
      message: 'Housing Benefit must be a number.',
    }),
    validation({
      condition: Self().match(positiveBenefitAmount()),
      message: 'Housing Benefit must be more than 0.',
    }),
    validation({
      condition: Self().match(
        benefitWithinCosts({
          rent: Answer('rent'),
          mortgage: Answer('shared_ownership_mortgage'),
          combinedFrequency: Answer('combined_frequency'),
          benefitFrequency: Answer(SHARED_OWNERSHIP_HOUSING_FIELD_CODES.housing_benefit_frequency),
        }),
      ),
      message: 'Housing Benefit cannot be higher than housing costs.',
    }),
  ],
})

const housingBenefitFrequencyField = GovUKRadioInput({
  code: SHARED_OWNERSHIP_HOUSING_FIELD_CODES.housing_benefit_frequency,
  fieldset: {
    legend: {
      text: 'Frequency',
      classes: 'govuk-fieldset__legend--s govuk-!-font-weight-regular',
    },
  },
  items: [...BENEFIT_FREQUENCIES],
  visibleWhen: HAS_HOUSING_BENEFIT,
  dependentWhen: HAS_HOUSING_BENEFIT,
  validWhen: [
    validation({
      condition: Self().match(
        Condition.String.MatchesRegex('^(every_week|every_two_weeks|every_four_weeks|monthly)$'),
      ),
      message: 'Select frequency of Housing Benefit.',
    }),
  ],
})

export const housingBenefitField = GovUKRadioInput({
  code: SHARED_OWNERSHIP_HOUSING_FIELD_CODES.housing_benefit_relevant,
  fieldset: {
    legend: {
      text: Conditional({
        when: PARTNER_PRESENT,
        then: 'Does your client or their partner get Housing Benefit for this home?',
        else: 'Does your client get Housing Benefit for this home?',
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
    {
      value: 'yes',
      text: 'Yes',
      hint: { text: 'If yes, enter amount and frequency', classes: 'govuk-visually-hidden' },
      block: [housingBenefitAmountField, housingBenefitFrequencyField],
    },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if your client gets Housing Benefit for this home.',
    }),
  ],
})

const singleQuestionHeading: BlockDefinition = {
  ...GovUKHeading({ text: QUESTION, size: 'l', level: QUESTION_HEADING_LEVEL }),
  visibleWhen: Answer('partner').match(Condition.Equals('no')),
}

const partnerQuestionHeading: BlockDefinition = {
  ...GovUKHeading({ text: QUESTION, size: 'l', level: QUESTION_HEADING_LEVEL }),
  visibleWhen: PARTNER_PRESENT,
}

const clientHint: BlockDefinition = {
  ...GovUKBody({ text: 'Enter the housing costs for the shared ownership scheme home your client lives in.' }),
}

const partnerSeparateHouseholdHint: BlockDefinition = {
  ...GovUKBody({ text: 'If your client and their partner live separately, do not include the partner’s housing costs.' }),
  visibleWhen: PARTNER_PRESENT,
}

const includeHousingPaymentsDetails = GovUKDetails({
  summaryText: 'What to include with housing payments',
  html: `<p>Do not make any deductions for Housing Benefit.</p>
<p>If your client is paying board and lodgings, enter the portion of the costs that relates to lodgings or, if you are unsure, 50% of the total costs.</p>
<p>If your client is paying all or part of their ex-partner's housing costs for the former matrimonial home, do not include this here - add it as maintenance payments to a former partner instead.</p>`,
})

const livingWithSomeoneElseDetails = GovUKDetails({
  summaryText: 'Living with someone else',
  html: `<p>If your client lives with their ex-partner, or someone else whose means are not included in the assessment, enter the amount paid by your client.</p>
<p>The Legal Aid Agency will assume that your client is liable for 50% of the housing costs unless there is evidence otherwise. If your client’s share is being paid or partially paid by this person, enter the amount paid on your client’s behalf as income for your client on the ‘Your client's other income’ page.</p>
<p>You may need to provide evidence for this if you make a full application or open a controlled work file for your client.</p>`,
})

const paymentFrequencyDetails = GovUKDetails({
  summaryText: 'Help with different payment frequencies',
  html: `<p>If the payment frequencies for mortgage and rent are different, choose one and calculate the other to match. For example, to use monthly payments:</p>
<ul class="govuk-list govuk-list--bullet">
  <li>if paid weekly, multiply the payment by 52 and divide by 12</li>
  <li>if paid every 2 weeks, multiply the payment by 26 and divide by 12</li>
  <li>if paid every 4 weeks, multiply the payment by 13 and divide by 12</li>
</ul>`,
})

const guidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Housing costs (PDF, 599KB)',
})

export const sharedOwnershipHousingCostFields = {
  rent: rentField,
  mortgage: mortgageField,
  combinedFrequency: combinedFrequencyField,
  housingBenefit: housingBenefitField,
  housingBenefitAmount: housingBenefitAmountField,
  housingBenefitFrequency: housingBenefitFrequencyField,
}

export const sharedOwnershipHousingCostsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    singleQuestionHeading,
    partnerQuestionHeading,
    clientHint,
    partnerSeparateHouseholdHint,
    includeHousingPaymentsDetails,
    livingWithSomeoneElseDetails,
    paymentFrequencyDetails,
    GovUKHeading({
      text: 'Select frequency of mortgage and rent payments',
      size: 'm',
      level: SECTION_HEADING_LEVEL,
    }),
    combinedFrequencyField,
    GovUKHeading({ text: 'What is the rent?', size: 'm', level: SECTION_HEADING_LEVEL }),
    rentField,
    GovUKHeading({ text: 'What is the mortgage payment?', size: 'm', level: SECTION_HEADING_LEVEL }),
    mortgageField,
    housingBenefitField,
  ],
  guidanceBlocks: [guidanceLink],
})
