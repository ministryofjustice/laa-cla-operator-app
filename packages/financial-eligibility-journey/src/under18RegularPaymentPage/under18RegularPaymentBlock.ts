import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput , GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'

export const under18RegularPaymentHeading=GovUKHeading({
  text: 'About you',
  size: 'm',
})

export const under18RegularPaymentField= GovUKRadioInput({
  code: 'under-18-receives-regular-payment',
  fieldset: {
    legend: {
      text: 'Do you receive any money on a regular basis?',
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
      message: 'Select yes if you receive any money on a regular basis',
    }),
  ],
})