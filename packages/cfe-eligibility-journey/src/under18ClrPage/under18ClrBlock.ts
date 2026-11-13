import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKDetails, GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = 'Is the work controlled legal representation (CLR)?'
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'

export const under18ClrField = GovUKRadioInput({
  code: 'controlled-legal-representation',
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
      message: 'Select yes if the work is controlled legal representation (CLR)',
    }),
  ],
})

const clrDetails = GovUKDetails({
  summaryText: 'Civil controlled legal representation (CLR)',
  html: `<p class="govuk-body">Controlled legal representation (CLR) covers the following, as stated under Regulation 21(2)(e) of the <a href="https://www.legislation.gov.uk/uksi/2012/3098/regulation/21/made" target="_blank" rel="noreferrer noopener">Civil Legal Aid (Procedure) Regulations 2012</a>:</p><p class="govuk-body">(i) the Health, Education and Social Care Chamber of the First-tier Tribunal under the Mental Health Act 1983 or paragraph 5(2) of the Schedule to the Repatriation of Prisoners Act 1984;</p><p class="govuk-body">(ii) the Mental Health Review Tribunal for Wales; or</p><p class="govuk-body">(iii) the Immigration and Asylum Chamber of the First tier Tribunal.</p>`,
})

const controlledWorkGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Controlled work (PDF, 599KB)',
})

const mentalHealthGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [
      'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1143984/Mental_Health_Guidance_-_Contract_management_-_GOV.UK_2023.pdf',
    ],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Mental Health (PDF, 288KB)',
})

const childClrGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=4`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Controlled legal representation (CLR) for child applicants - Controlled work (PDF, 599KB)',
})

export const under18ClrPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }),
    clrDetails,
    under18ClrField,
  ],
  guidanceBlocks: [controlledWorkGuidanceLink, mentalHealthGuidanceLink, childClrGuidanceLink],
})