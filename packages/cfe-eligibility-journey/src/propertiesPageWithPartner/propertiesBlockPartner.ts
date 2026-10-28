import { Self, Answer, Condition, validation, Iterator, Data, Format, Loop, Item, Transformer, or, not } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKTextInput, GovUKBody, GovUKButton, GovUKUtilityClasses, GovUKRadioInput, GovUKSectionBreak, GovUKGridRow } from '@ministryofjustice/hmpps-forge/govuk-components'
import { CollectionBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { decimalPlacesValidation, moneyMaxValueValidation } from '../moneyFieldHelpers.js'

const categoryIsDebtOrFamily = or(
  Answer('category').match(Condition.Equals('debt')),
  Answer('category').match(Condition.Equals('family'))
)

export const propertiesHeading = GovUKHeading({
  text: 'Properties',
  size: 'm',
})

export const propertySet = CollectionBlock({
  collection: Data('propertySet').each(
    Iterator.Map([
      GovUKGridRow({
        columns: [
          {
            width: 'one-half',
            blocks: [
              GovUKHeading({
                text: Format('Property %1', Loop.Index()),
                size: 's',
              }),
            ],
          },
          {
            width: 'one-half',
            blocks: [
              GovUKButton({
                text: 'Remove',
                name: 'action',
                value: Format('remove_%1', Loop.Index0()),
                classes: 'govuk-button--secondary property-remove-button',
              }),
            ],
          },
        ],
      }),
      GovUKTextInput({
        code: Format('value_%1', Loop.Index0()),
        label: 'What is the current market value of the property?',
        defaultValue: Item().path('value'),
        formatters: [Transformer.String.ToFloat()],
        prefix: { text: '£' },
        inputType: 'number',
        classes: GovUKUtilityClasses.Input.Width10,
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: Format('Enter the current market value of property %1', Loop.Index()),
          }),
          validation({
            condition: Self().match(Condition.Number.GreaterThanOrEqual(0)),
            message: Format('The current market value of property %1 must only include positive numbers, with or without a decimal point', Loop.Index()),
          }),
          decimalPlacesValidation(),
          moneyMaxValueValidation(),
        ],
      }),
      GovUKTextInput({
        code: Format('mortgage-left_%1', Loop.Index0()),
        label: 'How much is left to pay on the mortgage?',
        defaultValue: Item().path('mortgage-left'),
        formatters: [Transformer.String.ToFloat()],
        prefix: { text: '£' },
        inputType: 'number',
        classes: GovUKUtilityClasses.Input.Width10,
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: Format('Enter how much is left to pay on the mortgage for property %1, or enter \'0\' if there is nothing left to pay', Loop.Index()),
          }),
          validation({
            condition: Self().match(Condition.Number.GreaterThanOrEqual(0)),
            message: Format('How much is left to pay on the mortgage for property %1 must only include positive numbers, with or without a decimal point', Loop.Index()),
          }),
          decimalPlacesValidation(),
          moneyMaxValueValidation(),
        ],
      }),
      GovUKRadioInput({
        code: Format('disputed_%1', Loop.Index0()),
        defaultValue: Item().path('disputed'),
        fieldset: {
          legend: {
            text: 'Is the property disputed?',
            isPageHeading: false,
          },
        },
        classes: GovUKUtilityClasses.Radios.Inline,
        visibleWhen: categoryIsDebtOrFamily,
        items: [
          { value: 'yes', text: 'Yes' },
          { value: 'no', text: 'No' },
        ],
        validWhen: [
          validation({
            condition: or ( not(categoryIsDebtOrFamily), Self().match(Condition.IsRequired())),
            message: Format('Select yes if property %1 is disputed', Loop.Index()),
          }),
        ],
      }),
      GovUKRadioInput({
        code: Format('main_%1', Loop.Index0()),
        defaultValue: Item().path('main'),
        fieldset: {
          legend: {
            text: 'Is this your main property?',
            isPageHeading: false,
          },
        },
        classes: GovUKUtilityClasses.Radios.Inline,
        items: [
          { value: 'yes', text: 'Yes' },
          { value: 'no', text: 'No' },
        ],
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: Format('Select yes if property %1 is your main property', Loop.Index()),
          }),
        ],
      }),
      GovUKTextInput({
        code: Format('share_%1', Loop.Index0()),
        label: 'What percentage of the property do you and/or your partner own?',
        defaultValue: Item().path('share'),
        formatters: [Transformer.String.ToFloat()],
        suffix: { text: '%' },
        inputType: 'number',
        classes: GovUKUtilityClasses.Input.Width3,
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: Format('Enter the percentage you and/or your partner own of property %1', Loop.Index()),
          }),
          validation({
            condition: Self().match(Condition.Number.IsInteger()),
            message: Format('The percentage you and/or your partner own of property %1 must be a whole number', Loop.Index()),
          }),
          validation({
            condition: Self().match(Condition.Number.Between(1, 100)),
            message: Format('The percentage you and/or your partner own of property %1 must be a number between 1 and 100', Loop.Index()),
          }),
        ],
      }),
      GovUKSectionBreak({ size: 'l', visible: true }),
    ]),
  ),
  fallback: [GovUKBody({ text: 'No properties have been added' })],
})

export const addAnotherButton = GovUKGridRow({
  columns: [
    {
      width: 'full',
      blocks: [
        GovUKButton({
          text: 'Add property',
          name: 'action',
          value: 'add-another-property',
          classes: 'govuk-button--secondary',
          visibleWhen: Data('propertySet').not.match(Condition.IsRequired()),
        }),
        GovUKButton({
          text: 'Add another property',
          name: 'action',
          value: 'add-another-property',
          classes: 'govuk-button--secondary',
          visibleWhen: Data('propertySet').match(Condition.IsRequired()),
        }),
      ],
    }
  ],
})

