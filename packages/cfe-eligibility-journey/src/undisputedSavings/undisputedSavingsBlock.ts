import { Self, Condition, validation, Transformer } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKTextInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { decimalPlacesValidation, moneyMaxValueValidation, moneyMinValueValidation } from '../moneyFieldHelpers.js'

export const savingsHeading = GovUKHeading({
  text: 'Your undisputed savings',
  size: 'm',
})

export const bankBalanceField = GovUKTextInput({
  code: 'bank-balance',
  label: 'How much was in your bank account/building society before your last payment went in?',
  formatters: [Transformer.String.ToFloat()],
  prefix: { text: '£' },
  inputType: 'number',
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter how much was in your bank account/building society before your last payment went in, or enter \'0\' if none',
    }),
    validation({
      condition: Self().match(Condition.Number.GreaterThanOrEqual(0)),
      message: 'How much was in your bank account/building society before your last payment went in must only include positive numbers, with or without a decimal point',
    }),
    decimalPlacesValidation(),
    moneyMaxValueValidation(),
  ],
})

export const investmentBalanceField = GovUKTextInput({
  code: 'investment-balance',
  label: 'Do you have any investments, shares or ISAs?',
  formatters: [Transformer.String.ToFloat()],
  prefix: { text: '£' },
  inputType: 'number',
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the value of any investments, shares or ISAs you have, or enter \'0\' if none',
    }),
    validation({
      condition: Self().match(Condition.Number.GreaterThanOrEqual(0)),
      message: 'The value of any investments, shares or ISAs you have must only include positive numbers, with or without a decimal point',
    }),
    decimalPlacesValidation(),
    moneyMaxValueValidation(),
  ],
})

export const assetBalanceField = GovUKTextInput({
  code: 'asset-balance',
  label: 'Total value of items worth £500 or more each',
  hint: 'Include jewellery, antiques and other possessions worth £500 or more each. If there are no items worth £500 or more each, enter 0',
  formatters: [Transformer.String.ToFloat()],
  prefix: { text: '£' },
  inputType: 'number',
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the value of any valuable items you have worth over £500 each, or enter \'0\' if none',
    }),
    moneyMinValueValidation(),
    decimalPlacesValidation(),
    moneyMaxValueValidation(),
  ],
})

export const creditBalanceField = GovUKTextInput({
  code: 'credit-balance',
  label: 'Do you have any money owed to you?',
  formatters: [Transformer.String.ToFloat()],
  prefix: { text: '£' },
  inputType: 'number',
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the amount of any money owed to you, or enter \'0\' if none',
    }),
    validation({
      condition: Self().match(Condition.Number.GreaterThanOrEqual(0)),
      message: 'The amount of any money owed to you must only include positive numbers, with or without a decimal point',
    }),
    decimalPlacesValidation(),
    moneyMaxValueValidation(),
  ],
})