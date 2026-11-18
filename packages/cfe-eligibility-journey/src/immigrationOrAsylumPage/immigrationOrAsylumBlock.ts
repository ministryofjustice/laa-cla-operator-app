import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKRadioInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = 'Is this an immigration or asylum matter?'

const immigrationOrAsylumHeading = GovUKHeading({
  text: QUESTION,
  size: 'l',
  level: 2, // eslint-disable-line @typescript-eslint/no-magic-numbers -- The user requested an H2 question heading.
})

export const immigrationOrAsylumField = GovUKRadioInput({
  code: 'immigration-or-asylum',
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
      message: 'Select yes if this is an immigration or asylum matter',
    }),
  ],
})

const controlledWorkGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [
      'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf',
    ],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Controlled work (PDF, 599KB)',
})

export const immigrationOrAsylumPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [immigrationOrAsylumHeading, immigrationOrAsylumField],
  guidanceBlocks: [controlledWorkGuidanceLink],
})
