import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'

export const benefitsHeading=GovUKHeading({
  text: 'Benefits',
  size: 'm',
})

export const universalCreditField = GovUKRadioInput({
  code: 'universal-credit',
  fieldset: {
    legend: {
      text: 'Universal Credit',
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
      message: 'Select yes if they get Universal Credit',
    }),
  ],
})

export const incomeSupportField = GovUKRadioInput({
  code: 'income-support',
  fieldset: {
    legend: {
      text: 'Income Support',
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
      message: 'Select yes if they get Income Support',
    }),
  ],
})

export const incomeBasedJSAField = GovUKRadioInput({
  code: 'income-based-jsa',
  fieldset: {
    legend: {
      text: 'Income-based Job Seekers Allowance',
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
      message: 'Select yes if they get Income-based Job Seekers Allowance',
    }),
  ],
})

export const pensionCreditField = GovUKRadioInput({
  code: 'pension-credit',
  fieldset: {
    legend: {
      text: 'Guarantee State Pension Credit',
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
      message: 'Select yes if they get Guarantee State Pension Credit',
    }),
  ],
})

export const employmentSupportField = GovUKRadioInput({
  code: 'employment-support',
  fieldset: {
    legend: {
      text: 'Income-related Employment and Support Allowance',
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
      message: 'Select yes if they get Income-related Employment and Support Allowance',
    }),
  ],
})