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
  validation,
} from '@ministryofjustice/hmpps-forge/core/authoring'
import { CollectionBlock } from '@ministryofjustice/hmpps-forge/core/components'
import {
  GovUKBody,
  GovUKButton,
  GovUKCheckboxInput,
  GovUKGridRow,
  GovUKHeading,
  GovUKRadioInput,
  GovUKSectionBreak,
  GovUKTextInput,
  GovUKUtilityClasses,
} from '@ministryofjustice/hmpps-forge/govuk-components'
import { CONTROLLED_WORK_DATA_KEYS } from '../controlledWork/controlledWorkEffects.js'
import { isPropertyEntryNumberOrEmpty, parsePropertyEntryNumber } from '../controlledWork/propertyEntryAnswers.js'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { moneyConditions } from '../moneyFieldHelpers.js'
import { additionalPropertyGuidanceLinks } from '../additionalPropertyPage/additionalPropertyBlock.js'
import { subjectMatterOfDisputeDetails } from '../propertyEntryPage/propertyEntryBlock.js'

const QUESTION = 'Client’s other property, holiday home or land'
const PARTNER_HINT = 'If your client and their partner share other property, a holiday home or land, include this here'
const ADDITIONAL_PROPERTY = 'Other property, holiday home or land'
const PROPERTY_VALUE_HINT =
  'You can use property websites to find the estimated value. If you have more than one valuation, use the highest. Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.'
const MORTGAGE_HINT = 'Check the statement from the mortgage provider or lender and include any other loans secured against the property'
const COLLECTION_CODE = CONTROLLED_WORK_DATA_KEYS.additionalPropertyCollection
const PROPERTY_OWNERSHIP_CODE = 'additional-property-owned'
const SUBJECT_MATTER_OF_DISPUTE_APPLIES = Answer('immigration-or-asylum').match(Condition.Equals('no'))
const PARTNER_PRESENT = Answer('partner').match(Condition.Equals('yes'))
const HAS_MULTIPLE_ROWS = Data(COLLECTION_CODE)
  .pipe(Transformer.Array.Length())
  .match(Condition.Number.GreaterThan(1))
const ROW_INDEX = Loop.Index()
const INLINE_MORTGAGE_CODE = Format('inline_owned_with_mortgage_%1', Loop.Index0())
const MORTGAGE_CODE = Format('mortgage_%1', Loop.Index0())
const HOUSE_VALUE_CODE = Format('house_value_%1', Loop.Index0())
const PERCENTAGE_OWNED_CODE = Format('percentage_owned_%1', Loop.Index0())
const HOUSE_IN_DISPUTE_CODE = Format('house_in_dispute_%1', Loop.Index0())
const HAS_PREDETERMINED_MORTGAGE = and(
  Loop.Index0().match(Condition.Equals(0)),
  Answer(PROPERTY_OWNERSHIP_CODE).match(Condition.Equals('with_mortgage')),
)
const INLINE_MORTGAGE_APPLIES = Answer(INLINE_MORTGAGE_CODE).match(Condition.Equals('yes'))
const NUMBER_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/u
const MINIMUM_PERCENTAGE = 1
const MAXIMUM_PERCENTAGE = 100

export const additionalPropertyDetailsFieldCodes = [
  'house_value',
  'inline_owned_with_mortgage',
  'mortgage',
  'percentage_owned',
  'house_in_dispute',
]

function rowMessage(single: string, multiple: string) {
  return Conditional({
    when: HAS_MULTIPLE_ROWS,
    then: Format(multiple, ROW_INDEX),
    else: single,
  })
}

export function isValidAdditionalPropertyMoneyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const parsed = parsePropertyEntryNumber(value)
  return parsed !== undefined && NUMBER_PATTERN.test(String(value).trim().replace(/^£/u, '').replace(/,/gu, ''))
}

export function isValidAdditionalPropertyPercentageNumberValue(value: unknown): boolean {
  return isPropertyEntryNumberOrEmpty(value)
}

export function isPositiveAdditionalPropertyMoneyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const parsed = parsePropertyEntryNumber(value)
  return parsed === undefined || parsed > 0
}

export function isWholeAdditionalPropertyPercentageValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const parsed = parsePropertyEntryNumber(value)
  return parsed === undefined || Number.isInteger(parsed)
}

export function isAdditionalPropertyPercentageInRangeValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  const parsed = parsePropertyEntryNumber(value)
  return parsed === undefined || (parsed >= MINIMUM_PERCENTAGE && parsed <= MAXIMUM_PERCENTAGE)
}

const isValidAdditionalPropertyMoney = moneyConditions.register(
  'IsValidAdditionalPropertyMoney',
  () => isValidAdditionalPropertyMoneyValue,
)
const isValidAdditionalPropertyPercentageNumber = moneyConditions.register(
  'IsValidAdditionalPropertyPercentageNumber',
  () => isValidAdditionalPropertyPercentageNumberValue,
)
const isPositiveAdditionalPropertyMoney = moneyConditions.register(
  'IsPositiveAdditionalPropertyMoney',
  () => isPositiveAdditionalPropertyMoneyValue,
)
const isWholeAdditionalPropertyPercentage = moneyConditions.register(
  'IsWholeAdditionalPropertyPercentage',
  () => isWholeAdditionalPropertyPercentageValue,
)
const isAdditionalPropertyPercentageInRange = moneyConditions.register(
  'IsAdditionalPropertyPercentageInRange',
  () => isAdditionalPropertyPercentageInRangeValue,
)

const additionalPropertyHeading = GovUKHeading({
  text: QUESTION,
  size: 'l',
  level: 2,
})

const partnerHint = {
  ...GovUKBody({ text: PARTNER_HINT, classes: 'govuk-hint' }),
  visibleWhen: PARTNER_PRESENT,
}

const houseValueField = GovUKTextInput({
  code: HOUSE_VALUE_CODE,
  defaultValue: Item().path('house_value'),
  label: { text: 'How much is the property, holiday home or land worth?', classes: 'govuk-label--m' },
  hint: { text: PROPERTY_VALUE_HINT },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: rowMessage(
        'Enter how much the property, holiday home or land is worth',
        'Enter how much property, holiday home or land %1 is worth',
      ),
    }),
    validation({
      condition: Self().match(isValidAdditionalPropertyMoney()),
      message: rowMessage(
        'How much the property, holiday home or land is worth must be a number',
        'How much property, holiday home or land %1 is worth must be a number',
      ),
    }),
    validation({
      condition: Self().match(isPositiveAdditionalPropertyMoney()),
      message: rowMessage(
        'The property, holiday home or land must be worth more than 0',
        'Property, holiday home or land %1 must be worth more than 0',
      ),
    }),
  ],
})

const inlineMortgageQuestion = GovUKRadioInput({
  code: INLINE_MORTGAGE_CODE,
  defaultValue: Item().path('inline_owned_with_mortgage'),
  fieldset: {
    legend: {
      text: 'Is there an outstanding mortgage on the property, holiday home or land?',
      classes: 'govuk-fieldset__legend--s',
    },
  },
  hint: { text: MORTGAGE_HINT },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  visibleWhen: Loop.Index0().match(Condition.Number.GreaterThan(0)),
  dependentWhen: Loop.Index0().match(Condition.Number.GreaterThan(0)),
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: rowMessage(
        'Select yes if there is an outstanding mortgage',
        'Select yes if there is an outstanding mortgage on other property, holiday home or land %1',
      ),
    }),
  ],
})

const mortgageValidations = [
  validation({
    condition: Self().match(Condition.IsRequired()),
    message: rowMessage(
      'Enter how much is left to pay on the mortgage',
      'Enter how much is left to pay on the mortgage for property, holiday home or land %1',
    ),
  }),
  validation({
    condition: Self().match(isValidAdditionalPropertyMoney()),
    message: rowMessage(
      'How much is left to pay on the mortgage must be a number',
      'How much is left to pay on the mortgage for property, holiday home or land %1 must be a number',
    ),
  }),
  validation({
    condition: Self().match(isPositiveAdditionalPropertyMoney()),
    message: rowMessage(
      'How much is left to pay on the mortgage must be more than 0',
      'How much is left to pay on the mortgage for property, holiday home or land %1 must be more than 0',
    ),
  }),
]

const predeterminedMortgageField = GovUKTextInput({
  code: MORTGAGE_CODE,
  defaultValue: Item().path('mortgage'),
  label: { text: 'How much is left to pay on the mortgage?', classes: 'govuk-label--m' },
  hint: { text: MORTGAGE_HINT },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  visibleWhen: HAS_PREDETERMINED_MORTGAGE,
  dependentWhen: HAS_PREDETERMINED_MORTGAGE,
  validWhen: mortgageValidations,
})

const conditionalMortgageField = GovUKTextInput({
  code: MORTGAGE_CODE,
  defaultValue: Item().path('mortgage'),
  label: { text: 'Enter the value of the outstanding mortgage', classes: 'govuk-label--m' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  visibleWhen: INLINE_MORTGAGE_APPLIES,
  dependentWhen: INLINE_MORTGAGE_APPLIES,
  validWhen: mortgageValidations,
})

const percentageOwnedField = GovUKTextInput({
  code: PERCENTAGE_OWNED_CODE,
  defaultValue: Item().path('percentage_owned'),
  label: { text: 'What percentage share does your client own?', classes: 'govuk-label--m' },
  hint: {
    text: 'If the property, holiday home or land is shared with the partner, add the percentage the client and partner own together. We do not need to know what percentage each of them owns.',
  },
  inputType: 'text',
  attributes: { inputmode: 'numeric' },
  suffix: { text: '%' },
  classes: GovUKUtilityClasses.Input.Width3,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: rowMessage(
        'Enter the percentage share your client owns',
        'Enter the percentage share your client owns of property %1',
      ),
    }),
    validation({
      condition: Self().match(isValidAdditionalPropertyPercentageNumber()),
      message: rowMessage(
        'Percentage share your client owns must be a number between 1 and 100',
        'Percentage share your client owns of property %1 must be a number between 1 and 100',
      ),
    }),
    validation({
      condition: Self().match(isWholeAdditionalPropertyPercentage()),
      message: rowMessage(
        'Percentage share your client owns must be a whole number between 1 and 100',
        'Percentage share your client owns of property %1 must be a whole number between 1 and 100',
      ),
    }),
    validation({
      condition: Self().match(isAdditionalPropertyPercentageInRange()),
      message: rowMessage(
        'Percentage share your client owns must be between 1 and 100',
        'Percentage share your client owns of property %1 must be between 1 and 100',
      ),
    }),
  ],
})

const houseInDisputeField = GovUKCheckboxInput({
  code: HOUSE_IN_DISPUTE_CODE,
  defaultValue: Item().path('house_in_dispute'),
  visibleWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  dependentWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  items: [
    {
      value: 'yes',
      text: 'This asset is a subject matter of dispute',
      checked: Answer(HOUSE_IN_DISPUTE_CODE).match(Condition.Equals('yes')),
    },
  ],
})

const propertyRows = CollectionBlock({
  collection: Data(COLLECTION_CODE).each(
    Iterator.Map([
      GovUKGridRow({
        columns: [
          {
            width: 'one-half',
            blocks: [GovUKHeading({ text: Format(`${ADDITIONAL_PROPERTY} %1`, ROW_INDEX), size: 'm' })],
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
      houseValueField,
      inlineMortgageQuestion,
      predeterminedMortgageField,
      conditionalMortgageField,
      percentageOwnedField,
      houseInDisputeField,
      subjectMatterOfDisputeDetails,
      GovUKSectionBreak({ size: 'l', visible: true }),
    ]),
  ),
})

const addAnotherPropertyButton = GovUKButton({
  text: 'Add another property, holiday home or land',
  name: 'action',
  value: 'add-another-additional-property',
  classes: 'govuk-button--secondary',
})

export const additionalPropertyDetailsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [additionalPropertyHeading, partnerHint, propertyRows, addAnotherPropertyButton],
  guidanceBlocks: additionalPropertyGuidanceLinks,
})

export const additionalPropertyDetailsFields = {
  houseValue: houseValueField,
  inlineMortgageQuestion,
  predeterminedMortgage: predeterminedMortgageField,
  conditionalMortgage: conditionalMortgageField,
  percentageOwned: percentageOwnedField,
  houseInDispute: houseInDisputeField,
}
