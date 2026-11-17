import {
  Condition,
  Conditional,
  Data,
  Format,
  Item,
  Iterator,
  Loop,
  Self,
  Transformer,
  validation,
} from '@ministryofjustice/hmpps-forge/core/authoring'
import { CollectionBlock, HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import {
  GovUKBody,
  GovUKButton,
  GovUKDetails,
  GovUKGridRow,
  GovUKHeading,
  GovUKRadioInput,
  GovUKSectionBreak,
  GovUKTextInput,
  GovUKUtilityClasses,
} from '@ministryofjustice/hmpps-forge/govuk-components'
import { CONTROLLED_WORK_DATA_KEYS } from '../controlledWork/controlledWorkEffects.js'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { moneyConditions } from '../moneyFieldHelpers.js'

const QUESTION = 'Add benefit details'
const ZERO = 0
const ONE = 1
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const FREQUENCY_CODE = Format('benefit_frequency_%1', Loop.Index0())
const FREQUENCIES = [
  { value: 'every_week', text: 'Every week' },
  { value: 'every_two_weeks', text: 'Every 2 weeks' },
  { value: 'every_four_weeks', text: 'Every 4 weeks' },
  { value: 'monthly', text: 'Every month' },
] as const
const BENEFIT_TYPE_HINT = 'Enter the name of a benefit, or select one from the suggestions that appear when you start to enter the name.'
const BENEFIT_TYPE_ARIA_DESCRIPTION =
  'When autocomplete results are available use up and down arrows to review and enter to select. Touch device users, explore by touch or with swipe gestures.'
const COST_OF_LIVING_PAYMENT_EXAMPLES = [
  'Pensioner Cost of Living Payment',
  'Cost of Living Payment',
  'Disability Cost of Living Payment',
  'Household Support Fund',
  'Council Tax rebate',
  'Energy Bills Support Scheme (EBSS)',
  'Alternative Fuel Payment',
]
const DISREGARDED_BENEFITS = [
  'Housing Benefit',
  'State Pension',
  'Personal Independence Payment (PIP)',
  'Carer’s Allowance',
  'Community Care direct payments',
  'Fostering allowance',
  'Cost of Living Payments',
]

const BENEFIT_AMOUNT_PATTERN = /^-?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/u

interface BenefitDetailsPageOptions {
  collectionCode: string
  includeCostOfLivingExamples?: boolean
  recipient: 'client' | 'partner'
  suggestionListId: string
}

/**
 * Parses a benefit amount while allowing formatted pound values.
 * @param {unknown} value The submitted amount
 * @returns {number | undefined} The numeric amount, or undefined for invalid input
 */
function parseBenefitAmount(value: unknown): number | undefined {
  const normalisedValue = typeof value === 'string' ? value.trim().replace(/£/gu, '') : String(value)
  if (!BENEFIT_AMOUNT_PATTERN.test(normalisedValue)) return undefined

  const amount = Number(normalisedValue.replace(/,/gu, ''))
  return Number.isFinite(amount) ? amount : undefined
}

/**
 * Checks whether a benefit amount is numeric, allowing empty values for the required validator.
 * @param {unknown} value The submitted amount
 * @returns {boolean} True when the value is empty or numeric
 */
export function isValidBenefitAmount(value: unknown): boolean {
  return value === undefined || value === null || value === '' || parseBenefitAmount(value) !== undefined
}

/**
 * Checks that a supplied numeric benefit amount is positive.
 * @param {unknown} value The submitted amount
 * @returns {boolean} True when the value is empty, invalid, or positive
 */
export function isPositiveBenefitAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const amount = parseBenefitAmount(value)
  return amount === undefined || amount > ZERO
}

const validBenefitAmount = moneyConditions.register('IsValidBenefitDetailsAmount', () => isValidBenefitAmount)
const positiveBenefitAmount = moneyConditions.register('IsPositiveBenefitDetailsAmount', () => isPositiveBenefitAmount)

/**
 * Chooses the CCQ validation copy for a single row or a repeated benefit row.
 * @param {string} single The message for one benefit
 * @param {string} multiple The indexed message for multiple benefits
 * @param {string} collectionCode The Forge data key for the repeating rows
 * @returns {ReturnType<typeof Conditional>} The conditional validation message
 */
function benefitError(single: string, multiple: string, collectionCode: string): ReturnType<typeof Conditional> {
  const hasMultipleBenefits = Data(collectionCode)
    .pipe(Transformer.Array.Length())
    .match(Condition.Number.GreaterThan(ONE))

  return Conditional({
    when: hasMultipleBenefits,
    then: Format(multiple, Loop.Index()),
    else: single,
  })
}

/**
 * Builds the shared CCQ benefit-details form for the client or partner.
 * @param {BenefitDetailsPageOptions} options The recipient and case-scoped repeat collection
 * @returns {ReturnType<typeof eligibilityQuestionPageLayout>} The shared eligibility question layout
 */
export function createBenefitDetailsPageContent({
  collectionCode,
  includeCostOfLivingExamples = false,
  recipient,
  suggestionListId,
}: BenefitDetailsPageOptions): ReturnType<typeof eligibilityQuestionPageLayout> {
  const recipientLabel = recipient === 'client' ? 'your client' : 'the partner'
  const guidanceIntroduction =
    recipient === 'client'
      ? 'Add details of any non-passporting benefits your client gets.'
      : 'Add details of any benefits the partner gets.'

  const benefitTypeField = GovUKTextInput({
    code: Format('benefit_type_%1', Loop.Index0()),
    defaultValue: Item().path('benefit_type'),
    label: { text: 'Benefit name', classes: 'govuk-label--s' },
    inputType: 'text',
    attributes: {
      list: suggestionListId,
      autocomplete: 'off',
      'aria-description': BENEFIT_TYPE_ARIA_DESCRIPTION,
    },
    classes: GovUKUtilityClasses.Input.Width20,
    validWhen: [
      validation({
        condition: Self().match(Condition.IsRequired()),
        message: benefitError('Enter the benefit name', 'Enter benefit %1 name', collectionCode),
      }),
    ],
  })

  const benefitAmountField = GovUKTextInput({
    code: Format('benefit_amount_%1', Loop.Index0()),
    defaultValue: Item().path('benefit_amount'),
    label: { text: 'Benefit amount', classes: 'govuk-label--s' },
    inputType: 'text',
    attributes: { inputmode: 'decimal' },
    prefix: { text: '£' },
    classes: GovUKUtilityClasses.Input.Width5,
    validWhen: [
      validation({
        condition: Self().match(Condition.IsRequired()),
        message: benefitError('Enter benefit amount', 'Enter benefit amount for benefit %1', collectionCode),
      }),
      validation({
        condition: Self().match(validBenefitAmount()),
        message: benefitError(
          'Benefit amount must be a number',
          'Benefit amount for benefit %1 must be a number',
          collectionCode,
        ),
      }),
      validation({
        condition: Self().match(positiveBenefitAmount()),
        message: benefitError(
          'Benefit amount must be more than 0',
          'Benefit amount for benefit %1 must be more than 0',
          collectionCode,
        ),
      }),
    ],
  })

  const benefitFrequencyField = GovUKRadioInput({
    code: FREQUENCY_CODE,
    defaultValue: Item().path('benefit_frequency'),
    fieldset: {
      legend: {
        text: `When does ${recipientLabel} normally get this benefit?`,
        classes: 'govuk-fieldset__legend--s',
        isPageHeading: false,
      },
    },
    items: [...FREQUENCIES],
    validWhen: [
      validation({
        condition: Self().match(Condition.String.MatchesRegex('^(every_week|every_two_weeks|every_four_weeks|monthly)$')),
        message: benefitError(
          `Select when ${recipientLabel} normally gets this benefit`,
          `Select when ${recipientLabel} normally gets benefit %1`,
          collectionCode,
        ),
      }),
    ],
  })

  const benefitRows = CollectionBlock({
    collection: Data(collectionCode).each(
      Iterator.Map([
        GovUKGridRow({
          columns: [
            { width: 'one-half', blocks: [GovUKHeading({ text: Format('Benefit %1', Loop.Index()), size: 'm' })] },
            {
              width: 'one-half',
              blocks: [
                GovUKButton({
                  text: 'Remove',
                  name: 'action',
                  value: Format('remove_%1', Loop.Index0()),
                  classes: 'govuk-button--secondary',
                  visibleWhen: Loop.Index0().match(Condition.Number.GreaterThan(ZERO)),
                }),
              ],
            },
          ],
        }),
        GovUKBody({ text: BENEFIT_TYPE_HINT, classes: 'govuk-hint' }),
        benefitTypeField,
        benefitAmountField,
        benefitFrequencyField,
        GovUKSectionBreak({ size: 'l', visible: true }),
      ]),
    ),
  })

  const guidanceUrl = `${GUIDANCE_URL}#page=15`
  const disregardedBenefitsGuidance = HtmlBlock({
    tag: 'a',
    classes: 'govuk-link',
    attributes: { href: [guidanceUrl], target: ['_blank'], rel: ['noreferrer noopener'] },
    content: 'Disregarded benefits (PDF, 599KB)',
  })

  const guidanceParagraph = HtmlBlock({
    tag: 'p',
    classes: 'govuk-body',
    content: `${guidanceIntroduction} <a class="govuk-link" href="${guidanceUrl}" target="_blank" rel="noreferrer noopener">Check the guidance (PDF, 599KB)</a> to find out which benefits you do not need to tell us about for this question, for example:`,
  })

  const disregardedBenefitsList = HtmlBlock({
    tag: 'ul',
    classes: 'govuk-list govuk-list--bullet',
    content: DISREGARDED_BENEFITS.map((benefit) => `<li>${benefit}</li>`).join('\n'),
  })

  const costOfLivingPayments = GovUKDetails({
    summaryText: 'Examples of Cost of Living Payments',
    html: `<ul class="govuk-list govuk-list--bullet">
${COST_OF_LIVING_PAYMENT_EXAMPLES.map((example) => `<li class="govuk-text">${example}</li>`).join('\n')}
</ul>`,
  })

  const benefitSuggestions = HtmlBlock({
    tag: 'datalist',
    attributes: { id: [suggestionListId] },
  })

  const benefitSuggestionOptions = CollectionBlock({
    collection: Data(CONTROLLED_WORK_DATA_KEYS.benefitSuggestions).each(
      Iterator.Map([
        HtmlBlock({
          tag: 'option',
          attributes: { value: [Item().value()] },
        }),
      ]),
    ),
  })

  const partnerTag =
    recipient === 'partner'
      ? [
          HtmlBlock({
            tag: 'div',
            classes: 'govuk-tag govuk-tag--purple govuk-!-margin-bottom-2',
            content: 'Partner',
          }),
        ]
      : []

  return eligibilityQuestionPageLayout({
    questionBlocks: [
      ...partnerTag,
      GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
      guidanceParagraph,
      disregardedBenefitsList,
      ...(includeCostOfLivingExamples ? [costOfLivingPayments] : []),
      benefitRows,
      GovUKButton({
        text: 'Add another benefit',
        name: 'action',
        value: 'add-another-benefit',
        classes: 'govuk-button--secondary',
      }),
      benefitSuggestions,
      benefitSuggestionOptions,
    ],
    guidanceBlocks: [disregardedBenefitsGuidance],
  })
}

export const benefitDetailsPageContent = createBenefitDetailsPageContent({
  collectionCode: CONTROLLED_WORK_DATA_KEYS.benefitCollection,
  recipient: 'client',
  suggestionListId: 'benefit-suggestions',
})
