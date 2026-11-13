import { Condition, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKHeading, GovUKRadioInput } from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const QUESTION = 'What type of immigration or asylum matter is this?'
const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const LEGISLATION_URL = 'https://www.legislation.gov.uk/ukpga/2012/10/schedule/1'

export const immigrationOrAsylumTypeField = GovUKRadioInput({
  code: 'immigration-or-asylum-type',
  fieldset: {
    legend: {
      text: QUESTION,
      classes: 'govuk-visually-hidden',
    },
  },
  hint: {
    html: `Guidance for these matters is in paragraphs 24 to 30, 32(1) and 32A(1) of Part 1 of Schedule 1 to the <a href="${LEGISLATION_URL}" target="_blank" rel="noreferrer noopener">Legal Aid, Sentencing and Punishment of Offenders Act 2012</a> (LASPO).`,
  },
  items: [
    { value: 'immigration_clr', text: 'Immigration - controlled legal representation (CLR) in the First-tier Tribunal' },
    { value: 'immigration_legal_help', text: 'Immigration - legal help or help at court' },
    { value: 'asylum', text: 'Asylum - legal help, help at court, or controlled legal representation (CLR) in the First-tier Tribunal' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(immigration_clr|immigration_legal_help|asylum)$')),
      message: 'Select what type of immigration or asylum matter this is',
    }),
  ],
})

const controlledWorkGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: { href: [CONTROLLED_WORK_GUIDANCE_URL], target: ['_blank'], rel: ['noreferrer noopener'] },
  content: 'Controlled work (PDF, 599KB)',
})

const legacyCaseGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=3`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Legacy case Appeals and Reviews in the Upper Tribunal (PDF, 599KB)',
})

export const immigrationOrAsylumTypePageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: QUESTION, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- Questions use an H2 heading.
    immigrationOrAsylumTypeField,
  ],
  guidanceBlocks: [controlledWorkGuidanceLink, legacyCaseGuidanceLink],
})
