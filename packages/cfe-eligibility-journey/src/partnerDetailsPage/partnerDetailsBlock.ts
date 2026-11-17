import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const TITLE = 'Tell us about the partner'
const QUESTION = 'Is the partner aged 60 or over?'

export const partnerOver60Field = GovUKRadioInput({
  code: 'partner-over-60',
  fieldset: { legend: { text: QUESTION } },
  hint: {
    text: 'Clients with partners aged 60 or over may have some of their capital excluded from a financial eligibility assessment.',
  },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if the partner is aged 60 or over',
    }),
  ],
})

export const partnerDetailsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: TITLE, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    partnerOver60Field,
  ],
  guidanceBlocks: [],
})
