import { Self, Condition, validation, Transformer, and } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKTextInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { dependantsMaxValidation } from '../dependantsFieldHelpers.js'

export const dependantsHeading = GovUKHeading({
  text: 'Dependants',
  size: 'm',
})

export const partnerDependants16OverField = GovUKTextInput({
  code: 'dependants-16-over',
  label: 'Do you and your partner have any dependants aged 16 and over?',
  formatters: [Transformer.String.ToFloat()],
  inputType: 'number',
  classes: GovUKUtilityClasses.Input.Width2,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the number of dependants you and your partner have aged 16 and over, or enter \'0\' if none',
    }),
    validation({
      condition: and(Self().match(Condition.Number.IsInteger()), Self().match(Condition.Number.GreaterThanOrEqual(0))),
      message: 'The number of dependants you and your partner have aged 16 and over must be a whole positive number, like 1 or 2',
    }),
    dependantsMaxValidation(),
  ],
})

export const partnerDependants15UnderField = GovUKTextInput({
  code: 'dependants-15-under',
  label: 'Do you and your partner have any dependants aged 15 and under?',
  formatters: [Transformer.String.ToFloat()],
  inputType: 'number',
  classes: GovUKUtilityClasses.Input.Width2,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the number of dependants you and your partner have aged 15 and under, or enter \'0\' if none',
    }),
    validation({
      condition: and(Self().match(Condition.Number.IsInteger()), Self().match(Condition.Number.GreaterThanOrEqual(0))),
      message: 'The number of dependants you and your partner have aged 15 and under must be a whole positive number, like 1 or 2',
    }),
    dependantsMaxValidation(),
  ],
})