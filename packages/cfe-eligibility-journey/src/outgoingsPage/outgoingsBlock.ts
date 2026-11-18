import { Answer, Condition, Data, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock, type BlockDefinition } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKHeading, GovUKRadioInput, GovUKTextInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { CONTROLLED_WORK_DATA_KEYS } from '../controlledWork/controlledWorkEffects.js'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { isPositiveIncomeAmount, isValidIncomeAmount } from '../controlledWorkIncomePage/incomeBlock.js'
import { moneyConditions } from '../moneyFieldHelpers.js'

const QUESTION = "Your client's outgoings and deductions"
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const GUIDANCE_LINK = `${GUIDANCE_URL}#page=22`
const FREQUENCIES = [
  { value: 'every_week', text: 'Every week' },
  { value: 'every_two_weeks', text: 'Every 2 weeks' },
  { value: 'every_four_weeks', text: 'Every 4 weeks' },
  { value: 'monthly', text: 'Every month' },
] as const
const OUTGOINGS_CATEGORIES = [
  {
    code: 'childcare_payments',
    question: 'Does your client pay for childcare?',
    hint: 'For example, to a childminder, nanny or nursery.',
    requiredChoiceMessage: 'Select yes if your client pays for childcare',
    requiredMessage: 'Enter amount paid for childcare',
    invalidMessage: 'Amount paid for childcare must be a number',
    positiveMessage: 'Amount paid for childcare must be more than 0',
    frequencyMessage: 'Select frequency of childcare payments',
  },
  {
    code: 'maintenance_payments',
    question: 'Does your client pay maintenance to a former partner?',
    hint:
      'This includes child maintenance. If your client is paying all or part of their ex-partner’s housing costs in the former matrimonial home, include this.',
    requiredChoiceMessage: 'Select yes if your client pays maintenance to a former partner',
    requiredMessage: 'Enter amount of maintenance paid to a former partner',
    invalidMessage: 'Amount of maintenance paid to a former partner must be a number',
    positiveMessage: 'Amount of maintenance paid to a former partner must be more than 0',
    frequencyMessage: 'Select frequency of maintenance payments to a former partner',
  },
  {
    code: 'legal_aid_payments',
    question: 'Does your client make payments towards legal aid for a criminal case?',
    requiredChoiceMessage: 'Select yes if your client makes payments toward legal aid for a criminal case',
    requiredMessage: 'Enter amount paid toward legal aid in a criminal case',
    invalidMessage: 'Amount paid toward legal aid in a criminal case must be a number',
    positiveMessage: 'Amount paid toward legal aid in a criminal case must be more than 0',
    frequencyMessage: 'Select frequency of payments towards legal aid in a criminal case',
  },
] as const

type OutgoingsCategory = (typeof OUTGOINGS_CATEGORIES)[number]

const validAmount = moneyConditions.register('IsValidControlledOutgoingsAmount', () => isValidIncomeAmount)
const positiveAmount = moneyConditions.register('IsPositiveControlledOutgoingsAmount', () => isPositiveIncomeAmount)

const CHILDCARE_ELIGIBLE = Data(CONTROLLED_WORK_DATA_KEYS.childcareEligible).match(Condition.Equals(true))

/**
 * Creates a conditional currency input for an outgoings question.
 * @param {OutgoingsCategory} category The question and its amount validation copy
 * @returns {ReturnType<typeof GovUKTextInput>} The conditional amount field
 */
function amountField(category: OutgoingsCategory): ReturnType<typeof GovUKTextInput> {
  const isRelevant = Answer(`${category.code}_relevant`).match(Condition.Equals('yes'))
  return GovUKTextInput({
    code: `${category.code}_conditional_value`,
    label: { text: 'Amount', classes: 'govuk-label--s' },
    inputType: 'text',
    attributes: { inputmode: 'decimal' },
    prefix: { text: '£' },
    classes: GovUKUtilityClasses.Input.Width10,
    visibleWhen: isRelevant,
    dependentWhen: isRelevant,
    validWhen: [
      validation({
        condition: Self().match(Condition.IsRequired()),
        message: category.requiredMessage,
      }),
      validation({
        condition: Self().match(validAmount()),
        message: category.invalidMessage,
      }),
      validation({
        condition: Self().match(positiveAmount()),
        message: category.positiveMessage,
      }),
    ],
  })
}

/**
 * Creates a conditional frequency radio group for an outgoings question.
 * @param {OutgoingsCategory} category The question and its frequency validation copy
 * @returns {ReturnType<typeof GovUKRadioInput>} The conditional frequency field
 */
function frequencyField(category: OutgoingsCategory): ReturnType<typeof GovUKRadioInput> {
  const isRelevant = Answer(`${category.code}_relevant`).match(Condition.Equals('yes'))
  return GovUKRadioInput({
    code: `${category.code}_frequency`,
    fieldset: {
      legend: {
        text: 'Frequency',
        classes: 'govuk-fieldset__legend--s govuk-!-font-weight-regular',
      },
    },
    items: [...FREQUENCIES],
    visibleWhen: isRelevant,
    dependentWhen: isRelevant,
    validWhen: [
      validation({
        condition: Self().match(Condition.String.MatchesRegex('^(every_week|every_two_weeks|every_four_weeks|monthly)$')),
        message: category.frequencyMessage,
      }),
    ],
  })
}

/**
 * Creates a Yes/No question with its answer-dependent amount and frequency.
 * @param {OutgoingsCategory} category The question copy and validation configuration
 * @returns {ReturnType<typeof GovUKRadioInput>} The configured outgoings question
 */
function outgoingsQuestion(category: OutgoingsCategory): ReturnType<typeof GovUKRadioInput> {
  const isChildcare = category.code === 'childcare_payments'
  const conditionalFields: BlockDefinition[] = [amountField(category), frequencyField(category)]

  return GovUKRadioInput({
    code: `${category.code}_relevant`,
    fieldset: { legend: { text: category.question } },
    ...('hint' in category ? { hint: { text: category.hint } } : {}),
    ...(isChildcare ? { visibleWhen: CHILDCARE_ELIGIBLE, dependentWhen: CHILDCARE_ELIGIBLE } : {}),
    items: [
      {
        value: 'yes',
        text: 'Yes',
        hint: { text: 'If yes, enter amount and frequency', classes: 'govuk-visually-hidden' },
        block: conditionalFields,
      },
      { value: 'no', text: 'No' },
    ],
    validWhen: [
      validation({
        condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
        message: category.requiredChoiceMessage,
      }),
    ],
  })
}

export const outgoingsQuestionFields = OUTGOINGS_CATEGORIES.map(outgoingsQuestion)

const outgoingsGuidance = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [GUIDANCE_LINK], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Determining disposable income (PDF, 599KB)',
})

export const outgoingsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    ...outgoingsQuestionFields,
  ],
  guidanceBlocks: [outgoingsGuidance],
})
