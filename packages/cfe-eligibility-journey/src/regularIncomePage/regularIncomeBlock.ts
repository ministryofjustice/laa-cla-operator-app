import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading, GovUKList, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = 'Does your client get regular income?'
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'

export const regularIncomeField = GovUKRadioInput({
  code: 'regular-income',
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
      message: 'Select yes if your client gets regular income',
    }),
  ],
})

const incomeGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=49`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Income (PDF, 599KB)',
})

export const regularIncomePageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    GovUKBody({
      text: 'For example, payment from a full time job or local authority financial support for a care leaver. If they get regular income, they must have a full means test.',
    }),
    GovUKBody({ text: 'Do not include:' }),
    GovUKList({
      style: 'bullet',
      items: [
        'part-time earnings (less than 16 hours per week)',
        'holiday jobs',
        'pocket money',
        'any maintenance paid for the child',
      ],
    }),
    regularIncomeField,
  ],
  guidanceBlocks: [
    HtmlBlock({
      tag: 'a',
      classes: 'govuk-link',
      attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
      content: 'Controlled work (PDF, 599KB)',
    }),
    incomeGuidanceLink,
  ],
})
