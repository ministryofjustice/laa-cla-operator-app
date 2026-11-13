import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = 'Do any of the dependants aged 16 or over get regular income?'
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'

export const dependantIncomeField = GovUKRadioInput({
  code: 'dependants-get-income',
  fieldset: {
    legend: {
      text: QUESTION,
      classes: 'govuk-visually-hidden',
    },
  },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if any dependants aged 16 or over get income',
    }),
  ],
})

const dependantIncomeExamples = HtmlBlock({
  tag: 'div',
  content: `<p class="govuk-hint">Examples of dependant income:</p>
<ul class="govuk-list govuk-list--bullet">
  <li class="govuk-hint">a grant received by a child dependant over 16 who is in full-time education or training</li>
  <li class="govuk-hint">a wage received by a child dependant in an apprenticeship</li>
  <li class="govuk-hint">benefits received by an adult dependant</li>
  <li class="govuk-hint">earnings from part-time work if the dependant works more than 16 hours per week</li>
</ul>`,
})

const dependantIncomeGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=22`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: "Dependants' income (PDF, 599KB)",
})

export const dependantIncomePageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    dependantIncomeExamples,
    dependantIncomeField,
  ],
  guidanceBlocks: [dependantIncomeGuidanceLink],
})
