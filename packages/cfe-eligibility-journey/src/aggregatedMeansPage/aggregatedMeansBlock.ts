import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKDetails, GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = "Will you aggregate your client's means with another person's means?"
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'

export const aggregatedMeansField = GovUKRadioInput({
  code: 'aggregated-means',
  fieldset: {
    legend: {
      text: QUESTION,
      classes: 'govuk-visually-hidden',
    },
  },
  classes: GovUKUtilityClasses.Radios.Inline,
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if you will aggregate your client’s means with another person’s means',
    }),
  ],
})

const aggregationDetails = GovUKDetails({
  summaryText: 'What we mean by aggregation of means',
  html: `<p class="govuk-body">A maintaining adult is any other person who is responsible for maintaining the child. For example, the other person could be one of the following:</p>
<ul class="govuk-list govuk-list--bullet">
  <li>a parent or guardian who gives your client financial support</li>
  <li>anyone who contributes substantially to your client's maintenance</li>
</ul>
<p class="govuk-body">Exceptions to this are when:</p>
<ul class="govuk-list govuk-list--bullet">
  <li>a parent or guardian has a conflict of interest in the matter</li>
  <li>the client is financially independent</li>
  <li>the client is in local authority or foster care</li>
</ul>`,
})

const controlledWorkGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Controlled work (PDF, 599KB)',
})

const aggregationGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=48`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Means aggregation for under 18s (PDF, 599KB)',
})

export const aggregatedMeansPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    GovUKBody({
      text: "If your client's means are aggregated with the means of another person, such as a maintaining adult, they must have a full means test.",
    }),
    aggregationDetails,
    aggregatedMeansField,
  ],
  guidanceBlocks: [controlledWorkGuidanceLink, aggregationGuidanceLink],
})
