import eligibilityCopy from "../locales/en.json" with { type: "json" };
import type { Answers } from "../domain/logic.js";
import type { AddAnotherList, RowDescriptor } from "./add-another.js";
import { rowFieldCode } from "./add-another.js";

const FIRST_POSITION = 1;
const FIRST_ROW_INDEX = 0;
const ONE = 1;
const ZERO = 0;

/**
 * Read the positive count for a dependant type when that type is enabled.
 * @param {Answers} answers - saved journey answers
 * @param {string} answerKey - the yes/no answer code
 * @param {string} countKey - the count answer code
 * @returns {number} the validated dependant count, or zero
 */
function dependantCount(
  answers: Answers,
  answerKey: string,
  countKey: string,
): number {
  const { [answerKey]: hasDependants, [countKey]: value } = answers;
  if (hasDependants !== true && hasDependants !== "true") return ZERO;
  const count = typeof value === "number" ? value : Number(value);
  return Number.isInteger(count) && count > ZERO ? count : ZERO;
}

/**
 * Sum the dependant counts that cap the income list.
 * @param {Answers} answers - saved journey answers
 * @returns {number} the maximum number of dependant income rows
 */
function maxDependantIncomes(answers: Answers): number {
  return (
    dependantCount(answers, "adult_dependants", "adult_dependants_count") +
    dependantCount(answers, "child_dependants", "child_dependants_count")
  );
}

/**
 * Select singular or plural validation copy for a list row.
 * @param {string} single - copy for a single row
 * @param {string} multiple - copy for multiple rows
 * @param {number} rowCount - the total row count
 * @returns {string} the matching validation message
 */
function messageForRow(
  single: string,
  multiple: string,
  rowCount: number,
): string {
  return rowCount > ONE ? multiple : single;
}

/**
 * Describe one dependant income row and its validation messages.
 * @param {number} index - the zero-based row index
 * @param {number} rowCount - the total row count
 * @returns {RowDescriptor} the row description
 */
function describeRow(index: number, rowCount: number): RowDescriptor {
  const position = index + FIRST_POSITION;
  return {
    index,
    position,
    heading: eligibilityCopy.dynamic.dependants.incomeRowHeading,
    removable: index > FIRST_ROW_INDEX,
    codes: {
      amount: rowFieldCode("dependant_incomes", index, "amount"),
      frequency: rowFieldCode("dependant_incomes", index, "frequency"),
    },
    messages: {
      amount: {
        required: messageForRow(
          eligibilityCopy.dynamic.dependants.incomeAmountRequired,
          eligibilityCopy.dynamic.dependants.incomeAmountRequiredMany,
          rowCount,
        ),
        notANumber: messageForRow(
          eligibilityCopy.dynamic.dependants.incomeAmountNumber,
          eligibilityCopy.dynamic.dependants.incomeAmountNumberMany,
          rowCount,
        ),
        greaterThanZero: messageForRow(
          eligibilityCopy.dynamic.dependants.incomeAmountGreaterThanZero,
          eligibilityCopy.dynamic.dependants.incomeAmountGreaterThanZeroMany,
          rowCount,
        ),
        monthlyLimit: eligibilityCopy.dynamic.dependants.monthlyIncomeTooHigh,
        monthlyEquivalentLimit:
          eligibilityCopy.dynamic.dependants.monthlyEquivalentIncomeTooHigh,
      },
      frequency: {
        required: messageForRow(
          eligibilityCopy.dynamic.dependants.incomeFrequencyRequired,
          eligibilityCopy.dynamic.dependants.incomeFrequencyRequiredMany,
          rowCount,
        ),
      },
    },
  };
}

/** Dependant incomes, capped at the number of dependants declared earlier. */
export const DEPENDANT_INCOMES_LIST: AddAnotherList = {
  key: "dependant_incomes",
  rowsData: "dependantIncomeRows",
  fields: { amount: "amount", frequency: "text" },
  maxRows: maxDependantIncomes,
  describeRow,
};
