import { Self, Condition, validation} from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'

export const partnerFieldHeading=GovUKHeading({
  text: 'About you',
  size: 'm',
})

export const partnerField = GovUKRadioInput({
  code: 'has-partner',
  fieldset: {
    legend: {
      text: 'Do you have a partner?',
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
      message: 'Select if you have a partner',
    }),
  ],
})