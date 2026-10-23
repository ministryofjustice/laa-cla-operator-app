import { expect } from 'chai';
import {
  selfEmployedField,
  earningsField, earningsFrequencyField,
  incomeTaxField, incomeTaxFrequencyField,
  nationalInsuranceField, nationalInsuranceFrequencyField,
  selfEmploymentDrawingsField, selfEmploymentDrawingsFrequencyField,
  incomeBenefitsField, incomeBenefitsFrequencyField,
  taxCreditsField, taxCreditsFrequencyField,
  maintenanceReceivedField, maintenanceReceivedFrequencyField,
  pensionIncomeField, pensionIncomeFrequencyField,
  otherIncomeField, otherIncomeFrequencyField,
  childBenefitFrequencyField,
  childBenefitField,
} from '#packages/financial-eligibility-journey/src/incomePage/incomeBlock.js';
import {
  selfEmployedPartnerField,
  earningsPartnerField, earningsPartnerFrequencyField,
  incomeTaxPartnerField, incomeTaxPartnerFrequencyField,
  nationalInsurancePartnerField, nationalInsurancePartnerFrequencyField,
  selfEmploymentDrawingsPartnerField, selfEmploymentDrawingsPartnerFrequencyField,
  incomeBenefitsPartnerField, incomeBenefitsPartnerFrequencyField,
  taxCreditsPartnerField, taxCreditsPartnerFrequencyField,
  maintenanceReceivedPartnerField, maintenanceReceivedPartnerFrequencyField,
  pensionIncomePartnerField, pensionIncomePartnerFrequencyField,
  otherIncomePartnerField, otherIncomePartnerFrequencyField,
} from '#packages/financial-eligibility-journey/src/partnerIncomePage/partnerIncomeBlock.js';
import { dependants16OverField, dependants15UnderField } from '#packages/financial-eligibility-journey/src/dependantsPage/dependantsBlock.js';
import { partnerDependants16OverField, partnerDependants15UnderField } from '#packages/financial-eligibility-journey/src/partnerDependantsPage/partnerDependantsBlock.js';
import { frequencyItems as FREQUENCY_ITEMS, MAX_MONEY_VALUE_MESSAGE } from '#packages/financial-eligibility-journey/src/moneyFieldHelpers.js';
import { MAX_DEPENDANTS_MESSAGE } from '#packages/financial-eligibility-journey/src/dependantsFieldHelpers.js';

interface FieldLike {
  code?: unknown;
  inputType?: unknown;
  defaultValue?: unknown;
  items?: unknown;
  validWhen?: unknown;
}
type AmountField = FieldLike;
type FrequencyField = FieldLike;

/**
 * Reads the `message` off each `validWhen` rule on a field, in declaration order.
 * The Forge component types allow `validWhen` to be an expression/iterable as well as a plain
 * array, so this narrows it back down to the plain array shape used by every field in this file.
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
 * Reads the `items` off a select/radio field as a plain array of `{ value, text }` options.
 * @param {FieldLike} field The field to read options from
 * @returns {{ value: string; text: string }[]} The field's options, in order
 */
function selectItems(field: FieldLike): { value: string; text: string }[] {
  if (!Array.isArray(field.items)) {
    return [];
  }
  return field.items as { value: string; text: string }[];
}

interface MoneyFieldCase {
  name: string;
  code: string;
  amount: AmountField;
  frequency: FrequencyField;
  emptyMessage: string;
  invalidMessage: string;
  frequencyMessage: string;
  decimalMessage: string;
}

const clientMoneyFields: MoneyFieldCase[] = [
  {
    name: 'earnings', code: 'earnings', amount: earningsField, frequency: earningsFrequencyField,
    emptyMessage: 'Enter what you earned before tax, or enter \'0\' if none',
    invalidMessage: 'What you earned before tax must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for what you earned before tax',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'income tax', code: 'income-tax', amount: incomeTaxField, frequency: incomeTaxFrequencyField,
    emptyMessage: 'Enter how much tax you pay, or enter \'0\' if none',
    invalidMessage: 'How much tax you pay must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for how much tax you pay',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'national insurance', code: 'national-insurance', amount: nationalInsuranceField, frequency: nationalInsuranceFrequencyField,
    emptyMessage: 'Enter how much National Insurance you pay, or enter \'0\' if none',
    invalidMessage: 'How much National Insurance you pay must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for how much National Insurance you pay',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'self employment drawings', code: 'self-employment-drawings', amount: selfEmploymentDrawingsField, frequency: selfEmploymentDrawingsFrequencyField,
    emptyMessage: 'Enter your self employed drawings (before tax), or enter \'0\' if none',
    invalidMessage: 'Your self employed drawings (before tax) must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for your self employed drawings (before tax)',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'benefits', code: 'income-benefits', amount: incomeBenefitsField, frequency: incomeBenefitsFrequencyField,
    emptyMessage: 'Enter the total of any benefits you get, or enter \'0\' if none',
    invalidMessage: 'The total of any benefits you get must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any benefits you get',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'tax credits', code: 'tax-credits', amount: taxCreditsField, frequency: taxCreditsFrequencyField,
    emptyMessage: 'Enter the total of any tax credits you get, or enter \'0\' if none',
    invalidMessage: 'The total of any tax credits you get must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any tax credits you get',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'child benefit (for household)', code: 'child-benefit', amount: childBenefitField, frequency: childBenefitFrequencyField,
    emptyMessage: 'Enter the total of any child benefit you get, or enter \'0\' if none',
    invalidMessage: 'The total of any child benefit you get must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any child benefit you get',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'maintenance received', code: 'maintenance-received', amount: maintenanceReceivedField, frequency: maintenanceReceivedFrequencyField,
    emptyMessage: 'Enter the total of any maintenance you get, or enter \'0\' if none',
    invalidMessage: 'The total of any maintenance you get must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any maintenance you get',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'pension income', code: 'pension-income', amount: pensionIncomeField, frequency: pensionIncomeFrequencyField,
    emptyMessage: 'Enter the total of any pension income you get, or enter \'0\' if none',
    invalidMessage: 'The total of any pension income you get must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any pension income you get',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'other income', code: 'other-income', amount: otherIncomeField, frequency: otherIncomeFrequencyField,
    emptyMessage: 'Enter the total of any other income you get, or enter \'0\' if none',
    invalidMessage: 'The total of any other income you get must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any other income you get',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
];

const partnerMoneyFields: MoneyFieldCase[] = [
  {
    name: 'earnings', code: 'earnings-partner', amount: earningsPartnerField, frequency: earningsPartnerFrequencyField,
    emptyMessage: 'Enter what your partner earned before tax, or enter \'0\' if none',
    invalidMessage: 'What your partner earned before tax must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for what your partner earned before tax',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'income tax', code: 'income-tax-partner', amount: incomeTaxPartnerField, frequency: incomeTaxPartnerFrequencyField,
    emptyMessage: 'Enter how much tax your partner pays, or enter \'0\' if none',
    invalidMessage: 'How much tax your partner pays must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for how much tax your partner pays',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'national insurance', code: 'national-insurance-partner', amount: nationalInsurancePartnerField, frequency: nationalInsurancePartnerFrequencyField,
    emptyMessage: 'Enter how much National Insurance your partner pays, or enter \'0\' if none',
    invalidMessage: 'How much National Insurance your partner pays must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for how much National Insurance your partner pays',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'self employment drawings', code: 'self-employment-drawings-partner', amount: selfEmploymentDrawingsPartnerField, frequency: selfEmploymentDrawingsPartnerFrequencyField,
    emptyMessage: 'Enter your partner\'s self employed drawings (before tax), or enter \'0\' if none',
    invalidMessage: 'Your partner\'s self employed drawings (before tax) must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for your partner\'s self employed drawings (before tax)',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'benefits', code: 'income-benefits-partner', amount: incomeBenefitsPartnerField, frequency: incomeBenefitsPartnerFrequencyField,
    emptyMessage: 'Enter the total of any benefits your partner gets, or enter \'0\' if none',
    invalidMessage: 'The total of any benefits your partner gets must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any benefits your partner gets',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'tax credits', code: 'tax-credits-partner', amount: taxCreditsPartnerField, frequency: taxCreditsPartnerFrequencyField,
    emptyMessage: 'Enter the total of any tax credits your partner gets, or enter \'0\' if none',
    invalidMessage: 'The total of any tax credits your partner gets must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any tax credits your partner gets',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'maintenance received', code: 'maintenance-received-partner', amount: maintenanceReceivedPartnerField, frequency: maintenanceReceivedPartnerFrequencyField,
    emptyMessage: 'Enter the total of any maintenance your partner gets, or enter \'0\' if none',
    invalidMessage: 'The total of any maintenance your partner gets must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any maintenance your partner gets',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'pension income', code: 'pension-income-partner', amount: pensionIncomePartnerField, frequency: pensionIncomePartnerFrequencyField,
    emptyMessage: 'Enter the total of any pension income your partner gets, or enter \'0\' if none',
    invalidMessage: 'The total of any pension income your partner gets must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any pension income your partner gets',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'other income', code: 'other-income-partner', amount: otherIncomePartnerField, frequency: otherIncomePartnerFrequencyField,
    emptyMessage: 'Enter the total of any other income your partner gets, or enter \'0\' if none',
    invalidMessage: 'The total of any other income your partner gets must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for the total of any other income your partner gets',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
];

/**
 * Runs the shared set of assertions (AC6/AC7/AC8/AC10) against a money field + its paired frequency select
 * @param {MoneyFieldCase} testCase The field's expected code and messages
 * @returns {void}
 */
function testMoneyFieldPair(testCase: MoneyFieldCase): void {
  describe(`${testCase.name} field (${testCase.code})`, () => {
    it('uses a numeric text input with the correct code', () => {
      expect(testCase.amount.code).to.equal(testCase.code);
      expect(testCase.amount.inputType).to.equal('number');
    });

    it('requires the amount to be answered (AC6)', () => {
      expect(validationMessages(testCase.amount)[0]).to.equal(testCase.emptyMessage);
    });

    it('rejects negative or non-numeric amounts (AC8)', () => {
      expect(validationMessages(testCase.amount)[1]).to.equal(testCase.invalidMessage);
    });

    it('rejects amounts with more than 2 decimal places', () => {
      expect(validationMessages(testCase.amount)[2]).to.equal(testCase.decimalMessage);
    });
    
    it('rejects amounts over the maximum allowed value', () => {
      expect(validationMessages(testCase.amount)[3]).to.equal(MAX_MONEY_VALUE_MESSAGE);
    });

    it('has exactly three validation rules on the amount field', () => {
      expect(validationMessages(testCase.amount)).to.have.length(4);
    });

    it('pairs with a frequency select defaulting to per_month with the standard options', () => {
      expect(testCase.frequency.code).to.equal(`${testCase.code}-frequency`);
      expect(testCase.frequency.defaultValue).to.equal('per_month');
      expect(selectItems(testCase.frequency)).to.deep.equal(FREQUENCY_ITEMS);
    });

    it('requires the frequency to be answered (AC10)', () => {
      expect(validationMessages(testCase.frequency)[0]).to.equal(testCase.frequencyMessage);
    });
  });
}

describe('Your income fields', () => {
  it('asks whether the client is self employed with the correct validation message (AC6)', () => {
    expect(selfEmployedField.code).to.equal('self-employed');
    expect(selectItems(selfEmployedField)).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ]);
    expect(validationMessages(selfEmployedField)[0]).to.equal('Select yes if you are self employed');
  });

  clientMoneyFields.forEach(testMoneyFieldPair);
});

describe('Your partner\'s income fields', () => {
  it('asks whether the partner is self employed with the correct validation message (AC6)', () => {
    expect(selfEmployedPartnerField.code).to.equal('self-employed-partner');
    expect(selectItems(selfEmployedPartnerField)).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ]);
    expect(validationMessages(selfEmployedPartnerField)[0]).to.equal('Select yes if your partner is self employed');
  });

  partnerMoneyFields.forEach(testMoneyFieldPair);
});

describe('Dependants fields', () => {
  it('requires dependants aged 16 and over to be answered with a whole positive number (AC6/AC9)', () => {
    const messages = validationMessages(dependants16OverField);
    expect(dependants16OverField.code).to.equal('dependants-16-over');
    expect(dependants16OverField.inputType).to.equal('number');
    expect(messages).to.have.length(3);
    expect(messages[0]).to.equal('Enter the number of dependants you have aged 16 and over, or enter \'0\' if none');
    expect(messages[1]).to.equal('The number of dependants you have aged 16 and over must be a whole positive number, like 1 or 2');
    expect(messages[2]).to.equal(MAX_DEPENDANTS_MESSAGE);
  });

  it('requires dependants aged 15 and under to be answered with a whole positive number (AC6/AC9)', () => {
    const messages = validationMessages(dependants15UnderField);
    expect(dependants15UnderField.code).to.equal('dependants-15-under');
    expect(dependants15UnderField.inputType).to.equal('number');
    expect(messages).to.have.length(3);
    expect(messages[0]).to.equal('Enter the number of dependants you have aged 15 and under, or enter \'0\' if none');
    expect(messages[1]).to.equal('The number of dependants you have aged 15 and under must be a whole positive number, like 1 or 2');
    expect(messages[2]).to.equal(MAX_DEPENDANTS_MESSAGE);
  });

  describe('Partner dependants fields', () => {
    it('requires dependants aged 16 and over to be answered with a whole positive number (AC6/AC9)', () => {
      const messages = validationMessages(partnerDependants16OverField);

      expect(partnerDependants16OverField.code).to.equal('dependants-16-over');
      expect(partnerDependants16OverField.inputType).to.equal('number');
      expect(messages).to.have.length(3);
      expect(messages[0]).to.equal(
        'Enter the number of dependants you and your partner have aged 16 and over, or enter \'0\' if none',
      );
      expect(messages[1]).to.equal(
        'The number of dependants you and your partner have aged 16 and over must be a whole positive number, like 1 or 2',
      );
      expect(messages[2]).to.equal(MAX_DEPENDANTS_MESSAGE);
    });

    it('requires dependants aged 15 and under to be answered with a whole positive number (AC6/AC9)', () => {
      const messages = validationMessages(partnerDependants15UnderField);

      expect(partnerDependants15UnderField.code).to.equal('dependants-15-under');
      expect(partnerDependants15UnderField.inputType).to.equal('number');
      expect(messages).to.have.length(3);
      expect(messages[0]).to.equal(
        'Enter the number of dependants you and your partner have aged 15 and under, or enter \'0\' if none',
      );
      expect(messages[1]).to.equal(
        'The number of dependants you and your partner have aged 15 and under must be a whole positive number, like 1 or 2',
      );
      expect(messages[2]).to.equal(MAX_DEPENDANTS_MESSAGE);
    });
  });
});
