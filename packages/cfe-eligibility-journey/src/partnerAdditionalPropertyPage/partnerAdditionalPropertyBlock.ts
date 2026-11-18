import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKBody, GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { PROPERTY_OWNERSHIP_OPTIONS } from '../controlledWork/controlledWorkTypes.js'
import { additionalPropertyGuidanceLinks } from '../additionalPropertyPage/additionalPropertyBlock.js'
import { propertyOwnershipOptions } from '../propertyPage/propertyBlock.js'

const QUESTION = 'Does the partner own any other property, a holiday home or land?'
const QUESTION_HEADING_LEVEL = 2
const PROPERTY_OWNERSHIP_PATTERN = `^(${PROPERTY_OWNERSHIP_OPTIONS.join('|')})$`

const partnerAdditionalPropertyHeading = GovUKHeading({
  text: QUESTION,
  size: 'l',
  level: QUESTION_HEADING_LEVEL,
})

const partnerAdditionalPropertyHints = [
  GovUKBody({
    text: 'This can be the sole property owned if not the home the client lives in, even if the property is abroad or not providing an income.',
  }),
  GovUKBody({
    text: 'Do not include any property or land already entered for your client.',
  }),
]

export const partnerAdditionalPropertyField = GovUKRadioInput({
  code: 'partner-additional-property-owned',
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
      message: 'Select if the partner owns any other property',
    }),
  ],
})

export const partnerAdditionalPropertyPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    partnerAdditionalPropertyHeading,
    ...partnerAdditionalPropertyHints,
    partnerAdditionalPropertyField,
  ],
  guidanceBlocks: additionalPropertyGuidanceLinks,
})
