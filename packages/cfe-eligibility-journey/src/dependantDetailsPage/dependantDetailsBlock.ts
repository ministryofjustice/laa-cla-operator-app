import { Answer, Conditional, Condition, Self, validation, or } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import {
  GovUKDetails,
  GovUKHeading,
  GovUKRadioInput,
  GovUKTextInput,
  GovUKUtilityClasses,
  GovUKWarningText,
} from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'

const DEPENDANT_INCOME_LIMIT = '£381.86'
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const HAS_PARTNER = Answer('partner').match(Condition.Equals('yes'))
const HAS_CHILD_DEPENDANTS = Answer('child-dependants').match(Condition.Equals('yes'))
const HAS_ADULT_DEPENDANTS = Answer('adult-dependants').match(Condition.Equals('yes'))

const NUMBER_PATTERN = '^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)$'
const INTEGER_PATTERN = '^[+-]?\\d+$'
const POSITIVE_INTEGER_PATTERN = '^\\+?\\d*[1-9]\\d*$'

/**
 * Builds the CCQ count validation while avoiding irrelevant errors for a hidden or empty field.
 * @param {string} answerCode The Yes/No answer that controls the count
 * @param {'child' | 'adult'} dependantType The dependant category used in the required message
 * @param {'Child' | 'Adult'} displayName The capitalized category used in format and range errors
 * @returns {ReturnType<typeof validation>[]} The field validation rules
 */
function dependantCountValidations(
  answerCode: 'child-dependants' | 'adult-dependants',
  dependantType: 'child' | 'adult',
  displayName: 'Child' | 'Adult',
): Array<ReturnType<typeof validation>> {
  const isNotSelected = Answer(answerCode).not.match(Condition.Equals('yes'))
  const isRequired = Self().match(Condition.IsRequired())
  const isNotRequired = Self().not.match(Condition.IsRequired())
  const isNumber = Self().match(Condition.String.MatchesRegex(NUMBER_PATTERN))
  const isNotNumber = Self().not.match(Condition.String.MatchesRegex(NUMBER_PATTERN))
  const isInteger = Self().match(Condition.String.MatchesRegex(INTEGER_PATTERN))
  const isNotInteger = Self().not.match(Condition.String.MatchesRegex(INTEGER_PATTERN))
  const isPositiveInteger = Self().match(Condition.String.MatchesRegex(POSITIVE_INTEGER_PATTERN))

  return [
    validation({
      condition: or(isNotSelected, isRequired),
      message: `Enter the number of ${dependantType} dependants`,
    }),
    validation({
      condition: or(isNotSelected, isNotRequired, isNumber),
      message: `${displayName} dependants must be a number`,
    }),
    validation({
      condition: or(isNotSelected, isNotRequired, isNotNumber, isInteger),
      message: `${displayName} dependants must be a whole number`,
    }),
    validation({
      condition: or(isNotSelected, isNotRequired, isNotInteger, isPositiveInteger),
      message: `The number of ${dependantType} dependants must be greater than zero`,
    }),
  ]
}

const title = Conditional({
  when: HAS_PARTNER,
  then: "Tell us about your client and their partner's dependants",
  else: "Tell us about your client's dependants",
})

export const childDependantsField = GovUKRadioInput({
  code: 'child-dependants',
  fieldset: {
    legend: {
      text: Conditional({
        when: HAS_PARTNER,
        then: 'Does your client or their partner have any child dependants?',
        else: 'Does your client have any child dependants?',
      }),
    },
  },
  items: [
    { value: 'yes', text: 'Yes', hint: { text: 'If yes, enter a number', classes: 'govuk-visually-hidden' } },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if your client has child dependants',
    }),
  ],
})

export const childDependantsCountField = GovUKTextInput({
  code: 'child-dependants-count',
  label: 'How many child dependants are there?',
  inputType: 'text',
  classes: GovUKUtilityClasses.Input.Width5,
  visibleWhen: HAS_CHILD_DEPENDANTS,
  validWhen: dependantCountValidations('child-dependants', 'child', 'Child'),
})

const childDependantsDetails = GovUKDetails({
  summaryText: 'What we mean by child dependants',
  html: Conditional({
    when: HAS_PARTNER,
    then: `<p class="govuk-text">A child dependant is one who lives with your client and depends on them or their partner for financial support. For example, your client’s or their partner’s child or another child relative who lives in their household.</p>
<p class="govuk-text">A child dependant must be either under school leaving age, in full-time education, or undergoing training for a trade, profession or vocation.</p>
<p class="govuk-text">Do not include:</p>
<ul class="govuk-list govuk-list--bullet">
  <li>foster children (where the fostering allowance for that child has been wholly disregarded from gross income)</li>
  <li>any child with ${DEPENDANT_INCOME_LIMIT} or more income every month (any income below this can be entered on the following pages and will be deducted from the dependant allowance)</li>
</ul>`,
    else: `<p class="govuk-text">A child dependant is one who lives with your client and depends on them for financial support. For example, your client’s child or another child relative who lives in their household.</p>
<p class="govuk-text">A child dependant must be either under school leaving age, in full-time education, or undergoing training for a trade, profession or vocation.</p>
<p class="govuk-text">Do not include:</p>
<ul class="govuk-list govuk-list--bullet">
  <li>foster children (where the fostering allowance for that child has been wholly disregarded from gross income)</li>
  <li>any child with ${DEPENDANT_INCOME_LIMIT} or more income every month (any income below this can be entered on the following pages and will be deducted from the dependant allowance)</li>
</ul>`,
  }),
})

export const adultDependantsField = GovUKRadioInput({
  code: 'adult-dependants',
  fieldset: {
    legend: {
      text: Conditional({
        when: HAS_PARTNER,
        then: 'Does your client or their partner have any adult dependants?',
        else: 'Does your client have any adult dependants?',
      }),
    },
  },
  items: [
    { value: 'yes', text: 'Yes', hint: { text: 'If yes, enter a number', classes: 'govuk-visually-hidden' } },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex('^(yes|no)$')),
      message: 'Select yes if your client has adult dependants',
    }),
  ],
})

export const adultDependantsCountField = GovUKTextInput({
  code: 'adult-dependants-count',
  label: 'How many adult dependants are there?',
  inputType: 'text',
  classes: GovUKUtilityClasses.Input.Width5,
  visibleWhen: HAS_ADULT_DEPENDANTS,
  validWhen: dependantCountValidations('adult-dependants', 'adult', 'Adult'),
})

const adultDependantsDetails = GovUKDetails({
  summaryText: 'What we mean by adult dependants',
  html: Conditional({
    when: HAS_PARTNER,
    then: `<p class="govuk-text">An adult dependant is any adult relative who lives in the same household and is financially dependant on your client or their partner.</p>
<p class="govuk-text">Do not include:</p>
<ul class="govuk-list govuk-list--bullet">
  <li>anyone who owns any property, vehicles or other assets valued at over £8,000 in total</li>
  <li>anyone with ${DEPENDANT_INCOME_LIMIT} or more income every month (any income below this can be entered on the following pages and will be deducted from the dependant allowance)</li>
</ul>`,
    else: `<p class="govuk-text">An adult dependant is any adult relative who lives in the same household and is financially dependant on your client.</p>
<p class="govuk-text">Do not include:</p>
<ul class="govuk-list govuk-list--bullet">
  <li>anyone who owns any property, vehicles or other assets valued at over £8,000 in total</li>
  <li>anyone with ${DEPENDANT_INCOME_LIMIT} or more income every month (any income below this can be entered on the following pages and will be deducted from the dependant allowance)</li>
</ul>`,
  }),
})

const dependantsGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${GUIDANCE_URL}#page=22`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Dependants (PDF, 599KB)',
})

export const dependantDetailsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    GovUKHeading({ text: title, size: 'l', level: 2 }), // eslint-disable-line @typescript-eslint/no-magic-numbers -- The page title uses an H2 heading.
    GovUKWarningText({ text: `Do not include any dependants with ${DEPENDANT_INCOME_LIMIT} or more income every month` }),
    childDependantsField,
    childDependantsDetails,
    childDependantsCountField,
    adultDependantsField,
    adultDependantsDetails,
    adultDependantsCountField,
  ],
  guidanceBlocks: [dependantsGuidanceLink],
})
