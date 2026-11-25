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

const CONTROLLED_WORK_GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const COLLECTION_CODE = CONTROLLED_WORK_DATA_KEYS.partnerAssetBankAccountCollection
const HAS_MULTIPLE_ROWS = Data(COLLECTION_CODE)
  .pipe(Transformer.Array.Length())
  .match(Condition.Number.GreaterThan(1))
const ROW_INDEX = Loop.Index()
const AMOUNT_CODE = Format('amount_%1', Loop.Index0())
const INVESTMENTS_APPLY = Answer('partner_investments_relevant').match(Condition.Equals('yes'))
const VALUABLES_APPLY = Answer('partner_valuables_relevant').match(Condition.Equals('yes'))
const YES_NO_PATTERN = '^(yes|no)$'

function rowMessage(single: string, multiple: string) {
  return Conditional({
    when: HAS_MULTIPLE_ROWS,
    then: Format(multiple, ROW_INDEX),
    else: single,
  })
}

const isValidPartnerAssetAmountCondition = moneyConditions.register(
  'IsValidPartnerAssetAmount',
  () => isValidAssetAmount,
)
const isNonNegativePartnerAssetAmountCondition = moneyConditions.register(
  'IsNonNegativePartnerAssetAmount',
  () => isNonNegativeAssetAmount,
)
const isPositivePartnerInvestmentAmountCondition = moneyConditions.register(
  'IsPositivePartnerInvestmentAmount',
  () => isPositiveInvestmentAmount,
)
const isAtLeastPartnerValuablesThresholdCondition = moneyConditions.register(
  'IsAtLeastPartnerValuablesThreshold',
  () => isAtLeastValuablesThreshold,
)

const partnerAssetsHeading = GovUKHeading({ text: 'Partner assets', size: 'l', level: 2 })
const partnerAssetsHint = GovUKBody({
  text: 'Do not include any assets already entered for your client.',
  classes: 'govuk-hint',
})
const bankruptcyDetails = GovUKDetails({
  summaryText: 'Partners who are bankrupt',
  html: '<p>If the partner is bankrupt, any capital assets vested in the trustee in bankruptcy will not be included in the capital assessment.</p>',
})

const bankAccountsHeading = GovUKHeading({ text: 'Money in bank accounts', size: 'm', level: 3 })
const bankAccountExamples = GovUKBody({ text: 'For example:' })
const bankAccountExamplesList = HtmlBlock({
  tag: 'ul',
  classes: 'govuk-list govuk-list--bullet',
  content: '<li>current or savings accounts</li><li>ISAs</li><li>child accounts the partner is a signatory on</li><li>prison accounts</li>',
})
const bankAccountExclusions = GovUKBody({
  text: 'Do not include any joint bank accounts already entered for your client.',
})
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
      condition: Self().match(isValidPartnerAssetAmountCondition()),
      message: rowMessage(
        'Total money in bank account must be a number. Enter 0 if this does not apply.',
        'Total money in bank account %1 must be a number. Enter 0 if this does not apply.',
      ),
    }),
    validation({
      condition: Self().match(isNonNegativePartnerAssetAmountCondition()),
      message: rowMessage(
        'Total money in bank account must be 0 or more. Enter 0 if this does not apply.',
        'Total money in bank account %1 must be 0 or more. Enter 0 if this does not apply.',
      ),
    }),
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
  code: 'partner_investments_relevant',
  fieldset: { legend: { text: 'Does the partner have any investments?', classes: 'govuk-fieldset__legend--s' } },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex(YES_NO_PATTERN)),
      message: 'Select yes if the partner has any investments',
    }),
  ],
})

const investmentsHints = HtmlBlock({
  tag: 'ul',
  classes: 'govuk-list govuk-list--bullet',
  content: '<li>For example, shares in a public limited company, unit trusts or capital bonds.</li><li>Do not include any investments already entered for your client.</li>',
})

const investmentsAmount = GovUKTextInput({
  code: 'partner_investments',
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
      condition: Self().match(isValidPartnerAssetAmountCondition()),
      message: 'The total value of all investments must be a number.',
    }),
    validation({
      condition: Self().match(isPositivePartnerInvestmentAmountCondition()),
      message: 'The total value of all investments must be greater than 0.',
    }),
  ],
})

const valuablesRelevant = GovUKRadioInput({
  code: 'partner_valuables_relevant',
  fieldset: {
    legend: { text: 'Does the partner have valuable items worth £500 or more?', classes: 'govuk-fieldset__legend--s' },
  },
  items: [
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ],
  validWhen: [
    validation({
      condition: Self().match(Condition.String.MatchesRegex(YES_NO_PATTERN)),
      message: 'Select yes if the partner has valuable items worth £500 or more',
    }),
  ],
})

const valuablesHints = HtmlBlock({
  tag: 'ul',
  classes: 'govuk-list govuk-list--bullet',
  content: '<li>If you have more than one valuation for any of these valuable items, use the highest. Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.</li><li>Do not include any valuable items already entered for your client.</li>',
})

const valuablesDetails = GovUKDetails({
  summaryText: 'What valuable items to include',
  html: '<p>Include things like:</p><ul><li>jewellery (but not wedding, engagement or eternity rings)</li><li>art</li><li>antiques</li><li>a caravan (if it is not the client’s main residence)</li><li>musical instruments, unless the partner is a professional musician</li><li>any vehicle not in regular use</li></ul><p>Do not include things like:</p><ul><li>wedding, engagement and eternity rings</li><li>furniture and appliances</li><li>televisions</li><li>mobile phones, laptops and other devices</li><li>clothing</li><li>equipment or tools used for work</li></ul>',
})

const valuablesAmount = GovUKTextInput({
  code: 'partner_valuables',
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
      condition: Self().match(isValidPartnerAssetAmountCondition()),
      message: 'Value of items worth £500 or more must be a number.',
    }),
    validation({
      condition: Self().match(isAtLeastPartnerValuablesThresholdCondition()),
      message: 'Valuable items must be £500 or more.',
    }),
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

export const partnerAssetsBankAccountFieldCodes = ['amount']

export const partnerAssetsPageContent = eligibilityQuestionPageLayout({
  questionBlocks: [
    partnerAssetsHeading,
    partnerAssetsHint,
    bankruptcyDetails,
    bankAccountsHeading,
    bankAccountExamples,
    bankAccountExamplesList,
    bankAccountExclusions,
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
    investmentsHints,
    investmentsAmount,
    valuablesRelevant,
    valuablesHints,
    valuablesDetails,
    valuablesAmount,
  ],
  guidanceBlocks: [assetsGuidanceLink],
})

export const partnerAssetsFields = {
  bankAccountAmount,
  investmentsRelevant,
  investmentsAmount,
  valuablesRelevant,
  valuablesAmount,
}
