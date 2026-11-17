import { Answer, Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock, type BlockDefinition } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKHeading, GovUKRadioInput, GovUKTextInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { moneyConditions } from '../moneyFieldHelpers.js'

const QUESTION = "Your client's other income"
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const GUIDANCE_LINK = `${GUIDANCE_URL}#page=13`
const ZERO = 0
const NUMBER_PATTERN = /^-?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/u
const OTHER_INCOME_CATEGORIES = [
  {
    code: 'friends_or_family',
    question: 'Does your client get financial help from friends or family?',
    hint: 'For example, money from a family member for rent or bills.',
    amountLabel: 'Amount',
    requiredChoiceMessage: 'Select yes if your client gets financial help from friends or family',
    requiredMessage: 'Enter amount of financial help from friends and family',
    invalidMessage: 'Amount of financial help from friends of family must be a number',
    positiveMessage: 'Amount of financial help from friends and family must be more than 0',
    frequencyMessage: 'Select frequency of financial help from friends and family',
    frequency: true,
    frequencyDescription: 'If yes, enter amount and frequency',
  },
  {
    code: 'maintenance',
    question: 'Does your client get maintenance from a former partner?',
    hint: 'This includes child maintenance.',
    amountLabel: 'Amount',
    requiredChoiceMessage: 'Select yes if your client gets maintenance from a former partner',
    requiredMessage: 'Enter amount of maintenance from a former partner',
    invalidMessage: 'Amount of maintenance from a former partner must be a number',
    positiveMessage: 'Amount of maintenance from a former partner must be more than 0',
    frequencyMessage: 'Select frequency of maintenance payments from a former partner',
    frequency: true,
    frequencyDescription: 'If yes, enter amount and frequency',
  },
  {
    code: 'property_or_lodger',
    question: 'Does your client get income from a property or lodger?',
    hint: undefined,
    amountLabel: 'Amount',
    requiredChoiceMessage: 'Select yes if your client gets income from a property or lodger',
    requiredMessage: 'Enter amount of income from a property or lodger',
    invalidMessage: 'Amount of income from a property or lodger must be a number',
    positiveMessage: 'Amount of income from a property or lodger must be more than 0',
    frequencyMessage: 'Select frequency of income from a property or lodger',
    frequency: true,
    frequencyDescription: 'If yes, enter amount and frequency',
  },
  {
    code: 'pension',
    question: 'Does your client get income from pensions?',
    hint: 'Include the total value of any pensions, including State Pension, workplace and personal pensions.',
    amountLabel: 'Amount',
    requiredChoiceMessage: 'Select yes if your client gets income from pensions',
    requiredMessage: 'Enter amount of income your client gets from pensions',
    invalidMessage: 'Amount of income your client gets from pensions must be a number',
    positiveMessage: 'Amount of income your client gets from pensions must be more than 0',
    frequencyMessage: 'Select frequency of income your client gets from pensions',
    frequency: true,
    frequencyDescription: 'If yes, enter amount and frequency',
  },
  {
    code: 'student_finance',
    question: 'Does your client get income from student finance?',
    hint: 'This includes any type of student loan, grant or bursary. Do not include any tuition fee loans.',
    amountLabel: 'Amount received this academic year',
    requiredChoiceMessage: 'Select yes if your client gets income from student finance',
    requiredMessage: 'Enter amount of student finance received this academic year',
    invalidMessage: 'Amount of student finance received this academic year must be a number',
    positiveMessage: 'Amount of student finance received this academic year must be more than 0',
    frequency: false,
    frequencyDescription: 'If yes, enter amount',
  },
  {
    code: 'other',
    question: 'Does your client get income from other sources?',
    hint: undefined,
    amountLabel: 'Amount received in the last month',
    requiredChoiceMessage: 'Select yes if your client gets income from other sources',
    requiredMessage: 'Enter amount of income from other sources received in the last month',
    invalidMessage: 'Amount of income from other sources received in the last month must be a number',
    positiveMessage: 'Amount of income from other sources received in the last month must be more than 0',
    frequency: false,
    frequencyDescription: 'If yes, enter amount',
  },
] as const
type OtherIncomeCategory = (typeof OTHER_INCOME_CATEGORIES)[number]
type FrequencyOtherIncomeCategory = Extract<OtherIncomeCategory, { frequency: true }>

const FREQUENCIES = [
  { value: 'every_week', text: 'Every week' },
  { value: 'every_two_weeks', text: 'Every 2 weeks' },
  { value: 'every_four_weeks', text: 'Every 4 weeks' },
  { value: 'monthly', text: 'Every month' },
] as const

/**
 * Normalises a submitted string or numeric amount for the page validators.
 * @param {unknown} value The submitted amount.
 * @returns {string | undefined} The trimmed amount string, if it is a supported primitive.
 */
function normaliseInputAmount(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim().replace(/^£/u, '')
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString('en-GB', { useGrouping: false })
  }
  return undefined
}

/**
 * Checks a conditional other-income amount's numeric format.
 * @param {unknown} value The submitted amount.
 * @returns {boolean} Whether the amount is empty or a valid numeric amount.
 */
export function isValidOtherIncomeAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const normalised = normaliseInputAmount(value)
  if (normalised === undefined) return false
  if (!NUMBER_PATTERN.test(normalised)) return false
  return Number.isFinite(Number(normalised.replace(/,/gu, '')))
}

/**
 * Checks that a supplied conditional amount is greater than zero.
 * @param {unknown} value The submitted amount.
 * @returns {boolean} Whether the amount is empty, invalidly formatted, or positive.
 */
export function isPositiveOtherIncomeAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const normalised = normaliseInputAmount(value)
  if (normalised === undefined || !isValidOtherIncomeAmount(normalised)) return true
  const amount = Number(normalised.replace(/,/gu, ''))
  return amount > ZERO
}

const validAmount = moneyConditions.register('IsValidControlledOtherIncomeAmount', () => isValidOtherIncomeAmount)
const positiveAmount = moneyConditions.register('IsPositiveControlledOtherIncomeAmount', () => isPositiveOtherIncomeAmount)
const otherIncomeGuidanceLinks = `
<p class="govuk-hint">For example, interest from savings or income bonds. Do not include any disregarded income or Cost of Living Payments.</p>
<p class="govuk-hint">Check the guidance for:</p>
<ul class="govuk-list govuk-list--bullet">
  <li class="govuk-body"><a class="govuk-link" href="${GUIDANCE_URL}#page=15" target="_blank" rel="noreferrer noopener">mandatory and discretionary disregarded payments (PDF, 599KB)</a></li>
  <li class="govuk-body"><a class="govuk-link" href="${GUIDANCE_URL}#page=18" target="_blank" rel="noreferrer noopener">the principles for exercising discretion (PDF, 599KB)</a></li>
</ul>`

const otherSourcesBeforeInputs = `${otherIncomeGuidanceLinks}
<details class="govuk-details" data-module="govuk-details">
  <summary class="govuk-details__summary"><span class="govuk-details__summary-text">Examples of Cost of Living Payments</span></summary>
  <div class="govuk-details__text">
    <ul class="govuk-list govuk-list--bullet">
    <li class="govuk-text">Pensioner Cost of Living Payment</li>
    <li class="govuk-text">Cost of Living Payment</li>
    <li class="govuk-text">Disability Cost of Living Payment</li>
    <li class="govuk-text">Household Support Fund</li>
    <li class="govuk-text">Council Tax rebate</li>
    <li class="govuk-text">Energy Bills Support Scheme (EBSS)</li>
    <li class="govuk-text">Alternative Fuel Payment</li>
    </ul>
  </div>
</details>`

/**
 * Creates a conditional currency input for an other-income question.
 * @param {OtherIncomeCategory} category The question and its amount validation copy.
 * @returns {ReturnType<typeof GovUKTextInput>} The conditional amount field.
 */
const amountField = (category: OtherIncomeCategory): ReturnType<typeof GovUKTextInput> => {
  const isRelevant = Answer(`${category.code}_relevant`).match(Condition.Equals('yes'))
  return GovUKTextInput({
    code: `${category.code}_conditional_value`,
    label: { text: category.amountLabel, classes: 'govuk-label--s' },
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
 * Creates a conditional frequency radio group for a regular other-income question.
 * @param {FrequencyOtherIncomeCategory} category The question and its frequency validation copy.
 * @returns {ReturnType<typeof GovUKRadioInput>} The conditional frequency field.
 */
const frequencyField = (category: FrequencyOtherIncomeCategory): ReturnType<typeof GovUKRadioInput> => {
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
 * Creates a Yes/No question with its answer-dependent inputs.
 * @param {OtherIncomeCategory} category The question copy and conditional field configuration.
 * @returns {ReturnType<typeof GovUKRadioInput>} The configured question field.
 */
const otherIncomeQuestion = (category: OtherIncomeCategory): ReturnType<typeof GovUKRadioInput> => {
  const conditionalFields: BlockDefinition[] = [amountField(category)]
  if (category.frequency) conditionalFields.push(frequencyField(category))

  return GovUKRadioInput({
    code: `${category.code}_relevant`,
    fieldset: { legend: { text: category.question } },
    ...(category.hint !== undefined ? { hint: { text: category.hint } } : {}),
    ...(category.code === 'other'
      ? { formGroup: { beforeInputs: { html: otherSourcesBeforeInputs } } }
      : {}),
    items: [
      {
        value: 'yes',
        text: 'Yes',
        hint: { text: category.frequencyDescription, classes: 'govuk-visually-hidden' },
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

export const otherIncomeQuestionFields = OTHER_INCOME_CATEGORIES.map(otherIncomeQuestion)

const otherIncomeGuidance = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [GUIDANCE_LINK], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Income (PDF, 599KB)',
})

export const otherIncomePageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    ...otherIncomeQuestionFields,
  ],
  guidanceBlocks: [otherIncomeGuidance],
})
