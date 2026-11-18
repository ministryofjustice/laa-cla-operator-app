import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKDetails, GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = 'Does your client get Asylum Support?'
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const EVIDENCE_GUIDANCE_URL = `${CONTROLLED_WORK_GUIDANCE_URL}#page=54`

export const asylumSupportField = GovUKRadioInput({
  code: 'asylum-support',
  fieldset: {
    legend: {
      text: QUESTION,
      classes: 'govuk-visually-hidden',
    },
  },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No, continue with the means check' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select if your client receives section 4 or section 95 Asylum Support',
    }),
  ],
})

const evidenceDetails = GovUKDetails({
  summaryText: 'If your client does not have evidence of Asylum Support',
  html: `<div id="asylum_support_details_controlled">If your client does not have\u00a0<a href="${EVIDENCE_GUIDANCE_URL}" target="_blank" rel="noreferrer noopener">evidence (PDF, 599KB)</a>, consider answering no to this question instead of waiting. They are likely to pass the means test and be eligible for legal aid if you complete a full means check.</div>`,
})

const asylumSupportGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=7`], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Asylum Support (PDF, 599KB)',
})

const controlledWorkGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Controlled work (PDF, 599KB)',
})

export const asylumSupportPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    GovUKBody({
      text: 'This means Asylum Support as defined in Section 4 or Section 95 of the Immigration and Asylum Act 1999.',
    }),
    GovUKBody({
      text: 'Your client will not need an income or capital assessment if they receive this type of Asylum Support.',
    }),
    GovUKBody({
      text: "Also select yes if your client is named in their partner's Asylum Support claim.",
    }),
    evidenceDetails,
    asylumSupportField,
  ],
  guidanceBlocks: [asylumSupportGuidanceLink, controlledWorkGuidanceLink],
})
