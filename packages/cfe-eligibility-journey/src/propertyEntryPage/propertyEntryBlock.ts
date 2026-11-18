import { Answer, Condition, Conditional, Self, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import {
  GovUKBody,
  GovUKCheckboxInput,
  GovUKDetails,
  GovUKHeading,
  GovUKTextInput,
  GovUKUtilityClasses,
} from '@ministryofjustice/hmpps-forge/govuk-components'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { moneyConditions, ZERO } from '../moneyFieldHelpers.js'
import { propertyGuidanceLinks } from '../propertyPage/propertyBlock.js'
import { isPropertyEntryNumberOrEmpty, parsePropertyEntryNumber } from '../controlledWork/propertyEntryAnswers.js'

const QUESTION = 'The home your client usually lives in'
const MINIMUM_PERCENTAGE = 1
const MAXIMUM_PERCENTAGE = 100
const PARTNER_PRESENT = Answer('partner').match(Condition.Equals('yes'))
const PARTNER_ABSENT = Answer('partner').match(Condition.Equals('no'))
const PROPERTY_MORTGAGE_APPLIES = Answer('property-owned').match(
  Condition.String.MatchesRegex('^(with_mortgage|shared_ownership)$'),
)
const SUBJECT_MATTER_OF_DISPUTE_APPLIES = Answer('immigration-or-asylum').match(Condition.Equals('no'))
const QUESTION_HEADING_LEVEL = 2
const PROPERTY_VALUE_HINT =
  'You can use property websites to find the estimated value. If you have more than one valuation, use the highest. Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.'
const MORTGAGE_HINT = 'Check the statement from the mortgage provider or lender and include any other loans secured against the property.'
const PARTNER_PERCENTAGE_HINT =
  'Add the percentage the client and partner own together. We do not need to know what percentage each of them owns.'

const isValidNumber = moneyConditions.register(
  'IsValidPropertyEntryNumber',
  () => (value) => isPropertyEntryNumberOrEmpty(value),
)
const positiveAmount = moneyConditions.register(
  'IsPositivePropertyEntryAmount',
  () => (value) => {
    if (value === undefined || value === null || value === '') return true
    const parsed = parsePropertyEntryNumber(value)
    return parsed === undefined || parsed > ZERO
  },
)
const wholePercentage = moneyConditions.register(
  'IsWholePropertyEntryPercentage',
  () => (value) => {
    if (value === undefined || value === null || value === '') return true
    const parsed = parsePropertyEntryNumber(value)
    return parsed === undefined || Number.isInteger(parsed)
  },
)
const percentageWithinRange = moneyConditions.register(
  'IsPropertyEntryPercentageWithinRange',
  () => (value) => {
    if (value === undefined || value === null || value === '') return true
    const parsed = parsePropertyEntryNumber(value)
    return parsed === undefined || (parsed >= MINIMUM_PERCENTAGE && parsed <= MAXIMUM_PERCENTAGE)
  },
)

const homeValueField = GovUKTextInput({
  code: 'house_value',
  label: { text: 'Home value', classes: 'govuk-label--m' },
  hint: { text: PROPERTY_VALUE_HINT },
  inputType: 'text' as const,
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter how much the home they live in is worth',
    }),
    validation({
      condition: Self().match(isValidNumber()),
      message: "How much your client's home is worth must be a number",
    }),
    validation({
      condition: Self().match(positiveAmount()),
      message: "Your client's home must be worth more than 0",
    }),
  ],
})

const mortgageField = GovUKTextInput({
  code: 'mortgage',
  label: { text: 'How much is left to pay on the mortgage?', classes: 'govuk-label--m' },
  hint: { text: MORTGAGE_HINT },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  visibleWhen: PROPERTY_MORTGAGE_APPLIES,
  dependentWhen: PROPERTY_MORTGAGE_APPLIES,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter how much is left to pay on the mortgage',
    }),
    validation({
      condition: Self().match(isValidNumber()),
      message: 'The amount left to pay on the mortgage must be a number',
    }),
    validation({
      condition: Self().match(positiveAmount()),
      message: 'The amount left to pay on the mortgage must be more than 0',
    }),
  ],
})

const percentageOwnedFieldConfiguration = {
  code: 'percentage_owned',
  label: { text: 'What percentage of the home do they own?', classes: 'govuk-label--m' },
  inputType: 'text' as const,
  attributes: { inputmode: 'numeric' },
  suffix: { text: '%' },
  classes: GovUKUtilityClasses.Input.Width3,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the percentage share that they own of the home',
    }),
    validation({
      condition: Self().match(isValidNumber()),
      message: 'The percentage that they own of the home must be a number between 1 and 100',
    }),
    validation({
      condition: Self().match(wholePercentage()),
      message: 'The percentage that they own of the home must be a whole number',
    }),
    validation({
      condition: Self().match(percentageWithinRange()),
      message: 'The percentage that they own of the home must be between 1 and 100',
    }),
  ],
}

const singlePercentageOwnedField = GovUKTextInput({
  ...percentageOwnedFieldConfiguration,
  dependentWhen: PARTNER_ABSENT,
})

const partnerPercentageOwnedField = GovUKTextInput({
  ...percentageOwnedFieldConfiguration,
  hint: { text: PARTNER_PERCENTAGE_HINT },
  dependentWhen: PARTNER_PRESENT,
})

const houseInDisputeField = GovUKCheckboxInput({
  code: 'house_in_dispute',
  visibleWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  dependentWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  items: [
    {
      value: 'yes',
      text: 'This asset is a subject matter of dispute',
      checked: Answer('house_in_dispute').match(Condition.Equals('yes')),
    },
  ],
})

const propertyEntryHeading = GovUKHeading({
  text: QUESTION,
  size: 'l',
  level: QUESTION_HEADING_LEVEL,
})

const propertyEntryHint = GovUKBody({
  text: Conditional({
    when: PARTNER_PRESENT,
    then: 'Your client or their partner’s name must be on the property deeds, lease, freehold or mortgage.',
    else: "Your client's name must be on the property deeds, lease, freehold or mortgage.",
  }),
})

export const subjectMatterOfDisputeDetails = {
  ...GovUKDetails({
    summaryText: 'Help with subject matter of dispute',
    html: '<p>Any asset owned or partially owned by your client that is the subject of a claim by their opponent in a case is the subject matter of dispute.</p><p>These assets will be disregarded from the calculation, up to a total of £100,000. See Regulation 38 of The Civil Legal Aid (Financial Resources and Payment for Services) Regulations 2013 for more information.</p>',
  }),
  visibleWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  dependentWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
}

export const propertyEntryPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    propertyEntryHeading,
    propertyEntryHint,
    homeValueField,
    mortgageField,
    singlePercentageOwnedField,
    partnerPercentageOwnedField,
    houseInDisputeField,
    subjectMatterOfDisputeDetails,
  ],
  guidanceBlocks: propertyGuidanceLinks,
})

export const propertyEntryFields = {
  homeValue: homeValueField,
  mortgage: mortgageField,
  singlePercentageOwned: singlePercentageOwnedField,
  partnerPercentageOwned: partnerPercentageOwnedField,
  houseInDispute: houseInDisputeField,
}
