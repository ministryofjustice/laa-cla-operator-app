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

const QUESTION = "Your client's employment income"
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const { incomeCollection: INCOME_COLLECTION } = CONTROLLED_WORK_DATA_KEYS
const FIELD_CODES = ['income_type', 'income_frequency', 'gross_income', 'income_tax', 'national_insurance']
const INCOME_TYPE_CODE = Format('income_type_%1', Loop.Index0())
const FREQUENCY_CODE = Format('income_frequency_%1', Loop.Index0())
const INCOME_TAX_CODE = Format('income_tax_%1', Loop.Index0())
const NATIONAL_INSURANCE_CODE = Format('national_insurance_%1', Loop.Index0())
const FREQUENCIES = [
  { value: 'every_week', text: 'Every week' },
  { value: 'every_two_weeks', text: 'Every 2 weeks' },
  { value: 'every_four_weeks', text: 'Every 4 weeks' },
  { value: 'monthly', text: 'Every month' },
  { value: 'three_months', text: 'Total in last 3 months' },
] as const
const NUMBER_PATTERN = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/u
const ZERO = 0
const ONE = 1
const QUESTION_HEADING_LEVEL = 2

/**
 * Parses a submitted income amount into a number when its format is valid.
 * @param {unknown} value The submitted amount.
 * @returns {number | undefined} The numeric amount, or undefined when the format is invalid.
 */
function parseIncomeAmount(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const normalised = String(value).trim().replace(/^£/u, '')
  if (!NUMBER_PATTERN.test(normalised)) return undefined
  const amount = Number(normalised.replace(/,/gu, ''))
  return Number.isFinite(amount) ? amount : undefined
}

/**
 * Checks whether an optional income amount has a supported numeric format.
 * @param {unknown} value The submitted amount.
 * @returns {boolean} Whether the amount is empty or has a supported format.
 */
export function isValidIncomeAmount(value: unknown): boolean {
  return value === undefined || value === null || value === '' || parseIncomeAmount(value) !== undefined
}

/**
 * Checks that a supplied income amount is positive.
 * @param {unknown} value The submitted amount.
 * @returns {boolean} Whether the amount is empty, invalidly formatted, or positive.
 */
export function isPositiveIncomeAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const amount = parseIncomeAmount(value)
  return amount === undefined || amount > ZERO
}

/**
 * Checks that a supplied deduction is zero or greater.
 * @param {unknown} value The submitted deduction.
 * @returns {boolean} Whether the deduction is empty, invalidly formatted, or non-negative.
 */
export function isNonNegativeIncomeAmount(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const amount = parseIncomeAmount(value)
  return amount === undefined || amount >= ZERO
}

/**
 * Checks that gross income exceeds tax and National Insurance deductions.
 * @param {unknown} grossIncome The gross income amount.
 * @param {unknown} incomeTax The income-tax deduction.
 * @param {unknown} nationalInsurance The National Insurance deduction.
 * @returns {boolean} Whether the values are incomplete/invalid or net income is positive.
 */
export function isNetIncomePositive(grossIncome: unknown, incomeTax: unknown, nationalInsurance: unknown): boolean {
  const gross = parseIncomeAmount(grossIncome)
  const tax = parseIncomeAmount(incomeTax)
  const insurance = parseIncomeAmount(nationalInsurance)
  return gross === undefined || tax === undefined || insurance === undefined || gross > tax + insurance
}

const validIncomeAmount = moneyConditions.register('IsValidControlledIncomeAmount', () => isValidIncomeAmount)
const positiveIncomeAmount = moneyConditions.register(
  'IsPositiveControlledIncomeAmount',
  () => isPositiveIncomeAmount,
)
const nonNegativeIncomeAmount = moneyConditions.register(
  'IsNonNegativeControlledIncomeAmount',
  () => isNonNegativeIncomeAmount,
)
const netIncomePositive = moneyConditions.register('IsControlledNetIncomePositive', () => isNetIncomePositive)
const hasMultipleIncomeRows = Data(INCOME_COLLECTION)
  .pipe(Transformer.Array.Length())
  .match(Condition.Number.GreaterThan(ONE))

/**
 * Selects the singular or indexed error text for the current income row.
 * @param {string} single The message for one row.
 * @param {string} multiple The message template for multiple rows.
 * @returns {ReturnType<typeof Conditional>} The conditional error message.
 */
function incomeError(single: string, multiple: string): ReturnType<typeof Conditional> {
  return Conditional({
    when: hasMultipleIncomeRows,
    then: Format(multiple, Loop.Index()),
    else: single,
  })
}

export const incomeTypeField = GovUKRadioInput({
  code: INCOME_TYPE_CODE,
  defaultValue: Item().path('income_type'),
  fieldset: { legend: { text: 'What type of employment income is this?', classes: 'govuk-fieldset__legend--s' } },
  items: [
    {
      value: 'employment',
      text: 'A salary or wage',
      hint: 'Including if your client is a self-employed company director or in a partnership and is paid as an employee',
    },
    { value: 'statutory_pay', text: 'Statutory Sick Pay or Statutory Maternity Pay' },
    {
      value: 'self_employment',
      text: 'Self-employment income',
      hint: 'For example, payment in cash, drawings or dividends or bonuses paid from a company account, and the value of any benefits in kind',
    },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(employment|statutory_pay|self_employment)$')),
      message: incomeError(
        'Select the employment income type',
        'Select the employment income type for employment income %1',
      ),
    }),
  ],
})

export const incomeFrequencyField = GovUKRadioInput({
  code: FREQUENCY_CODE,
  defaultValue: Item().path('income_frequency'),
  fieldset: {
    legend: {
      text: 'When does your client normally get this income?',
      classes: 'govuk-fieldset__legend--s',
    },
  },
  hint: {
    text: 'We’ll use this to calculate their monthly income. If they do not get income regularly, tell us how much they got in the last 3 months.',
  },
  items: [...FREQUENCIES],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(every_week|every_two_weeks|every_four_weeks|monthly|three_months)$')),
      message: incomeError(
        'Select when your client normally gets this income',
        'Select when your client normally gets income %1',
      ),
    }),
  ],
})

/**
 * Creates a repeated currency input with its field-specific validation.
 * @param {{ fieldCode: string, label: string, validWhen: Array<ReturnType<typeof validation>> }} root0 The field configuration.
 * @param {string} root0.fieldCode The field code used to identify the submitted value.
 * @param {string} root0.label The label displayed with the input.
 * @param {Array<ReturnType<typeof validation>>} root0.validWhen The validations applied to the input.
 * @returns {ReturnType<typeof GovUKTextInput>} The configured currency input.
 */
function incomeAmountField({
  fieldCode,
  label,
  validWhen,
}: {
  fieldCode: string
  label: string
  validWhen: Array<ReturnType<typeof validation>>
}): ReturnType<typeof GovUKTextInput> {
  return GovUKTextInput({
    code: Format('%1_%2', fieldCode, Loop.Index0()),
    defaultValue: Item().path(fieldCode),
    label: { text: label, classes: 'govuk-label--s' },
    inputType: 'text',
    attributes: { inputmode: 'decimal' },
    prefix: { text: '£' },
    classes: GovUKUtilityClasses.Input.Width10,
    validWhen,
  })
}

export const grossIncomeField = incomeAmountField({
  fieldCode: 'gross_income',
  label: 'Income before any deductions',
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: incomeError(
        'Enter the income before any deductions',
        'Enter the income before any deductions for employment income %1',
      ),
    }),
    validation({
      condition: Self().match(validIncomeAmount()),
      message: incomeError(
        'Income before any deductions must be a number',
        'Income before any deductions for employment income %1 must be a number',
      ),
    }),
    validation({
      condition: Self().match(positiveIncomeAmount()),
      message: incomeError(
        'Income before any deductions must be more than 0',
        'Income before any deductions for employment income %1 must be more than 0',
      ),
    }),
    validation({
      condition: Self().match(
        netIncomePositive(Answer(INCOME_TAX_CODE), Answer(NATIONAL_INSURANCE_CODE)),
      ),
      message: incomeError(
        'Income before any deductions must be more than income tax and National Insurance combined',
        'Income before any deductions for employment income %1 must be more than income tax and National Insurance combined',
      ),
    }),
  ],
})

export const incomeTaxField = incomeAmountField({
  fieldCode: 'income_tax',
  label: 'Income tax',
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: incomeError('Enter the income tax amount', 'Enter the income tax amount for employment income %1'),
    }),
    validation({
      condition: Self().match(validIncomeAmount()),
      message: incomeError(
        'Income tax amount must be a number',
        'Income tax amount for employment income %1 must be a number',
      ),
    }),
    validation({
      condition: Self().match(nonNegativeIncomeAmount()),
      message: incomeError(
        'Income tax amount must be 0 or more',
        'Income tax amount for employment income %1 must be 0 or more',
      ),
    }),
  ],
})

export const nationalInsuranceField = incomeAmountField({
  fieldCode: 'national_insurance',
  label: 'National Insurance',
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: incomeError(
        'Enter the National Insurance amount',
        'Enter the National Insurance amount for employment income %1',
      ),
    }),
    validation({
      condition: Self().match(validIncomeAmount()),
      message: incomeError(
        'National Insurance amount must be a number',
        'National Insurance amount for employment income %1 must be a number',
      ),
    }),
    validation({
      condition: Self().match(nonNegativeIncomeAmount()),
      message: incomeError(
        'National Insurance amount must be 0 or more',
        'National Insurance amount for employment income %1 must be 0 or more',
      ),
    }),
  ],
})

const policeOfficerDetails = GovUKDetails({
  summaryText: 'Clients who are police officers',
  html: `<p class="govuk-body">If your client is a police officer, the salary entered should include:</p>
<ul class="govuk-list govuk-list--bullet">
<li>any rent or force housing allowance the client gets</li>
<li>any police compensatory grant the client gets</li>
</ul>`,
})

const prisonerDetails = GovUKDetails({
  summaryText: 'Clients in prison',
  html: `<p class="govuk-body">If your client is in prison, include any income they get from:</p>
<ul class="govuk-list govuk-list--bullet">
<li>the pre-release employment scheme</li>
<li>outside employment where they are participating in a ‘working out’ scheme</li>
<li>employment when released on temporary licence</li>
</ul>`,
})

const overseasClientDetails = GovUKDetails({
  summaryText: 'Clients living outside the UK',
  html: `<p class="govuk-body">If your client lives outside the UK, include all income tax payments they made.</p>
<p class="govuk-body">Only include UK National Insurance contributions.</p>`,
})

const armedForcesDetails = GovUKDetails({
  summaryText: 'Clients in HM Forces',
  html: `<p class="govuk-body">If your client is a member of HM Forces, include any of the following they get in the gross salary you enter:</p>
<ul class="govuk-list govuk-list--bullet">
<li>Local Overseas Allowance</li>
<li>Excess Rent Allowance</li>
<li>London Allowance</li>
<li>Overseas Child Benefit</li>
</ul>`,
})

const selfEmploymentDetails = GovUKDetails({
  summaryText: 'Self-employed clients, including clients paid in cash',
  html: `<p class="govuk-body">If your client is self-employed, enter their drawings, dividends, bonuses or any benefits in kind from their business as their income.</p>
<p class="govuk-body">If your client is paid in cash, their drawings will be any money taken out of their earnings for personal use.</p>`,
})

const incomeRows = CollectionBlock({
  collection: Data(INCOME_COLLECTION).each(
    Iterator.Map([
      GovUKGridRow({
        columns: [
          { width: 'one-half', blocks: [GovUKHeading({ text: Format('Employment income %1', Loop.Index()), size: 'm' })] },
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
      incomeTypeField,
      incomeFrequencyField,
      grossIncomeField,
      selfEmploymentDetails,
      incomeTaxField,
      nationalInsuranceField,
      GovUKSectionBreak({ size: 'l', visible: true }),
    ]),
  ),
})

const addAnotherIncomeButton = GovUKButton({
  text: 'Add another employment income',
  name: 'action',
  value: 'add-another-employment-income',
  classes: 'govuk-button--secondary',
})

const guidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [`${GUIDANCE_URL}#page=13`], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Employment income (PDF, 599KB)',
})

export const incomePageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION,     size: 'l', level: QUESTION_HEADING_LEVEL }),
    GovUKBody({ text: "You can find this on your client's payslips", classes: 'govuk-hint' }),
    policeOfficerDetails,
    prisonerDetails,
    overseasClientDetails,
    armedForcesDetails,
    incomeRows,
    addAnotherIncomeButton,
  ],
  guidanceBlocks: [guidanceLink],
})

export const incomeFieldCodes = FIELD_CODES
