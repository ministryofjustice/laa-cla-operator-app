import { expect } from 'chai';
import { ExpressionType } from '@ministryofjustice/hmpps-forge/core/authoring';
import type { PredicateExpr, ReferenceExpr } from '@ministryofjustice/hmpps-forge/core/authoring';
import {
  aboutYouSummaryList,
  benefitsSummaryList,
  financesHeading,
  noPropertiesSummaryList,
  savingsSummaryList,
  undisputedSavingsSummaryList,
  partnerSavingsSummaryList,
  partnerUndisputedSavingsSummaryList,
  disputedSavingsSummaryList,
  disregardsSummaryList,
  incomeHeading,
  incomeSummaryList,
  partnerIncomeSummaryList,
  dependantsSummaryList,
  partnerDependantsSummaryList,
  expensesHeading,
  expensesSummaryList,
  partnerExpensesSummaryList,
} from '#packages/cfe-eligibility-journey/src/checkAnswersPage/checkAnswersBlock.js';

/**
 * Reads the `answers.*` path off a reference expression, if it is one.
 * @param {unknown} value The value to check, which may or may not be a reference expression
 * @returns {string[]} A single-item array with the dotted answer path, or an empty array
 */
function answerPathFromReference(value: unknown): string[] {
  const ref = value as Partial<ReferenceExpr> | undefined;
  if (ref?.type === ExpressionType.REFERENCE && Array.isArray(ref.path) && ref.path[0] === 'answers') {
    return [ref.path.slice(1).join('.')];
  }
  return [];
}

/**
 * Collects the `answers.*` paths referenced by every `Answer(...).match(...)` test
 * nested anywhere within a predicate tree (AND/OR/XOR/NOT), regardless of nesting depth.
 * Answers referenced as the test's subject (`Answer('x').match(...)`) and as a condition
 * argument (`Answer('y').match(Condition.Array.IsIn(Answer('x')))`) are both included.
 * @param {PredicateExpr} predicate The predicate expression to walk
 * @returns {string[]} The dotted answer paths referenced by the predicate
 */
function referencedAnswerPaths(predicate: PredicateExpr): string[] {
  // PredicateType is a TS-only enum (not exported at runtime), so its string values are used directly
  if (predicate.type === 'PredicateType.Test') {
    const conditionArguments = (predicate.condition as { arguments?: unknown[] }).arguments ?? [];
    return [...answerPathFromReference(predicate.subject), ...conditionArguments.flatMap(answerPathFromReference)];
  }
  if (predicate.type === 'PredicateType.Not') {
    return referencedAnswerPaths(predicate.operand);
  }
  if (predicate.type === ExpressionType.ITERATE) {
    return referencedAnswerPaths(predicate.iterator.predicate);
  }
  return predicate.operands.flatMap(referencedAnswerPaths);
}

function partnerRowVisibleWhen(): PredicateExpr {
  return rowVisibleWhen(aboutYouSummaryList.rows, 'Do you have a partner?');
}

/**
 * Finds a summary list row by its key text and returns its `visibleWhen` predicate.
 * @param {unknown} rows The summary list's rows to search
 * @param {string} keyText The row's key text to match
 * @returns {PredicateExpr} The row's visibleWhen predicate
 */
function rowVisibleWhen(rows: unknown, keyText: string): PredicateExpr {
  if (!Array.isArray(rows)) {
    throw new Error('Expected summary list rows to be a static array');
  }
  const row = (rows as { key?: { text?: unknown }; visibleWhen?: unknown }[]).find((r) => r.key?.text === keyText);
  if (!row?.visibleWhen) {
    throw new Error(`Expected the "${keyText}" row to have a visibleWhen predicate`);
  }
  return row.visibleWhen as PredicateExpr;
}

/**
 * Reads a block's own top-level `visibleWhen` predicate (as opposed to a row's).
 * @param {{ visibleWhen?: unknown }} block The block (summary list or heading) to read from
 * @returns {PredicateExpr} The block's visibleWhen predicate
 */
function blockVisibleWhen(block: { visibleWhen?: unknown }): PredicateExpr {
  if (!block.visibleWhen) {
    throw new Error('Expected the block to have a visibleWhen predicate');
  }
  return block.visibleWhen as PredicateExpr;
}

describe('Check your answers: "Do you have a partner?" row visibility', () => {
  it('checks the actual under-18 answer, not just its follow-up sub-answers', () => {
    // Regression guard for EL-3460: the row was previously hidden for any adult whose
    // under-18-only follow-up answers defaulted to "no", because the predicate never
    // looked at the "under-18" answer itself.
    expect(referencedAnswerPaths(partnerRowVisibleWhen())).to.include('under-18');
  });

});

describe('Check your answers: other rows with conditional visibility', () => {
  describe('"About you" card rows depending on the under-18 branch', () => {
    const cases: { keyText: string; expectedAnswers: string[] }[] = [
      { keyText: 'Do you receive any money on a regular basis?', expectedAnswers: ['under-18'] },
      {
        keyText: 'Do you have any savings, items of value or investments totalling £2500 or more?',
        expectedAnswers: ['under-18', 'under-18-receives-regular-payment'],
      },
      {
        keyText: 'Are you or your partner aged 60 or over?',
        expectedAnswers: ['has-partner', 'under-18', 'under-18-receives-regular-payment', 'under-18-has-valuables'],
      },
      {
        keyText: 'Are you aged over 60?',
        expectedAnswers: ['has-partner', 'under-18', 'under-18-receives-regular-payment', 'under-18-has-valuables'],
      },
    ];

    cases.forEach(({ keyText, expectedAnswers }) => {
      it(`"${keyText}" references ${expectedAnswers.join(', ')}`, () => {
        expect(referencedAnswerPaths(rowVisibleWhen(aboutYouSummaryList.rows, keyText))).to.include.members(expectedAnswers);
      });
    });
  });

  describe('Cards gated on under18Passported', () => {
    const cases: { name: string; block: { visibleWhen?: unknown } }[] = [
      { name: 'benefitsSummaryList', block: benefitsSummaryList },
      { name: 'financesHeading', block: financesHeading },
      { name: 'noPropertiesSummaryList', block: noPropertiesSummaryList },
      { name: 'disregardsSummaryList', block: disregardsSummaryList },
    ];

    cases.forEach(({ name, block }) => {
      it(`${name} references under-18`, () => {
        expect(referencedAnswerPaths(blockVisibleWhen(block))).to.include('under-18');
      });
    });
  });

  describe('Savings cards gated on under18Passported and category', () => {
    const cases: { name: string; block: { visibleWhen?: unknown }; expectedAnswers: string[] }[] = [
      { name: 'savingsSummaryList', block: savingsSummaryList, expectedAnswers: ['under-18', 'category'] },
      { name: 'undisputedSavingsSummaryList', block: undisputedSavingsSummaryList, expectedAnswers: ['under-18', 'category'] },
      { name: 'disputedSavingsSummaryList', block: disputedSavingsSummaryList, expectedAnswers: ['under-18', 'category'] },
      {
        name: 'partnerSavingsSummaryList',
        block: partnerSavingsSummaryList,
        expectedAnswers: ['has-partner', 'under-18', 'category'],
      },
      {
        name: 'partnerUndisputedSavingsSummaryList',
        block: partnerUndisputedSavingsSummaryList,
        expectedAnswers: ['has-partner', 'under-18', 'category'],
      },
    ];

    cases.forEach(({ name, block, expectedAnswers }) => {
      it(`${name} references ${expectedAnswers.join(', ')}`, () => {
        expect(referencedAnswerPaths(blockVisibleWhen(block))).to.include.members(expectedAnswers);
      });
    });
  });

  describe('Income/expenses cards gated on under18Passported and benefitsPassported', () => {
    const passportingAnswers = [
      'under-18',
      'under-18-receives-regular-payment',
      'under-18-has-valuables',
      'universal-credit',
      'income-support',
      'income-based-jsa',
      'pension-credit',
      'employment-support',
    ];
    const cases: { name: string; block: { visibleWhen?: unknown }; expectedAnswers: string[] }[] = [
      { name: 'incomeHeading', block: incomeHeading, expectedAnswers: passportingAnswers },
      { name: 'incomeSummaryList', block: incomeSummaryList, expectedAnswers: passportingAnswers },
      { name: 'expensesHeading', block: expensesHeading, expectedAnswers: passportingAnswers },
      { name: 'expensesSummaryList', block: expensesSummaryList, expectedAnswers: passportingAnswers },
      { name: 'dependantsSummaryList', block: dependantsSummaryList, expectedAnswers: [...passportingAnswers, 'has-partner'] },
      {
        name: 'partnerIncomeSummaryList',
        block: partnerIncomeSummaryList,
        expectedAnswers: [...passportingAnswers, 'has-partner'],
      },
      {
        name: 'partnerDependantsSummaryList',
        block: partnerDependantsSummaryList,
        expectedAnswers: [...passportingAnswers, 'has-partner'],
      },
      {
        name: 'partnerExpensesSummaryList',
        block: partnerExpensesSummaryList,
        expectedAnswers: [...passportingAnswers, 'has-partner'],
      },
    ];

    cases.forEach(({ name, block, expectedAnswers }) => {
      it(`${name} references ${expectedAnswers.join(', ')}`, () => {
        expect(referencedAnswerPaths(blockVisibleWhen(block))).to.include.members(expectedAnswers);
      });
    });
  });

  describe('Disregards rows depending on the disregards answer', () => {
    const cases: string[] = ['Disregards selected'];

    cases.forEach((keyText) => {
      it(`"${keyText}" rows reference disregards`, () => {
        const { rows } = disregardsSummaryList;
        if (!Array.isArray(rows)) {
          throw new Error('Expected summary list rows to be a static array');
        }
        const matchingRows = rows.filter((row) => row.key?.text === keyText && row.visibleWhen);
        expect(matchingRows).to.have.length.greaterThan(0);
        matchingRows.forEach((row) => {
          expect(referencedAnswerPaths(row.visibleWhen as PredicateExpr)).to.include('disregards');
        });
      });
    });
  });
});
