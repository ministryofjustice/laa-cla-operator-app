import {
  Answer,
  Condition,
  Conditional,
  Data,
  Format,
  Item,
  Iterator,
  Loop,
  Self,
  Transformer,
  and,
  or,
  validation,
} from '@ministryofjustice/hmpps-forge/core/authoring'
import { CollectionBlock, HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import {
  GovUKBody,
  GovUKButton,
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

const QUESTION = 'Add income for dependants aged 16 or over'
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const INCOME_COLLECTION = CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection
const FREQUENCY_CODE = Format('frequency_%1', Loop.Index0())
const FREQUENCIES = [
  { value: 'every_week', text: 'Every week' },
  { value: 'every_two_weeks', text: 'Every 2 weeks' },
  { value: 'every_four_weeks', text: 'Every 4 weeks' },
  { value: 'monthly', text: 'Every month' },
  { value: 'three_months', text: 'Total in last 3 months' },
] as const
const DEPENDANT_INCOME_LIMITS: Readonly<Record<(typeof FREQUENCIES)[number]['value'], number>> = {
  every_week: 88.12,
  every_two_weeks: 176.24,
  every_four_weeks: 352.49,
  monthly: 381.86,
  three_months: 1145.58,
}
const NUMBER_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/u

function parseDependantIncomeAmount(value: unknown): number | undefined {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim().replace(/[£,]/gu, ''))
        : Number.NaN
  const normalisedValue =
    typeof value === 'string' ? value.trim().replace(/[£,]/gu, '') : String(value)

  if (!Number.isFinite(numericValue) || !NUMBER_PATTERN.test(normalisedValue)) return undefined
  return Math.round((numericValue + Number.EPSILON) * 100) / 100
}

export function isValidDependantIncomeAmount(value: unknown): boolean {
  return value === undefined || value === null || value === '' || parseDependantIncomeAmount(value) !== undefined
}

export function isPositiveDependantIncomeAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const amount = parseDependantIncomeAmount(value)
  return amount === undefined || amount > 0
}

export function isBelowDependantIncomeLimit(value: unknown, frequency: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const amount = parseDependantIncomeAmount(value)
  if (amount === undefined || amount <= 0 || typeof frequency !== 'string') return true
  const limit = Object.entries(DEPENDANT_INCOME_LIMITS).find(([option]) => option === frequency)?.[1]
  return limit === undefined || amount < limit
}

const isValidIncomeAmount = moneyConditions.register(
  'IsValidDependantIncomeAmount',
  () => isValidDependantIncomeAmount,
)
const isPositiveIncomeAmount = moneyConditions.register(
  'IsPositiveDependantIncomeAmount',
  () => isPositiveDependantIncomeAmount,
)
const isBelowDependantIncomeLimitCondition = moneyConditions.register(
  'IsBelowDependantIncomeLimit',
  () => isBelowDependantIncomeLimit,
)

const hasMultipleIncomeRows = Data(INCOME_COLLECTION)
  .pipe(Transformer.Array.Length())
  .match(Condition.Number.GreaterThan(1))

export const dependantIncomeAmountField = GovUKTextInput({
  code: Format('amount_%1', Loop.Index0()),
  defaultValue: Item().path('amount'),
  label: { text: 'Income', classes: 'govuk-label--s' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width5,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: Conditional({
        when: hasMultipleIncomeRows,
        then: Format('Enter income dependant %1 gets', Loop.Index()),
        else: 'Enter income the dependant gets',
      }),
    }),
    validation({
      condition: Self().match(isValidIncomeAmount()),
      message: Conditional({
        when: hasMultipleIncomeRows,
        then: Format('Income for dependant %1 must be a number', Loop.Index()),
        else: 'Income for the dependant must be a number',
      }),
    }),
    validation({
      condition: Self().match(isPositiveIncomeAmount()),
      message: Conditional({
        when: hasMultipleIncomeRows,
        then: Format('Income for dependant %1 must be more than 0', Loop.Index()),
        else: 'Income for the dependant must be more than 0',
      }),
    }),
    validation({
      condition: Self().match(isBelowDependantIncomeLimitCondition(Answer(FREQUENCY_CODE))),
      message:
        'If this dependant gets income equivalent to £381.86 or more per month, go back and remove them as a dependant to continue with this check.',
    }),
  ],
})

export const dependantIncomeFrequencyField = GovUKRadioInput({
  code: FREQUENCY_CODE,
  defaultValue: Item().path('frequency'),
  fieldset: {
    legend: {
      text: 'When does the dependant normally get this income?',
      classes: 'govuk-fieldset__legend--s',
      isPageHeading: false,
    },
  },
  items: [...FREQUENCIES],
  validWhen: [
    validation({
      condition: or(
        Self().not.match(Condition.IsRequired()),
        Self().match(Condition.String.MatchesRegex('^(every_week|every_two_weeks|every_four_weeks|monthly|three_months)$')),
      ),
      message: Conditional({
        when: hasMultipleIncomeRows,
        then: Format('Select when dependant %1 normally gets this income', Loop.Index()),
        else: 'Select when the dependant normally gets this income',
      }),
    }),
  ],
})

export const dependantIncomeRows = CollectionBlock({
  visibleWhen: Answer('dependants-get-income').match(Condition.Equals('yes')),
  collection: Data(INCOME_COLLECTION).each(
    Iterator.Map([
      GovUKGridRow({
        columns: [
          {
            width: 'one-half',
            blocks: [GovUKHeading({ text: Format('Dependant %1', Loop.Index()), size: 'm' })],
          },
          {
            width: 'one-half',
            blocks: [
              GovUKButton({
                text: 'Remove',
                name: 'action',
                value: Format('remove_%1', Loop.Index0()),
                classes: 'govuk-button--secondary',
                visibleWhen: Loop.Index0().match(Condition.Number.GreaterThan(0)),
              }),
            ],
          },
        ],
      }),
      dependantIncomeFrequencyField,
      dependantIncomeAmountField,
      GovUKSectionBreak({ size: 'l', visible: true }),
    ]),
  ),
})

const addAnotherButton = GovUKButton({
  text: "Add another dependant's income",
  name: 'action',
  value: 'add-another-dependant-income',
  classes: 'govuk-button--secondary',
  visibleWhen: and(
    Answer('dependants-get-income').match(Condition.Equals('yes')),
    Data(INCOME_COLLECTION)
      .pipe(Transformer.Array.Length())
      .match(Condition.Number.LessThan(Data(CONTROLLED_WORK_DATA_KEYS.dependantIncomeMaxRows))),
  ),
})

const pageHint = GovUKBody({
  text: 'Income they receive will be deducted from your client’s dependant allowance.',
  classes: 'govuk-hint',
})

const dependantIncomeGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${GUIDANCE_URL}#page=22`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: "Dependants' income (PDF, 599KB)",
})

export const dependantIncomeDetailsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), pageHint, dependantIncomeRows, addAnotherButton],
  guidanceBlocks: [dependantIncomeGuidanceLink],
})
