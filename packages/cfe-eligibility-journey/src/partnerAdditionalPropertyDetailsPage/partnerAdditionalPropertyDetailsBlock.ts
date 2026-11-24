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
  and,
  Answer,
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
import { additionalPropertyGuidanceLinks } from '../additionalPropertyPage/additionalPropertyBlock.js'
import {
  isAdditionalPropertyPercentageInRangeValue,
  isPositiveAdditionalPropertyMoneyValue,
  isValidAdditionalPropertyMoneyValue,
  isValidAdditionalPropertyPercentageNumberValue,
  isWholeAdditionalPropertyPercentageValue,
} from '../additionalPropertyDetailsPage/additionalPropertyDetailsBlock.js'

const QUESTION = "The partner's other property, holiday home or land"
const QUESTION_HINT = 'Do not include any property or land already entered for your client.'
const PROPERTY_NAME = 'Other property, holiday home or land'
const PROPERTY_VALUE_HINT =
  'You can use property websites to find the estimated value. If you have more than one valuation, use the highest. Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.'
const MORTGAGE_HINT =
  'Check the statement from the mortgage provider or lender and include any other loans secured against the property'
const COLLECTION_CODE = CONTROLLED_WORK_DATA_KEYS.partnerAdditionalPropertyCollection
const PROPERTY_OWNERSHIP_CODE = 'partner-additional-property-owned'
const HAS_MULTIPLE_ROWS = Data(COLLECTION_CODE).pipe(Transformer.Array.Length()).match(Condition.Number.GreaterThan(1))
const ROW_INDEX = Loop.Index()
const INLINE_MORTGAGE_CODE = Format('inline_owned_with_mortgage_%1', Loop.Index0())
const MORTGAGE_CODE = Format('mortgage_%1', Loop.Index0())
const HOUSE_VALUE_CODE = Format('house_value_%1', Loop.Index0())
const PERCENTAGE_OWNED_CODE = Format('percentage_owned_%1', Loop.Index0())
const HAS_PREDETERMINED_MORTGAGE = and(
  Loop.Index0().match(Condition.Equals(0)),
  Answer(PROPERTY_OWNERSHIP_CODE).match(Condition.Equals('with_mortgage')),
)
const INLINE_MORTGAGE_APPLIES = Answer(INLINE_MORTGAGE_CODE).match(Condition.Equals('yes'))
function rowMessage(single: string, multiple: string) {
  return Conditional({
    when: HAS_MULTIPLE_ROWS,
    then: Format(multiple, ROW_INDEX),
    else: single,
  })
}

export {
  isAdditionalPropertyPercentageInRangeValue as isPartnerAdditionalPropertyPercentageInRangeValue,
  isPositiveAdditionalPropertyMoneyValue as isPositivePartnerAdditionalPropertyMoneyValue,
  isValidAdditionalPropertyMoneyValue as isValidPartnerAdditionalPropertyMoneyValue,
  isValidAdditionalPropertyPercentageNumberValue as isValidPartnerAdditionalPropertyPercentageNumberValue,
  isWholeAdditionalPropertyPercentageValue as isWholePartnerAdditionalPropertyPercentageValue,
}

const isValidPartnerPropertyMoney = moneyConditions.register(
  'IsValidPartnerAdditionalPropertyMoney',
  () => isValidAdditionalPropertyMoneyValue,
)
const isPositivePartnerPropertyMoney = moneyConditions.register(
  'IsPositivePartnerAdditionalPropertyMoney',
  () => isPositiveAdditionalPropertyMoneyValue,
)
const isValidPartnerPropertyPercentageNumber = moneyConditions.register(
  'IsValidPartnerAdditionalPropertyPercentageNumber',
  () => isValidAdditionalPropertyPercentageNumberValue,
)
const isWholePartnerPropertyPercentage = moneyConditions.register(
  'IsWholePartnerAdditionalPropertyPercentage',
  () => isWholeAdditionalPropertyPercentageValue,
)
const isPartnerPropertyPercentageInRange = moneyConditions.register(
  'IsPartnerAdditionalPropertyPercentageInRange',
  () => isAdditionalPropertyPercentageInRangeValue,
)

const partnerAdditionalPropertyHeading = GovUKHeading({
  text: QUESTION,
  size: 'l',
  level: 2,
})

const partnerTag = HtmlBlock({
  tag: 'div',
  classes: 'govuk-tag govuk-tag--purple govuk-!-margin-bottom-2',
  content: 'Partner',
})

const partnerHint = GovUKBody({ text: QUESTION_HINT, classes: 'govuk-hint' })

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
      condition: Self().match(isValidPartnerPropertyMoney()),
      message: rowMessage(
        'How much the property, holiday home or land is worth must be a number',
        'How much property, holiday home or land %1 is worth must be a number',
      ),
    }),
    validation({
      condition: Self().match(isPositivePartnerPropertyMoney()),
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
    condition: Self().match(isValidPartnerPropertyMoney()),
    message: rowMessage(
      'How much is left to pay on the mortgage must be a number',
      'How much is left to pay on the mortgage for property, holiday home or land %1 must be a number',
    ),
  }),
  validation({
    condition: Self().match(isPositivePartnerPropertyMoney()),
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
  label: { text: 'What percentage share does the partner own?', classes: 'govuk-label--m' },
  inputType: 'text',
  attributes: { inputmode: 'numeric' },
  suffix: { text: '%' },
  classes: GovUKUtilityClasses.Input.Width3,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: rowMessage(
        'Enter the percentage share the partner owns',
        'Enter the percentage share the partner owns of property %1',
      ),
    }),
    validation({
      condition: Self().match(isValidPartnerPropertyPercentageNumber()),
      message: rowMessage(
        'Percentage share the partner owns must be a number between 1 and 100',
        'Percentage share the partner owns of property %1 must be a number between 1 and 100',
      ),
    }),
    validation({
      condition: Self().match(isWholePartnerPropertyPercentage()),
      message: rowMessage(
        'Percentage share the partner owns must be a whole number between 1 and 100',
        'Percentage share the partner owns of property %1 must be a whole number between 1 and 100',
      ),
    }),
    validation({
      condition: Self().match(isPartnerPropertyPercentageInRange()),
      message: rowMessage(
        'Percentage share the partner owns must be between 1 and 100',
        'Percentage share the partner owns of property %1 must be between 1 and 100',
      ),
    }),
  ],
})

const propertyRows = CollectionBlock({
  collection: Data(COLLECTION_CODE).each(
    Iterator.Map([
      GovUKGridRow({
        columns: [
          {
            width: 'one-half',
            blocks: [GovUKHeading({ text: Format(`${PROPERTY_NAME} %1`, ROW_INDEX), size: 'm' })],
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

export const partnerAdditionalPropertyDetailsFieldCodes = [
  'house_value',
  'inline_owned_with_mortgage',
  'mortgage',
  'percentage_owned',
]

export const partnerAdditionalPropertyDetailsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [partnerTag, partnerAdditionalPropertyHeading, partnerHint, propertyRows, addAnotherPropertyButton],
  guidanceBlocks: additionalPropertyGuidanceLinks.slice(0, 2),
})

export const partnerAdditionalPropertyDetailsFields = {
  houseValue: houseValueField,
  inlineMortgageQuestion,
  predeterminedMortgage: predeterminedMortgageField,
  conditionalMortgage: conditionalMortgageField,
  percentageOwned: percentageOwnedField,
}
