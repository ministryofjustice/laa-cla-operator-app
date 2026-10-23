import { expect } from 'chai';
import {
  bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField,
} from '#packages/financial-eligibility-journey/src/savingsPage/savingsBlock.js';
import {
  bankBalanceField as disputedBankBalanceField, investmentBalanceField as disputedInvestmentBalanceField,
  assetBalanceField as disputedAssetBalanceField, creditBalanceField as disputedCreditBalanceField,
} from '#packages/financial-eligibility-journey/src/disputedSavingsPage/disputedSavingsBlock.js';
import {
  bankBalanceField as partnerBankBalanceField, investmentBalanceField as partnerInvestmentBalanceField,
  assetBalanceField as partnerAssetBalanceField, creditBalanceField as partnerCreditBalanceField,
} from '#packages/financial-eligibility-journey/src/partnerSavingsPage/partnerSavingsBlock.js';
import {
  bankBalanceField as undisputedBankBalanceField, investmentBalanceField as undisputedInvestmentBalanceField,
  assetBalanceField as undisputedAssetBalanceField, creditBalanceField as undisputedCreditBalanceField,
} from '#packages/financial-eligibility-journey/src/undisputedSavings/undisputedSavingsBlock.js';
import {
  bankBalanceField as partnerUndisputedBankBalanceField, investmentBalanceField as partnerUndisputedInvestmentBalanceField,
  assetBalanceField as partnerUndisputedAssetBalanceField, creditBalanceField as partnerUndisputedCreditBalanceField,
} from '#packages/financial-eligibility-journey/src/partnerUndisputedSavings/partnerUndisputedSavingsBlock.js';
import { MAX_MONEY_VALUE_MESSAGE, MIN_MONEY_OR_ZERO_VALUE_MESSAGE } from '#packages/financial-eligibility-journey/src/moneyFieldHelpers.js';

interface FieldLike {
  code?: unknown;
  validWhen?: unknown;
}

/**
 * Reads the `message` off each `validWhen` rule on a field, in declaration order.
 * @param {FieldLike} field The field to read validation messages from
 * @returns {unknown[]} The `message` value of each validation rule, in order
 */
function validationMessages(field: FieldLike): unknown[] {
  if (!Array.isArray(field.validWhen)) {
    return [];
  }
  return field.validWhen.map((rule) => (rule as { message?: unknown }).message);
}

/**
 * Asserts a savings money field has the shared max-value validation as its 4th rule.
 * @param {string} name The field's display name for the test description
 * @param {FieldLike} field The field to check
 * @returns {void}
 */
function itHasMaxValueValidation(name: string, field: FieldLike): void {
  it(`rejects amounts over the maximum allowed value for ${name}`, () => {
    const messages = validationMessages(field);
    expect(messages).to.have.length(4);
    expect(messages[3]).to.equal(MAX_MONEY_VALUE_MESSAGE);
  });
}

/**
 * Asserts a valuables field has the shared zero-or-minimum validation as its 2nd rule.
 * @param {string} name The field's display name for the test description
 * @param {FieldLike} field The field to check
 * @returns {void}
 */
function itHasMinimumValueValidation(name: string, field: FieldLike): void {
  it(`requires 0 or at least £500 for ${name}`, () => {
    const messages = validationMessages(field);
    expect(messages).to.have.length(4);
    expect(messages[1]).to.equal(MIN_MONEY_OR_ZERO_VALUE_MESSAGE);
  });
}

describe('Savings fields', () => {
  itHasMaxValueValidation('bank balance', bankBalanceField);
  itHasMaxValueValidation('investment balance', investmentBalanceField);
  itHasMaxValueValidation('asset balance', assetBalanceField);
  itHasMinimumValueValidation('asset balance', assetBalanceField);
  itHasMaxValueValidation('credit balance', creditBalanceField);
});

describe('Disputed savings fields', () => {
  itHasMaxValueValidation('bank balance', disputedBankBalanceField);
  itHasMaxValueValidation('investment balance', disputedInvestmentBalanceField);
  itHasMaxValueValidation('asset balance', disputedAssetBalanceField);
  itHasMinimumValueValidation('asset balance', disputedAssetBalanceField);
  itHasMaxValueValidation('credit balance', disputedCreditBalanceField);
});

describe('Partner savings fields', () => {
  itHasMaxValueValidation('bank balance', partnerBankBalanceField);
  itHasMaxValueValidation('investment balance', partnerInvestmentBalanceField);
  itHasMaxValueValidation('asset balance', partnerAssetBalanceField);
  itHasMinimumValueValidation('asset balance', partnerAssetBalanceField);
  itHasMaxValueValidation('credit balance', partnerCreditBalanceField);
});

describe('Undisputed savings fields', () => {
  itHasMaxValueValidation('bank balance', undisputedBankBalanceField);
  itHasMaxValueValidation('investment balance', undisputedInvestmentBalanceField);
  itHasMaxValueValidation('asset balance', undisputedAssetBalanceField);
  itHasMinimumValueValidation('asset balance', undisputedAssetBalanceField);
  itHasMaxValueValidation('credit balance', undisputedCreditBalanceField);
});

describe('Partner undisputed savings fields', () => {
  itHasMaxValueValidation('bank balance', partnerUndisputedBankBalanceField);
  itHasMaxValueValidation('investment balance', partnerUndisputedInvestmentBalanceField);
  itHasMaxValueValidation('asset balance', partnerUndisputedAssetBalanceField);
  itHasMinimumValueValidation('asset balance', partnerUndisputedAssetBalanceField);
  itHasMaxValueValidation('credit balance', partnerUndisputedCreditBalanceField);
});
