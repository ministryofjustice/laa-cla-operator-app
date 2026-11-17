import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = 'Does your client get any non-passporting benefits?'
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const DISREGARDED_BENEFITS_GUIDANCE_URL = `${CONTROLLED_WORK_GUIDANCE_URL}#page=15`
const BENEFITS_HINT =
  `For example, Child Benefit, tax credits or asylum support payments. <a class="govuk-link" href="${DISREGARDED_BENEFITS_GUIDANCE_URL}" target="_blank" rel="noreferrer noopener">Check the guidance (PDF, 599KB)</a> to find out which benefits you do not need to tell us about for this question, for example:`

export const receivesBenefitsField = GovUKRadioInput({
  code: 'receives-benefits',
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
      message: 'Select yes if your client gets any benefits',
    }),
  ],
})

const disregardedBenefitsGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [DISREGARDED_BENEFITS_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Disregarded benefits (PDF, 599KB)',
})

export const controlledWorkBenefitsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    HtmlBlock({
      tag: 'p',
      classes: 'govuk-body',
      content: BENEFITS_HINT,
    }),
    HtmlBlock({
      tag: 'ul',
      classes: 'govuk-list govuk-list--bullet',
      content: `<li>Housing Benefit</li>
<li>State Pension</li>
<li>Personal Independence Payment (PIP)</li>
<li>Carer’s Allowance</li>
<li>Community Care direct payments</li>
<li>Fostering allowance</li>
<li>Cost of Living Payments</li>`,
    }),
    receivesBenefitsField,
  ],
  guidanceBlocks: [disregardedBenefitsGuidanceLink],
})
