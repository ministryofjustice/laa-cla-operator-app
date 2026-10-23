import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'

export const over60FieldHeading=GovUKHeading({
  text: 'About you',
  size: 'm',
})

export const over60Field = GovUKRadioInput({
  code: '60-or-over',
  fieldset: {
    legend: {
      text: 'Are you aged over 60?',
      isPageHeading: true,
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
      message: 'Select if you are aged over 60',
    }),
  ],
})