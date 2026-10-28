import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput , GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'

export const under18HasValuablesHeading=GovUKHeading({
  text: 'About you',
  size: 'm',
})

export const under18HasValuablesField= GovUKRadioInput({
  code: 'under-18-has-valuables',
  fieldset: {
    legend: {
      text: 'Do you have any savings, items of value or investments totalling £2500 or more?',
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
      message: 'Select yes if you have any savings, items of value or investments totalling £2500 or more',
    }),
  ],
})