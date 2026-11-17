import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = 'Does your client get any non-passporting benefits?'
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'

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

const controlledWorkGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Controlled work (PDF, 599KB)',
})

export const controlledWorkBenefitsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    GovUKBody({ text: 'Examples include Child Benefit, tax credits and Asylum Support payments.' }),
    GovUKBody({
      text: 'Do not include Housing Benefit, State Pension, PIP, Carer’s Allowance, Community Care direct payments, Fostering allowance or Cost of Living Payments.',
    }),
    receivesBenefitsField,
  ],
  guidanceBlocks: [controlledWorkGuidanceLink],
})
