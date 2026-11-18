import { Answer, Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock, type BlockDefinition } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKDetails, GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { PROPERTY_OWNERSHIP_OPTIONS } from '../controlledWork/controlledWorkTypes.js'

const SINGLE_QUESTION = 'Does your client own the home they usually live in?'
const PARTNER_QUESTION = 'Does your client or their partner own the home the client usually lives in?'
const QUESTION_HEADING_LEVEL = 2
const PROPERTY_OWNERSHIP_PATTERN = `^(${PROPERTY_OWNERSHIP_OPTIONS.join('|')})$`
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const PARTNER_PRESENT = Answer('partner').match(Condition.Equals('yes'))
const PARTNER_ABSENT = Answer('partner').match(Condition.Equals('no'))
const AWAY_FROM_HOME_SUMMARY = 'Clients who are away from their usual home'

const singleQuestionHeading: BlockDefinition = {
  ...GovUKHeading({ text: SINGLE_QUESTION, size: 'l', level: QUESTION_HEADING_LEVEL }),
  visibleWhen: PARTNER_ABSENT,
}

const partnerQuestionHeading: BlockDefinition = {
  ...GovUKHeading({ text: PARTNER_QUESTION, size: 'l', level: QUESTION_HEADING_LEVEL }),
  visibleWhen: PARTNER_PRESENT,
}

const propertyOptions = [
  { value: 'with_mortgage', text: 'Yes, with a mortgage or loan' },
  { value: 'shared_ownership', text: 'Yes, through a shared ownership scheme' },
  { value: 'outright', text: 'Yes, owned outright' },
  { value: 'none', text: 'No' },
]

const propertyValidation = [
  validation({
    condition: Self().match(Condition.String.MatchesRegex(PROPERTY_OWNERSHIP_PATTERN)),
    message: 'Select if your client owns the home they live in',
  }),
]

const singlePropertyField = GovUKRadioInput({
  code: 'property-owned',
  dependentWhen: PARTNER_ABSENT,
  fieldset: { legend: { text: SINGLE_QUESTION, classes: 'govuk-visually-hidden' } },
  items: propertyOptions,
  validWhen: propertyValidation,
})

const partnerPropertyField = GovUKRadioInput({
  code: 'property-owned',
  dependentWhen: PARTNER_PRESENT,
  fieldset: { legend: { text: PARTNER_QUESTION, classes: 'govuk-visually-hidden' } },
  items: propertyOptions,
  validWhen: propertyValidation,
})

const singleAwayFromHomeDetails: BlockDefinition = {
  ...GovUKDetails({
    summaryText: AWAY_FROM_HOME_SUMMARY,
    html: `<p>Select yes if your client is temporarily away from the home they own and usually live in.</p>
<p>If they have temporarily left this home due to domestic abuse, selecting yes ensures the equity disregard is applied.</p>`,
  }),
  visibleWhen: PARTNER_ABSENT,
}

const partnerAwayFromHomeDetails: BlockDefinition = {
  ...GovUKDetails({
    summaryText: AWAY_FROM_HOME_SUMMARY,
    html: `<p>Select yes if your client or their partner owns the home the client usually lives in, but the client is temporarily away from this home.</p>
<p>If they have temporarily left this home due to domestic abuse, selecting yes ensures the equity disregard is applied.</p>`,
  }),
  visibleWhen: PARTNER_PRESENT,
}

const partnerInPrisonDetails: BlockDefinition = {
  ...GovUKDetails({
    summaryText: 'Clients in prison',
    html: '<p>If your client is in prison but their partner lives in a property either of them owns, include this as the main dwelling and any housing costs the partner pays.</p>',
  }),
  visibleWhen: PARTNER_PRESENT,
}

export const propertyGuidanceLinks = [
  ['Properties (PDF, 599KB)', `${CONTROLLED_WORK_GUIDANCE_URL}#page=36`],
  ['Equity disregard for domestic abuse (PDF, 599KB)', `${CONTROLLED_WORK_GUIDANCE_URL}#page=42`],
  ['Trapped capital (PDF, 599KB)', `${CONTROLLED_WORK_GUIDANCE_URL}#page=26`],
].map(([label, href]) =>
  HtmlBlock({
    tag: 'a',
    classes: 'govuk-link',
    attributes: { href: [href], target: ['_blank'], rel: ['noreferrer noopener'] },
    content: label,
  }),
)

export const propertyPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    singleQuestionHeading,
    partnerQuestionHeading,
    singleAwayFromHomeDetails,
    partnerAwayFromHomeDetails,
    partnerInPrisonDetails,
    singlePropertyField,
    partnerPropertyField,
  ],
  guidanceBlocks: propertyGuidanceLinks,
})

export const propertyQuestionFields = {
  single: singlePropertyField,
  partner: partnerPropertyField,
}
