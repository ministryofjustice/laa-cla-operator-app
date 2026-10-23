import { expect } from 'chai';
import {
  mortgageField, mortgageFrequencyField,
  rentField, rentFrequencyField,
  maintenancePaidField, maintenancePaidFrequencyField,
  childcareCostsField, childcareCostsFrequencyField,
  legalAidContributionsField, maintenancePaidRow, legalAidContributionsHeading,
} from '#packages/financial-eligibility-journey/src/expensesPage/expensesBlock.js';
import {
  mortgagePartnerField, mortgagePartnerFrequencyField,
  rentPartnerField, rentPartnerFrequencyField,
  maintenancePaidPartnerField, maintenancePaidPartnerFrequencyField,
  childcareCostsPartnerField, childcareCostsPartnerFrequencyField,
  legalAidContributionsPartnerField, maintenancePaidPartnerRow, legalAidContributionsPartnerHeading,
} from '#packages/financial-eligibility-journey/src/partnerExpensesPage/partnerExpensesBlock.js';
import { expensesSummaryList, partnerExpensesSummaryList } from '#packages/financial-eligibility-journey/src/checkAnswersPage/checkAnswersBlock.js';
import { frequencyItems as FREQUENCY_ITEMS, lastCalendarMonthDate, MAX_MONEY_VALUE_MESSAGE } from '#packages/financial-eligibility-journey/src/moneyFieldHelpers.js';

interface FieldLike {
  code?: unknown;
  inputType?: unknown;
  defaultValue?: unknown;
  items?: unknown;
  validWhen?: unknown;
}

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
 * Reads the `items` off a select field as a plain array of `{ value, text }` options.
 * @param {FieldLike} field The field to read options from
 * @returns {{ value: string; text: string }[]} The field's options, in order
 */
function selectItems(field: FieldLike): { value: string; text: string }[] {
  if (!Array.isArray(field.items)) {
    return [];
  }
  return field.items as { value: string; text: string }[];
}

interface BuiltExpression {
  build(): unknown;
}

interface FormatGeneratorExpr {
  name: string;
  arguments: [string, ...unknown[]];
}

/**
 * Resolves a value that may be an unfinalised builder (exposing `.build()`) or an already-plain
 * expression object, down to its plain expression shape.
 * @param {unknown} expr The builder or plain expression to normalise
 * @returns {unknown} The plain expression
 */
function toPlainExpr(expr: unknown): unknown {
  const maybeBuilder = expr as Partial<BuiltExpression>;
  return typeof maybeBuilder.build === 'function' ? maybeBuilder.build() : expr;
}

/**
 * Asserts that a label/key.text expression is built from `Format(expectedTemplate, lastCalendarMonthDate())`,
 * comparing against a freshly-built `lastCalendarMonthDate()` rather than a hardcoded expression shape, so this
 * doesn't duplicate (and drift from) the pipeline assertions in the 'lastCalendarMonthDate' describe block below.
 * @param {unknown} labelExpr The label/key.text expression to check
 * @param {string} expectedTemplate The exact `Format` template string expected
 * @returns {void}
 */
function expectUsesLastCalendarMonthDate(labelExpr: unknown, expectedTemplate: string): void {
  const format = labelExpr as FormatGeneratorExpr;
  expect(format.name).to.equal('FormatString');
  expect(format.arguments[0]).to.equal(expectedTemplate);
  expect(toPlainExpr(format.arguments[1])).to.deep.equal(toPlainExpr(lastCalendarMonthDate()));
}

interface MoneyFieldCase {
  name: string;
  code: string;
  amount: FieldLike;
  frequency: FieldLike;
  emptyMessage: string;
  invalidMessage: string;
  frequencyMessage: string;
  decimalMessage: string;
}

const clientExpenseFields: MoneyFieldCase[] = [
  {
    name: 'mortgage', code: 'mortgage', amount: mortgageField, frequency: mortgageFrequencyField,
    emptyMessage: 'Enter how much you pay for your mortgage, or enter \'0\' if none',
    invalidMessage: 'How much you pay for your mortgage must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for when you pay your mortgage',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'rent', code: 'rent', amount: rentField, frequency: rentFrequencyField,
    emptyMessage: 'Enter how much you pay for rent, or enter \'0\' if none',
    invalidMessage: 'How much you pay for rent must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for when you pay rent',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'maintenance paid', code: 'maintenance-paid', amount: maintenancePaidField, frequency: maintenancePaidFrequencyField,
    emptyMessage: 'Enter how much maintenance you paid during the last calendar month, or enter \'0\' if none',
    invalidMessage: 'How much maintenance you paid during the last calendar month must be a positive number, like 100 or 240.50',
    frequencyMessage: 'Select the frequency for when you pay maintenance',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'childcare costs', code: 'childcare-costs', amount: childcareCostsField, frequency: childcareCostsFrequencyField,
    emptyMessage: 'Enter any childcare costs you have because of work or study, or enter \'0\' if none',
    invalidMessage: 'Any childcare costs you have because of work or study must be a positive number, like 100 or 240.50',
    frequencyMessage: 'Select the frequency for when you pay any childcare costs you have because of work or study',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
];

const partnerExpenseFields: MoneyFieldCase[] = [
  {
    name: 'mortgage', code: 'mortgage-partner', amount: mortgagePartnerField, frequency: mortgagePartnerFrequencyField,
    emptyMessage: 'Enter how much your partner pays for their mortgage, or enter \'0\' if none',
    invalidMessage: 'How much your partner pays for their mortgage must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for when your partner pays their mortgage',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'rent', code: 'rent-partner', amount: rentPartnerField, frequency: rentPartnerFrequencyField,
    emptyMessage: 'Enter how much your partner pays for their rent, or enter \'0\' if none',
    invalidMessage: 'How much your partner pays for their rent must be a positive number, like 1000 or 2400.50',
    frequencyMessage: 'Select the frequency for when your partner pays rent',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'maintenance paid', code: 'maintenance-paid-partner', amount: maintenancePaidPartnerField, frequency: maintenancePaidPartnerFrequencyField,
    emptyMessage: 'Enter how much maintenance your partner paid during the last calendar month, or enter \'0\' if none',
    invalidMessage: 'How much maintenance your partner paid during the last calendar month must be a positive number, like 100 or 240.50',
    frequencyMessage: 'Select the frequency for when your partner pays maintenance',
    decimalMessage: 'Enter an amount with no more than 2 decimal places',
  },
  {
    name: 'childcare costs', code: 'childcare-costs-partner', amount: childcareCostsPartnerField, frequency: childcareCostsPartnerFrequencyField,
    emptyMessage: 'Enter any childcare costs your partner has because of work or study, or enter \'0\' if none',
    invalidMessage: 'Any childcare costs your partner has because of work or study must be a positive number, like 100 or 240.50',
    frequencyMessage: 'Select the frequency for when your partner pays any childcare costs they have because of work or study',
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

describe('Your expenses fields', () => {
  clientExpenseFields.forEach(testMoneyFieldPair);

  it('has no paired frequency field for legal aid contributions, and uses the exact ticket wording (AC6/AC8)', () => {
    expect(legalAidContributionsField.code).to.equal('legal-aid-contributions');
    expect(legalAidContributionsField.inputType).to.equal('number');
    expect(validationMessages(legalAidContributionsField)).to.have.length(4);
    expect(validationMessages(legalAidContributionsField)[0]).to.equal('Enter how much you paid towards legal aid for criminal defence in the last calendar month, or enter \'0\' if none');
    expect(validationMessages(legalAidContributionsField)[1]).to.equal('How much you paid towards legal aid for criminal defence in the last calendar month must be a number, like 100 or 240.50');
    expect(validationMessages(legalAidContributionsField)[3]).to.equal(MAX_MONEY_VALUE_MESSAGE);
  });

  it('shows the rolling last-calendar-month date in the maintenance paid question, not a hardcoded date', () => {
    const heading = maintenancePaidRow[0] as { text: unknown };
    expectUsesLastCalendarMonthDate(heading.text, 'How much maintenance have you paid during the last calendar month (today back to %1)?');
  });

  it('shows the rolling last-calendar-month date in the legal aid contributions question, not a hardcoded date', () => {
    expectUsesLastCalendarMonthDate((legalAidContributionsHeading as { text: unknown }).text, 'Are you currently paying towards legal aid for criminal defence? If so, how much have you paid during the last calendar month (today back to %1)?');
  });
});

describe('Your partner\'s expenses fields', () => {
  partnerExpenseFields.forEach(testMoneyFieldPair);

  it('has no paired frequency field for the partner\'s legal aid contributions, and uses the exact ticket wording (AC6/AC8)', () => {
    expect(legalAidContributionsPartnerField.code).to.equal('legal-aid-contributions-partner');
    expect(legalAidContributionsPartnerField.inputType).to.equal('number');
    expect(validationMessages(legalAidContributionsPartnerField)).to.have.length(4);
    expect(validationMessages(legalAidContributionsPartnerField)[0]).to.equal('Enter how much your partner paid towards legal aid for criminal defence in the last calendar month, or enter \'0\' if none');
    expect(validationMessages(legalAidContributionsPartnerField)[1]).to.equal('How much your partner paid towards legal aid for criminal defence in the last calendar month must be a number, like 100 or 240.50');
    expect(validationMessages(legalAidContributionsPartnerField)[3]).to.equal(MAX_MONEY_VALUE_MESSAGE);
  });

  it('shows the rolling last-calendar-month date in the partner\'s maintenance paid question, not a hardcoded date', () => {
    const heading = maintenancePaidPartnerRow[0] as { text: unknown };
    expectUsesLastCalendarMonthDate(heading.text, 'How much maintenance has your partner paid during the last calendar month (today back to %1)?');
  });

  it('shows the rolling last-calendar-month date in the partner\'s legal aid contributions question, not a hardcoded date', () => {
    expectUsesLastCalendarMonthDate((legalAidContributionsPartnerHeading as { text: unknown }).text, 'Is your partner currently paying towards legal aid for criminal defence? If so, how much has your partner paid in the last calendar month (today back to %1)?');
  });
});

describe('lastCalendarMonthDate', () => {
  it('resolves as today plus one day, minus one calendar month, formatted as an ordinal date (matches legacy cla_frontend calculation)', () => {
    const pipeline = (lastCalendarMonthDate() as unknown as BuiltExpression).build() as {
      input: unknown;
      steps: unknown[];
    };

    expect(pipeline.input).to.deep.equal({ type: 'FunctionType.Generator', name: 'Date.Now', arguments: [] });
    expect(pipeline.steps).to.deep.equal([
      { type: 'FunctionType.Transformer', name: 'Date.AddDays', arguments: [1] },
      { type: 'FunctionType.Transformer', name: 'Date.AddMonths', arguments: [-1] },
      { type: 'FunctionType.Transformer', name: 'Date.Format', arguments: ['Do MMMM, YYYY'] },
    ]);
  });
});

describe('Check your answers expenses summary', () => {
  // Looks up by Format template rather than a row index, so this doesn't break if rows are reordered.
  function summaryRowKeyTextByTemplate(summaryList: unknown, expectedTemplate: string): unknown {
    const rows = (summaryList as { rows: { key: { text: unknown } }[] }).rows;
    const row = rows.find((r) => (r.key.text as Partial<FormatGeneratorExpr>).arguments?.[0] === expectedTemplate);
    if (!row) {
      throw new Error(`No summary row found with Format template: ${expectedTemplate}`);
    }
    return row.key.text;
  }

  it('shows the rolling last-calendar-month date for maintenance paid, not a hardcoded date', () => {
    const template = 'How much maintenance have you paid during the last calendar month (today back to %1)?';
    expectUsesLastCalendarMonthDate(summaryRowKeyTextByTemplate(expensesSummaryList, template), template);
  });

  it('shows the rolling last-calendar-month date for legal aid contributions, not a hardcoded date', () => {
    const template = 'Are you currently paying towards legal aid for criminal defence? If so, how much have you paid during the last calendar month (today back to %1)?';
    expectUsesLastCalendarMonthDate(summaryRowKeyTextByTemplate(expensesSummaryList, template), template);
  });

  it('shows the rolling last-calendar-month date for the partner\'s maintenance paid, not a hardcoded date', () => {
    const template = 'How much maintenance has your partner paid during the last calendar month (today back to %1)?';
    expectUsesLastCalendarMonthDate(summaryRowKeyTextByTemplate(partnerExpensesSummaryList, template), template);
  });

  it('shows the rolling last-calendar-month date for the partner\'s legal aid contributions, not a hardcoded date', () => {
    const template = 'Is your partner currently paying towards legal aid for criminal defence? If so, how much has your partner paid in the last calendar month (today back to %1)?';
    expectUsesLastCalendarMonthDate(summaryRowKeyTextByTemplate(partnerExpensesSummaryList, template), template);
  });
});
