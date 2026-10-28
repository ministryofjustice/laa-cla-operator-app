import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput , GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'

// A plain radio with two options. The selected value drives the redirect in
// the step's submit hook, so the field only needs a required rule here.
export const under18FieldHeading=GovUKHeading({
  text: 'About you',
  size: 'm',
})

export const under18Field=GovUKRadioInput({
  code: 'under-18',
  fieldset: {
    legend: {
      text: 'Are you aged 17 or under?',
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
      message: 'Select yes if you are aged 17 or under',
    }),
  ],
})