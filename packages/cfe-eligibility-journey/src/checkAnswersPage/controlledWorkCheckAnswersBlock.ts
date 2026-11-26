import { Answer, Condition, Data, Format, Item, Iterator as ForgeIterator, Literal, Loop, or, Params } from '@ministryofjustice/hmpps-forge/core/authoring'
import { CollectionBlock, type ResolvableString } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKHeading, GovUKSummaryList } from '@ministryofjustice/hmpps-forge/govuk-components'
import { CONTROLLED_WORK_DATA_KEYS } from '../controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEPS } from '../controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS, type ControlledWorkStepCode } from '../controlledWork/controlledWorkTypes.js'
import {
  CONTROLLED_WORK_CHECK_ANSWER_LABELS,
  CONTROLLED_WORK_CHECK_INTERNAL_ANSWER_CODES,
  CONTROLLED_WORK_CHECK_STEP_TITLES,
  formatControlledWorkAnswer,
  formatControlledWorkRecordValue,
} from './controlledWorkCheckAnswersLabels.js'

export { CONTROLLED_WORK_CHECK_ANSWER_LABELS, CONTROLLED_WORK_CHECK_INTERNAL_ANSWER_CODES }

const SECTION_TITLES = {
  caseDetails: 'Case details / matter and under-18 route',
  clientAndDependants: 'Client and dependant details',
  clientIncome: 'Client income and benefits',
  partnerIncome: 'Partner details and income',
  outgoings: 'Outgoings',
  housing: 'Housing and property',
  assets: 'Client assets and partner assets',
} as const
const SECTION_ORDER = Object.values(SECTION_TITLES)
type SummarySection = (typeof SECTION_ORDER)[number]
type CheckAnswersBlock =
  | ReturnType<typeof GovUKHeading>
  | ReturnType<typeof GovUKSummaryList>
  | ReturnType<typeof CollectionBlock>

const STEP_SECTIONS: Record<ControlledWorkStepCode, SummarySection> = {
  [STEPS.immigrationOrAsylum]: SECTION_TITLES.caseDetails,
  [STEPS.under18Clr]: SECTION_TITLES.caseDetails,
  [STEPS.aggregatedMeans]: SECTION_TITLES.caseDetails,
  [STEPS.howToAggregate]: SECTION_TITLES.caseDetails,
  [STEPS.regularIncome]: SECTION_TITLES.caseDetails,
  [STEPS.under18Assets]: SECTION_TITLES.caseDetails,
  [STEPS.immigrationOrAsylumType]: SECTION_TITLES.caseDetails,
  [STEPS.asylumSupport]: SECTION_TITLES.caseDetails,
  [STEPS.applicant]: SECTION_TITLES.clientAndDependants,
  [STEPS.dependantDetails]: SECTION_TITLES.clientAndDependants,
  [STEPS.dependantIncome]: SECTION_TITLES.clientAndDependants,
  [STEPS.dependantIncomeDetails]: SECTION_TITLES.clientAndDependants,
  [STEPS.employmentStatus]: SECTION_TITLES.clientIncome,
  [STEPS.income]: SECTION_TITLES.clientIncome,
  [STEPS.benefits]: SECTION_TITLES.clientIncome,
  [STEPS.benefitDetails]: SECTION_TITLES.clientIncome,
  [STEPS.otherIncome]: SECTION_TITLES.clientIncome,
  [STEPS.partnerDetails]: SECTION_TITLES.partnerIncome,
  [STEPS.partnerEmploymentStatus]: SECTION_TITLES.partnerIncome,
  [STEPS.partnerIncome]: SECTION_TITLES.partnerIncome,
  [STEPS.partnerBenefits]: SECTION_TITLES.partnerIncome,
  [STEPS.partnerBenefitDetails]: SECTION_TITLES.partnerIncome,
  [STEPS.partnerOtherIncome]: SECTION_TITLES.partnerIncome,
  [STEPS.outgoings]: SECTION_TITLES.outgoings,
  [STEPS.partnerOutgoings]: SECTION_TITLES.outgoings,
  [STEPS.property]: SECTION_TITLES.housing,
  [STEPS.propertyLandlord]: SECTION_TITLES.housing,
  [STEPS.sharedOwnershipHousingCosts]: SECTION_TITLES.housing,
  [STEPS.mortgageOrLoanPayment]: SECTION_TITLES.housing,
  [STEPS.housingCosts]: SECTION_TITLES.housing,
  [STEPS.propertyEntry]: SECTION_TITLES.housing,
  [STEPS.additionalProperty]: SECTION_TITLES.housing,
  [STEPS.additionalPropertyDetails]: SECTION_TITLES.housing,
  [STEPS.partnerAdditionalProperty]: SECTION_TITLES.housing,
  [STEPS.partnerAdditionalPropertyDetails]: SECTION_TITLES.housing,
  [STEPS.assets]: SECTION_TITLES.assets,
  [STEPS.partnerAssets]: SECTION_TITLES.assets,
}

const FIRST_STEP_INDEX = 0
const SECOND_STEP_INDEX = 1
const INITIAL_SECTION_STEP_COUNT = 2
const SUMMARY_CARD_HEADING_LEVEL = 4
const NO_ROWS = 0

interface CheckAnswerField {
  code: string
  label: string
  format?: 'choice' | 'currency' | 'frequency' | 'yes-no'
}

/**
 * Builds the change-loop URL for a controlled-work page.
 * @param {ControlledWorkStepCode} stepCode The page to return to
 * @returns {ResolvableString} The change URL expression
 */
function changeHref(stepCode: ControlledWorkStepCode): ResolvableString {
  return Format('/cases/%1/cfe-eligibility/change/%2?change=true', Params('caseId'), Literal(stepCode))
}

/**
 * Builds a summary card for a controlled-work page.
 * @param {ControlledWorkStepCode} stepCode The page whose answers are shown
 * @returns {ReturnType<typeof GovUKSummaryList> | undefined} The summary card, when it has visible answers
 */
function questionSummary(stepCode: ControlledWorkStepCode): ReturnType<typeof GovUKSummaryList> | undefined {
  const definition = CONTROLLED_WORK_STEPS.find((stepDefinition) => stepDefinition.code === stepCode)
  const rows = (definition?.answerCodes ?? []).flatMap((code) => {
    const { [code]: label } = CONTROLLED_WORK_CHECK_ANSWER_LABELS
    if (label === undefined || CONTROLLED_WORK_CHECK_INTERNAL_ANSWER_CODES.has(code)) return []
    return [{
      key: { text: label },
      value: { text: formatControlledWorkAnswer(code) },
      visibleWhen: Answer(code).match(Condition.IsRequired()),
    }]
  })

  if (rows.length === NO_ROWS) return undefined

  return GovUKSummaryList({
    visibleWhen: Literal(stepCode).match(Condition.Array.IsIn(Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps))),
    card: {
      title: { text: CONTROLLED_WORK_CHECK_STEP_TITLES[stepCode], headingLevel: SUMMARY_CARD_HEADING_LEVEL },
      actions: {
        items: [
          {
            href: changeHref(stepCode),
            text: 'Change',
            visuallyHiddenText: Format('Change, %1', Literal(CONTROLLED_WORK_CHECK_STEP_TITLES[stepCode])),
          },
        ],
      },
    },
    rows,
  })
}

/**
 * Builds the heading and ordered summary cards for one assessment section.
 * @param {SummarySection} section The section to build
 * @returns {CheckAnswersBlock[]} The section's heading and answer cards
 */
function sectionBlocks(section: SummarySection): CheckAnswersBlock[] {
  const sectionSteps = CONTROLLED_WORK_STEPS.filter((definition) => STEP_SECTIONS[definition.code] === section)
  const firstStep = sectionSteps.at(FIRST_STEP_INDEX)
  const secondStep = sectionSteps.at(SECOND_STEP_INDEX)
  if (firstStep === undefined || secondStep === undefined) {
    throw new Error(`Expected at least two controlled-work pages in the ${section} section`)
  }
  const firstStepIsApplicable = Literal(firstStep.code).match(
    Condition.Array.IsIn(Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps)),
  )
  const secondStepIsApplicable = Literal(secondStep.code).match(
    Condition.Array.IsIn(Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps)),
  )
  const sectionIsApplicable = sectionSteps
    .slice(INITIAL_SECTION_STEP_COUNT)
    .reduce(
      (combined, { code }) =>
        or(
          combined,
          Literal(code).match(Condition.Array.IsIn(Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps))),
        ),
      or(firstStepIsApplicable, secondStepIsApplicable),
    )
  return [
    GovUKHeading({ text: section, size: 's', visibleWhen: sectionIsApplicable }),
    ...sectionSteps.map(({ code }) => questionSummary(code)).filter((block) => block !== undefined),
  ]
}

/**
 * Builds summary cards for saved repeating rows belonging to a page.
 * @param {ControlledWorkStepCode} stepCode The page that owns the repeating rows
 * @param {string} collectionCode The session-backed collection key
 * @param {string} title The repeating-row card title
 * @param {CheckAnswerField[]} fields The visible fields in each row
 * @returns {ReturnType<typeof CollectionBlock>} The repeating-row summary block
 */
function recordSummary(
  stepCode: ControlledWorkStepCode,
  collectionCode: string,
  title: string,
  fields: CheckAnswerField[],
): ReturnType<typeof CollectionBlock> {
  return CollectionBlock({
    visibleWhen: Literal(stepCode).match(Condition.Array.IsIn(Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps))),
    collection: Data(collectionCode).each(
      ForgeIterator.Map([
        GovUKSummaryList({
          card: {
            title: { text: Format(`${title} %1`, Loop.Index()), headingLevel: SUMMARY_CARD_HEADING_LEVEL },
            actions: {
              items: [
                {
                  href: changeHref(stepCode),
                  text: 'Change',
                  visuallyHiddenText: Format(`Change, ${title} %1`, Loop.Index()),
                },
              ],
            },
          },
          rows: fields.map(({ code, label, format }) => ({
            key: { text: label },
            value: { text: formatControlledWorkRecordValue(Item().path(code), format, code) },
            visibleWhen: Item().path(code).match(Condition.IsRequired()),
          })),
        }),
      ]),
    ),
  })
}

export const controlledWorkCheckAnswersBlocks = [
  GovUKHeading({ text: 'Check your answers', size: 'm' }),
  ...sectionBlocks(SECTION_TITLES.caseDetails),
  ...sectionBlocks(SECTION_TITLES.clientAndDependants),
  recordSummary(STEPS.dependantIncomeDetails, CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection, 'Dependant income', [
    { code: 'amount', label: 'Income', format: 'currency' },
    { code: 'frequency', label: 'When does the dependant normally get this income?', format: 'frequency' },
  ]),
  ...sectionBlocks(SECTION_TITLES.clientIncome),
  recordSummary(STEPS.income, CONTROLLED_WORK_DATA_KEYS.incomeCollection, 'Employment income', [
    { code: 'income_type', label: 'What type of employment income is this?', format: 'choice' },
    { code: 'income_frequency', label: 'When does your client normally get this income?', format: 'frequency' },
    { code: 'gross_income', label: 'Income before any deductions', format: 'currency' },
    { code: 'income_tax', label: 'Income tax', format: 'currency' },
    { code: 'national_insurance', label: 'National Insurance', format: 'currency' },
  ]),
  recordSummary(STEPS.benefitDetails, CONTROLLED_WORK_DATA_KEYS.benefitCollection, 'Benefit', [
    { code: 'benefit_type', label: 'Benefit name' },
    { code: 'benefit_amount', label: 'Benefit amount', format: 'currency' },
    { code: 'benefit_frequency', label: 'When does your client normally get this benefit?', format: 'frequency' },
  ]),
  ...sectionBlocks(SECTION_TITLES.partnerIncome),
  recordSummary(STEPS.partnerIncome, CONTROLLED_WORK_DATA_KEYS.partnerIncomeCollection, 'Employment income', [
    { code: 'partner_income_type', label: 'What type of employment income is this?', format: 'choice' },
    { code: 'partner_income_frequency', label: 'When does the partner normally get this income?', format: 'frequency' },
    { code: 'partner_gross_income', label: 'Income before any deductions', format: 'currency' },
    { code: 'partner_income_tax', label: 'Income tax', format: 'currency' },
    { code: 'partner_national_insurance', label: 'National Insurance', format: 'currency' },
  ]),
  recordSummary(STEPS.partnerBenefitDetails, CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection, 'Partner benefit', [
    { code: 'benefit_type', label: 'Benefit name' },
    { code: 'benefit_amount', label: 'Benefit amount', format: 'currency' },
    { code: 'benefit_frequency', label: 'When does the partner normally get this benefit?', format: 'frequency' },
  ]),
  ...sectionBlocks(SECTION_TITLES.outgoings),
  ...sectionBlocks(SECTION_TITLES.housing),
  recordSummary(STEPS.additionalPropertyDetails, CONTROLLED_WORK_DATA_KEYS.additionalPropertyCollection, 'Additional property', [
    { code: 'house_value', label: 'How much is the property, holiday home or land worth?', format: 'currency' },
    { code: 'inline_owned_with_mortgage', label: 'Is there an outstanding mortgage on the property, holiday home or land?', format: 'yes-no' },
    { code: 'mortgage', label: 'How much is left to pay on the mortgage?', format: 'currency' },
    { code: 'percentage_owned', label: 'What percentage share does your client own?' },
    { code: 'house_in_dispute', label: 'This asset is a subject matter of dispute', format: 'yes-no' },
  ]),
  recordSummary(
    STEPS.partnerAdditionalPropertyDetails,
    CONTROLLED_WORK_DATA_KEYS.partnerAdditionalPropertyCollection,
    'Partner additional property',
    [
      { code: 'house_value', label: 'How much is the property, holiday home or land worth?', format: 'currency' },
      { code: 'inline_owned_with_mortgage', label: 'Is there an outstanding mortgage on the property, holiday home or land?', format: 'yes-no' },
      { code: 'mortgage', label: 'How much is left to pay on the mortgage?', format: 'currency' },
      { code: 'percentage_owned', label: 'What percentage share does your partner own?' },
    ],
  ),
  ...sectionBlocks(SECTION_TITLES.assets),
  recordSummary(STEPS.assets, CONTROLLED_WORK_DATA_KEYS.assetBankAccountCollection, 'Bank account', [
    { code: 'amount', label: 'Total money in bank account', format: 'currency' },
    { code: 'account_in_dispute', label: 'This asset is a subject matter of dispute', format: 'yes-no' },
  ]),
  recordSummary(
    STEPS.partnerAssets,
    CONTROLLED_WORK_DATA_KEYS.partnerAssetBankAccountCollection,
    'Partner bank account',
    [{ code: 'amount', label: 'Total money in bank account', format: 'currency' }],
  ),
]

export const controlledWorkCheckAnswersSummarySections = SECTION_ORDER
