import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { propertyGuidanceLinks } from '../propertyPage/propertyBlock.js'

const QUESTION = 'Is the landlord the only other joint-owner?'

export const propertyLandlordField = GovUKRadioInput({
  code: 'property-landlord',
  fieldset: { legend: { text: QUESTION, classes: 'govuk-visually-hidden' } },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if the landlord is the only other joint-owner',
    }),
  ],
})

export const propertyLandlordPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    propertyLandlordField,
  ],
  guidanceBlocks: propertyGuidanceLinks,
})
