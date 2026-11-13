import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = "What is your client's employment status?"

export const employmentStatusField = GovUKRadioInput({
  code: 'employment-status',
  fieldset: {
    legend: {
      text: QUESTION,
      classes: 'govuk-visually-hidden',
    },
  },
  items: [
    {
      value: 'in_work',
      text: 'Employed or self-employed',
      hint: 'Including if your client is paid in cash, is a sole trader, is a company director, is in a partnership, or gets Statutory Sick Pay or Statutory Maternity Pay',
    },
    {
      value: 'unemployed',
      text: 'Unemployed',
      hint: 'Including anyone without employment income, for example retired clients',
    },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(in_work|unemployed)$')),
      message: 'Select an employment status',
    }),
  ],
})

export const employmentStatusPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    employmentStatusField,
  ],
  guidanceBlocks: [],
})
