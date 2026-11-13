import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKDetails, GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const TITLE = 'Tell us about your client'
const PARTNER_QUESTION = 'Does your client have a partner?'
const PASSPORTING_QUESTION = 'Does your client receive a passporting benefit?'
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'

export const partnerField = GovUKRadioInput({
  code: 'partner',
  fieldset: { legend: { text: PARTNER_QUESTION } },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if the client has a partner',
    }),
  ],
})

export const passportingField = GovUKRadioInput({
  code: 'passporting',
  fieldset: { legend: { text: PASSPORTING_QUESTION } },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message:
        "Select yes if your client receives a passporting benefit or if they are named on their partner's passporting benefit",
    }),
  ],
})

const partnerDetails = GovUKDetails({
  summaryText: 'Help with definition of a partner',
  html: `<p class="govuk-hint">A partner is someone your client is:</p>
<ul class="govuk-list govuk-list--bullet">
  <li class="govuk-hint">married to</li>
  <li class="govuk-hint">in a civil partnership with</li>
  <li class="govuk-hint">living with as if they are married or in a civil partnership, or living separately due to financial or practical reasons, for example one of them is in prison, getting hospital care, or another reason</li>
</ul>
<p class="govuk-hint">Do not include anyone who:</p>
<ul class="govuk-list govuk-list--bullet">
  <li class="govuk-hint">is separated from the client in a way that is likely to be permanent</li>
  <li class="govuk-hint">is an opponent in the case</li>
  <li class="govuk-hint">has a contrary interest in the case - this means they want a different outcome to your client</li>
</ul>`,
})

const passportingDetails = GovUKDetails({
  summaryText: 'Help with passporting benefits',
  html: `<p class="govuk-hint">They will not need an income assessment if they receive any of these passporting benefits:</p>
<ul class="govuk-list govuk-list--bullet">
  <li class="govuk-hint">Universal Credit</li>
  <li class="govuk-hint">Income Support</li>
  <li class="govuk-hint">income-based Jobseeker's Allowance (JSA)</li>
  <li class="govuk-hint">income-related Employment and Support Allowance (ESA)</li>
  <li class="govuk-hint">Guarantee Credit element of Pension Credit</li>
</ul>
<p class="govuk-hint">Also select yes if your client is named on their partner's passporting benefit claim.</p>`,
})

const passportingGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=12`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Passporting (PDF, 599KB)',
})

export const applicantPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({
      text: TITLE,
      size: 'l',
      level: 2, // eslint-disable-line @typescript-eslint/no-magic-numbers -- The page title uses an H2 heading.
    }),
    partnerField,
    partnerDetails,
    passportingField,
    passportingDetails,
  ],
  guidanceBlocks: [passportingGuidanceLink],
})
