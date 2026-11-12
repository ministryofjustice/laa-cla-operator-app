import { GovUKBody, GovUKDetails, GovUKHeading, GovUKList, GovUKPanel } from '@ministryofjustice/hmpps-forge/govuk-components'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const TITLE = "You are going to aggregate your client's means with another person's means"
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const INDIVIDUAL_RESOURCES_REGULATIONS_URL = 'https://www.legislation.gov.uk/uksi/2013/480/regulation/16/made'

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

const maintainingAdultDetails = GovUKDetails({
  summaryText: 'What we mean by a maintaining adult',
  html: `<p class="govuk-body">A maintaining adult is any other person who is responsible for maintaining the child. For example, the other person could be one of the following:</p>
<ul class="govuk-list govuk-list--bullet">
  <li>a parent or guardian who gives your client financial support</li>
  <li>anyone who contributes substantially to your client's maintenance</li>
</ul>`,
})

export const howToAggregatePageContent = eligibilityQuestionPageLayout({
  continueButtonText: 'Continue',
  questionBlocks: [
    GovUKPanel({
      titleText: TITLE,
      headingLevel: 2, // eslint-disable-line @typescript-eslint/no-magic-numbers -- The page title uses an H2 heading.
      text: "If your client's means are aggregated with the means of another person, such as a maintaining adult, they must have a full means test.",
    }),
    GovUKHeading({
      text: 'What happens next',
      size: 's',
      level: 2, // eslint-disable-line @typescript-eslint/no-magic-numbers -- The subheading uses an H2 heading.
    }),
    GovUKBody({
      text: "For all questions that refer to 'your client' or 'the client', such as if your client has dependants or owns the home they live in, answer them with reference to both your client and the maintaining adult.",
    }),
    GovUKBody({ text: 'For questions that ask for financial information:' }),
    GovUKList({
      style: 'bullet',
      items: [
        'add any relevant income or spending amounts for your client to those of the maintaining adult',
        "enter these combined amounts in the relevant fields that refer to 'your client'",
      ],
    }),
    GovUKBody({
      text: `If the maintaining adult has a partner, only include the partner if their finances can be included in the means assessment, as per regulation 16 of <a href="${INDIVIDUAL_RESOURCES_REGULATIONS_URL}" target="_blank" rel="noopener">The Civil Legal Aid (Financial Resources and Payment for Services) Regulations 2013 (opens in new tab)</a>, and:`,
    }),
    GovUKList({
      style: 'bullet',
      items: [
        'answer any partner-related questions as if the maintaining adult is the client',
        'continue to treat the combined income and expenditure of your client and the maintaining adult as that of your client',
      ],
    }),
    maintainingAdultDetails,
  ],
  guidanceBlocks: [controlledWorkGuidanceLink, aggregationGuidanceLink],
})
