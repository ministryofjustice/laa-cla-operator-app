import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = "What is the partner's employment status?"

export const partnerEmploymentStatusField = GovUKRadioInput({
  code: 'partner-employment-status',
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
      hint: 'Including if the partner is paid in cash, is a sole trader, is a company director, is in a partnership, or gets Statutory Sick Pay or Statutory Maternity Pay',
    },
    {
      value: 'unemployed',
      text: 'Unemployed',
      hint: 'Including anyone without employment income, for example retired partners',
    },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(in_work|unemployed)$')),
      message: 'Select an employment status',
    }),
  ],
})

export const partnerEmploymentStatusPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    partnerEmploymentStatusField,
  ],
  guidanceBlocks: [],
})
