import {
  Answer,
  Condition,
  Conditional,
  Data,
  Format,
  Item,
  Iterator,
  Loop,
  Self,
  Transformer,
  validation,
} from '@ministryofjustice/hmpps-forge/core/authoring'
import { CollectionBlock, HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import {
  GovUKBody,
  GovUKButton,
  GovUKCheckboxInput,
  GovUKDetails,
  GovUKGridRow,
  GovUKHeading,
  GovUKRadioInput,
  GovUKSectionBreak,
  GovUKTextInput,
  GovUKUtilityClasses,
} from '@ministryofjustice/hmpps-forge/govuk-components'
import { CONTROLLED_WORK_DATA_KEYS } from '../controlledWork/controlledWorkEffects.js'
import {
  isAtLeastValuablesThreshold,
  isNonNegativeAssetAmount,
  isPositiveInvestmentAmount,
  isValidAssetAmount,
} from '../controlledWork/assetsAnswers.js'
import { eligibilityQuestionPageLayout } from '../eligibilityQuestionPageLayout.js'
import { moneyConditions } from '../moneyFieldHelpers.js'
import { subjectMatterOfDisputeDetails } from '../propertyEntryPage/propertyEntryBlock.js'

const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const COLLECTION_CODE = CONTROLLED_WORK_DATA_KEYS.assetBankAccountCollection
const HAS_MULTIPLE_ROWS = Data(COLLECTION_CODE)
  .pipe(Transformer.Array.Length())
  .match(Condition.Number.GreaterThan(1))
const ROW_INDEX = Loop.Index()
const AMOUNT_CODE = Format('amount_%1', Loop.Index0())
const DISPUTE_CODE = Format('account_in_dispute_%1', Loop.Index0())
const SUBJECT_MATTER_OF_DISPUTE_APPLIES = Answer('immigration-or-asylum').match(Condition.Equals('no'))
const PARTNER_PRESENT = Answer('partner').match(Condition.Equals('yes'))
const PARTNER_ABSENT = Answer('partner').match(Condition.Equals('no'))
const INVESTMENTS_APPLY = Answer('investments_relevant').match(Condition.Equals('yes'))
const VALUABLES_APPLY = Answer('valuables_relevant').match(Condition.Equals('yes'))
const YES_NO_PATTERN = '^(yes|no)$'

function rowMessage(single: string, multiple: string) {
  return Conditional({
    when: HAS_MULTIPLE_ROWS,
    then: Format(multiple, ROW_INDEX),
    else: single,
  })
}

const isValidAssetAmountCondition = moneyConditions.register(
  'IsValidAssetAmount',
  () => isValidAssetAmount,
)
const isNonNegativeAssetAmountCondition = moneyConditions.register(
  'IsNonNegativeAssetAmount',
  () => isNonNegativeAssetAmount,
)
const isPositiveInvestmentAmountCondition = moneyConditions.register(
  'IsPositiveInvestmentAmount',
  () => isPositiveInvestmentAmount,
)
const isAtLeastValuablesThresholdCondition = moneyConditions.register(
  'IsAtLeastValuablesThreshold',
  () => isAtLeastValuablesThreshold,
)

const assetsHeading = GovUKHeading({ text: 'Client assets', size: 'l', level: 2 })

const partnerHint = {
  ...GovUKBody({
    text: 'If any of these assets are owned by both the client and partner, enter the full value here. Do not enter them again on the partner questions that follow.',
    classes: 'govuk-hint',
  }),
  visibleWhen: Answer('partner').match(Condition.Equals('yes')),
}

const bankruptcyDetails = GovUKDetails({
  summaryText: 'Clients who are bankrupt',
  html: '<p>If your client is bankrupt, any capital assets vested in the trustee in bankruptcy will not be included in the capital assessment.</p>',
})

const bankAccountsHeading = GovUKHeading({ text: 'Money in bank accounts', size: 'm', level: 3 })
const bankAccountExamples = GovUKBody({ text: 'For example:' })
const bankAccountExamplesList = {
  ...HtmlBlock({
    tag: 'ul',
    classes: 'govuk-list govuk-list--bullet',
    content: '<li>current or savings accounts</li><li>ISAs</li><li>child accounts your client is a signatory on</li><li>prison accounts</li>',
  }),
  visibleWhen: PARTNER_ABSENT,
}
const bankAccountExamplesListWithPartner = {
  ...HtmlBlock({
    tag: 'ul',
    classes: 'govuk-list govuk-list--bullet',
    content: '<li>current or savings accounts</li><li>joint accounts with partner</li><li>ISAs</li><li>child accounts your client is a signatory on</li><li>prison accounts</li>',
  }),
  visibleWhen: PARTNER_PRESENT,
}
const excludedCapitalText = GovUKBody({ text: 'Do not include any disregarded capital or Cost of Living Payments.' })
const checkGuidanceText = GovUKBody({ text: 'Check the guidance for:' })
const bankAccountGuidanceLinks = HtmlBlock({
  tag: 'ul',
  classes: 'govuk-list govuk-list--bullet',
  content: `<li><a class="govuk-link" href="${CONTROLLED_WORK_GUIDANCE_URL}#page=26" target="_blank" rel="noreferrer noopener">mandatory and discretionary disregarded capital (PDF, 599KB)</a></li><li><a class="govuk-link" href="${CONTROLLED_WORK_GUIDANCE_URL}#page=32" target="_blank" rel="noreferrer noopener">the principles for exercising discretion (PDF, 599KB)</a></li>`,
})

const bankAccountAmount = GovUKTextInput({
  code: AMOUNT_CODE,
  defaultValue: Item().path('amount'),
  label: { text: 'Total money in bank account', classes: 'govuk-label--s' },
  hint: { text: 'Enter 0 if this does not apply.' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: rowMessage(
        'Enter total money in bank account. Enter 0 if this does not apply.',
        'Enter total money in bank account %1. Enter 0 if this does not apply.',
      ),
    }),
    validation({
      condition: Self().match(isValidAssetAmountCondition()),
      message: rowMessage(
        'Total money in bank account must be a number. Enter 0 if this does not apply.',
        'Total money in bank account %1 must be a number. Enter 0 if this does not apply.',
      ),
    }),
    validation({
      condition: Self().match(isNonNegativeAssetAmountCondition()),
      message: rowMessage(
        'Total money in bank account must be 0 or more. Enter 0 if this does not apply.',
        'Total money in bank account %1 must be 0 or more. Enter 0 if this does not apply.',
      ),
    }),
  ],
})

const bankAccountDispute = GovUKCheckboxInput({
  code: DISPUTE_CODE,
  defaultValue: Item().path('account_in_dispute'),
  visibleWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  dependentWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  items: [
    {
      value: 'yes',
      text: 'This asset is a subject matter of dispute',
      checked: Answer(DISPUTE_CODE).match(Condition.Equals('yes')),
    },
  ],
})

const bankAccountRows = CollectionBlock({
  collection: Data(COLLECTION_CODE).each(
    Iterator.Map([
      GovUKGridRow({
        columns: [
          {
            width: 'one-half',
            blocks: [GovUKHeading({ text: Format('Bank account %1', ROW_INDEX), size: 'm' })],
          },
          {
            width: 'one-half',
            blocks: [
              GovUKButton({
                text: 'Remove',
                name: 'action',
                value: Format('remove_%1', Loop.Index0()),
                classes: 'govuk-button--secondary',
                visibleWhen: Loop.Index0().match(Condition.Number.GreaterThan(0)),
              }),
            ],
          },
        ],
      }),
      bankAccountAmount,
      bankAccountDispute,
      subjectMatterOfDisputeDetails,
      GovUKSectionBreak({ size: 'l', visible: true }),
    ]),
  ),
})

const addBankAccountButton = GovUKButton({
  text: 'Add another bank account',
  name: 'action',
  value: 'add-another-bank-account',
  classes: 'govuk-button--secondary',
})

const investmentsRelevant = GovUKRadioInput({
  code: 'investments_relevant',
  fieldset: { legend: { text: 'Does your client have any investments?', classes: 'govuk-fieldset__legend--s' } },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex(YES_NO_PATTERN)),
      message: 'Select yes if client has any investments',
    }),
  ],
})

const investmentsHint = {
  ...GovUKBody({
    text: 'For example, shares in a public limited company, unit trusts or capital bonds.',
    classes: 'govuk-hint',
  }),
  visibleWhen: PARTNER_ABSENT,
}
const investmentsHintWithPartner = {
  ...GovUKBody({
    text: 'For example, shares in a public limited company, unit trusts or capital bonds. Include any jointly owned by the client and partner.',
    classes: 'govuk-hint',
  }),
  visibleWhen: PARTNER_PRESENT,
}

const investmentsAmount = GovUKTextInput({
  code: 'investments',
  label: { text: 'Total of all investments', classes: 'govuk-label--s' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  visibleWhen: INVESTMENTS_APPLY,
  dependentWhen: INVESTMENTS_APPLY,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the total value of investments.',
    }),
    validation({
      condition: Self().match(isValidAssetAmountCondition()),
      message: 'The total value of all investments must be a number.',
    }),
    validation({
      condition: Self().match(isPositiveInvestmentAmountCondition()),
      message: 'The total value of all investments must be greater than 0.',
    }),
  ],
})

const investmentsDispute = GovUKCheckboxInput({
  code: 'investments_in_dispute',
  visibleWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  dependentWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  items: [
    {
      value: 'yes',
      text: 'This asset is a subject matter of dispute',
      checked: Answer('investments_in_dispute').match(Condition.Equals('yes')),
    },
  ],
})

const valuablesRelevant = GovUKRadioInput({
  code: 'valuables_relevant',
  fieldset: {
    legend: { text: 'Does your client have valuable items worth £500 or more?', classes: 'govuk-fieldset__legend--s' },
  },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex(YES_NO_PATTERN)),
      message: 'Select yes if client has any valuables worth £500 or more',
    }),
  ],
})

const valuablesHint = GovUKBody({
  text: 'If you have more than one valuation for any of these valuable items, use the highest. Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.',
  classes: 'govuk-hint',
})

const valuablesDetails = GovUKDetails({
  summaryText: 'What valuable items to include',
  html: '<p>Include things like:</p><ul><li>jewellery (but not wedding, engagement or eternity rings)</li><li>art</li><li>antiques</li><li>a caravan (if it is not the client’s main residence)</li><li>musical instruments, unless your client is a professional musician</li><li>any vehicle not in regular use</li></ul><p>Do not include things like:</p><ul><li>wedding, engagement and eternity rings</li><li>furniture and appliances</li><li>televisions</li><li>mobile phones, laptops and other devices</li><li>clothing</li><li>equipment or tools used for work</li></ul>',
})

const valuablesAmount = GovUKTextInput({
  code: 'valuables',
  label: { text: 'Total of all valuable items', classes: 'govuk-label--s' },
  inputType: 'text',
  attributes: { inputmode: 'decimal' },
  prefix: { text: '£' },
  classes: GovUKUtilityClasses.Input.Width10,
  visibleWhen: VALUABLES_APPLY,
  dependentWhen: VALUABLES_APPLY,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Enter the total value of items worth £500 or more.',
    }),
    validation({
      condition: Self().match(isValidAssetAmountCondition()),
      message: 'Value of items worth £500 or more must be a number.',
    }),
    validation({
      condition: Self().match(isAtLeastValuablesThresholdCondition()),
      message: 'Valuable items must be £500 or more.',
    }),
  ],
})

const valuablesDispute = GovUKCheckboxInput({
  code: 'valuables_in_dispute',
  visibleWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  dependentWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
  items: [
    {
      value: 'yes',
      text: 'This asset is a subject matter of dispute',
      checked: Answer('valuables_in_dispute').match(Condition.Equals('yes')),
    },
  ],
})

const assetsGuidanceLink = HtmlBlock({
  tag: 'a',
  classes: 'govuk-link',
  attributes: {
    href: [`${CONTROLLED_WORK_GUIDANCE_URL}#page=26`],
    target: ['_blank'],
    rel: ['noreferrer noopener'],
  },
  content: 'Assets and capital, including disregarded capital (PDF, 599KB)',
})

const disputeGuidanceLink = {
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
  visibleWhen: SUBJECT_MATTER_OF_DISPUTE_APPLIES,
}

export const assetsBankAccountFieldCodes = ['amount', 'account_in_dispute']

export const assetsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    assetsHeading,
    partnerHint,
    bankruptcyDetails,
    bankAccountsHeading,
    bankAccountExamples,
    bankAccountExamplesList,
    bankAccountExamplesListWithPartner,
    excludedCapitalText,
    checkGuidanceText,
    bankAccountGuidanceLinks,
    GovUKDetails({
      summaryText: 'Examples of Cost of Living Payments',
      html: '<ul><li>Pensioner Cost of Living Payment</li><li>Cost of Living Payment</li><li>Disability Cost of Living Payment</li><li>Household Support Fund</li><li>Council Tax rebate</li><li>Energy Bills Support Scheme (EBSS)</li><li>Alternative Fuel Payment</li></ul>',
    }),
    bankAccountRows,
    addBankAccountButton,
    investmentsRelevant,
    investmentsHint,
    investmentsHintWithPartner,
    investmentsAmount,
    investmentsDispute,
    valuablesRelevant,
    valuablesHint,
    valuablesDetails,
    valuablesAmount,
    valuablesDispute,
  ],
  guidanceBlocks: [assetsGuidanceLink, disputeGuidanceLink],
})

export const assetsFields = {
  bankAccountAmount,
  bankAccountDispute,
  investmentsRelevant,
  investmentsAmount,
  investmentsDispute,
  valuablesRelevant,
  valuablesAmount,
  valuablesDispute,
}
