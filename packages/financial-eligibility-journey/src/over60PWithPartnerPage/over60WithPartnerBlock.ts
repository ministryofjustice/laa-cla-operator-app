import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'

export const over60WithPartnerFieldHeading=GovUKHeading({
  text: 'About you',
  size: 'm',
})

export const over60WithPartnerField = GovUKRadioInput({
  code: '60-or-over-with-partner',
  fieldset: {
    legend: {
      text: 'Are you or your partner aged 60 or over?',
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
      message: 'Select yes if you or your partner are aged 60 or over',
    }),
  ],
})