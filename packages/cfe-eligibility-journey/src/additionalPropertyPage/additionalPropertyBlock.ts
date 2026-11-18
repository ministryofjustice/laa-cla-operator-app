import { Answer, Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock, type BlockDefinition } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { PROPERTY_OWNERSHIP_OPTIONS } from '../controlledWork/controlledWorkTypes.js'
import { propertyOwnershipOptions } from '../propertyPage/propertyBlock.js'

const QUESTION = 'Does your client own any other property, a holiday home or land?'
const QUESTION_HEADING_LEVEL = 2
const PROPERTY_OWNERSHIP_PATTERN = `^(${PROPERTY_OWNERSHIP_OPTIONS.join('|')})$`
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const PARTNER_PRESENT = Answer('partner').match(Condition.Equals('yes'))
const IMMIGRATION_OR_ASYLUM_NOT_APPLICABLE = Answer('immigration-or-asylum').match(Condition.Equals('no'))

const additionalPropertyHeading = GovUKHeading({
  text: QUESTION,
  size: 'l',
  level: QUESTION_HEADING_LEVEL,
})

const additionalPropertyHint = GovUKBody({
  text: 'This can be the sole property owned if not the home the client lives in, even if the property is abroad or not providing an income.',
})

const partnerAdditionalPropertyHint: BlockDefinition = {
  ...GovUKBody({
    text: 'If your client and their partner share other property, a holiday home or land, include this here.',
  }),
  visibleWhen: PARTNER_PRESENT,
}

export const additionalPropertyField = GovUKRadioInput({
  code: 'additional-property-owned',
  fieldset: {
    legend: {
      text: QUESTION,
      classes: 'govuk-visually-hidden',
    },
  },
  items: propertyOwnershipOptions,
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex(PROPERTY_OWNERSHIP_PATTERN)),
      message: 'Select if your client owns any other property',
    }),
  ],
})

const additionalPropertyGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=36`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: "Properties owned that are not the 'main house' (PDF, 599KB)",
})

const trappedCapitalGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=26`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Trapped capital (PDF, 599KB)',
})

const subjectMatterOfDisputeGuidanceLink: BlockDefinition = {
  ...HtmlBlock({
    tag: 'a',
    classes: 'govuk-link',
    attributes: {
      href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=37`],
      target: ['_blank'],
      rel: ['noreferrer noopener'],
    },
    content: 'Subject matter of dispute (PDF, 599KB)',
  }),
  visibleWhen: IMMIGRATION_OR_ASYLUM_NOT_APPLICABLE,
}

export const additionalPropertyPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    additionalPropertyHeading,
    additionalPropertyHint,
    partnerAdditionalPropertyHint,
    additionalPropertyField,
  ],
  guidanceBlocks: [
    additionalPropertyGuidanceLink,
    trappedCapitalGuidanceLink,
    subjectMatterOfDisputeGuidanceLink,
  ],
})
