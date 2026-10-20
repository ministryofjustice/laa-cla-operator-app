// The income and benefit add-another lists. The error wording is CCQ's
// (`activemodel.errors.models.{partner_}{income,benefit}_model`): once a list
// has several rows, each message names the row it is about.
import type { AddAnotherList, RowDescriptor } from "./add-another.js";
import { FIRST_ROW, rowFieldCode } from "./add-another.js";

const FIRST_POSITION = 1;
const MANY_ROWS = 1;

type MessageTable = Record<string, Record<string, string>>;

interface Wording {
  /** "your client" or "the partner", as in CCQ's per-subject error copy. */
  subject: string;
}

/**
 * Describes one row: its heading, field codes, and its error messages.
 * @param {object} row - the row to describe
 * @param {string} row.key - the list's session key
 * @param {number} row.index - the zero-based row position
 * @param {number} row.rowCount - how many rows the list has
 * @param {string} row.heading - the row heading without its position
 * @param {readonly string[]} row.fields - the row field names
 * @param {(position: number | undefined) => MessageTable} row.messages - builds the error messages, given the row position when there are several rows
 * @returns {RowDescriptor} the row descriptor
 */
function describeRow(row: {
  key: string;
  index: number;
  rowCount: number;
  heading: string;
  fields: readonly string[];
  messages: (position: number | undefined) => MessageTable;
}): RowDescriptor {
  const position = row.index + FIRST_POSITION;
  return {
    index: row.index,
    position,
    heading: `${row.heading} ${position}`,
    removable: row.index > FIRST_ROW,
    codes: Object.fromEntries(
      row.fields.map((field) => [
        field,
        rowFieldCode(row.key, row.index, field),
      ]),
    ),
    messages: row.messages(row.rowCount > MANY_ROWS ? position : undefined),
  };
}

/**
 * A message that names the row once the list has several.
 * @param {string} single - the message for a list of one row
 * @param {(position: number) => string} many - the message for a row of several
 * @param {number | undefined} position - the row position, when there are several rows
 * @returns {string} the message to show
 */
function named(
  single: string,
  many: (position: number) => string,
  position: number | undefined,
): string {
  return position === undefined ? single : many(position);
}

const INCOME_FIELDS = [
  "income_type",
  "income_frequency",
  "gross_income",
  "income_tax",
  "national_insurance",
] as const;

/**
 * Builds a list of income rows.
 * @param {string} key - the session key, `incomes` or `partner_incomes`
 * @param {Wording} wording - who the income belongs to
 * @returns {AddAnotherList} the list
 */
function incomeList(key: string, wording: Wording): AddAnotherList {
  return {
    key,
    rowsData: `${key}Rows`,
    fields: {
      income_type: "text",
      income_frequency: "text",
      gross_income: "amount",
      income_tax: "amount",
      national_insurance: "amount",
    },
    describeRow: (index, rowCount) =>
      describeRow({
        key,
        index,
        rowCount,
        heading: "Employment income",
        fields: INCOME_FIELDS,
        messages: (position) => ({
          income_type: {
            required: named(
              "Select the employment income type",
              (n) =>
                `Select the employment income type for employment income ${n}`,
              position,
            ),
          },
          income_frequency: {
            required: named(
              `Select when ${wording.subject} normally gets this income`,
              (n) => `Select when ${wording.subject} normally gets income ${n}`,
              position,
            ),
          },
          gross_income: {
            required: named(
              "Enter the income before any deductions",
              (n) =>
                `Enter the income before any deductions for employment income ${n}`,
              position,
            ),
            notANumber: named(
              "Income before any deductions must be a number",
              (n) =>
                `Income before any deductions for employment income ${n} must be a number`,
              position,
            ),
            greaterThanZero: named(
              "Income before any deductions must be more than 0",
              (n) =>
                `Income before any deductions for employment income ${n} must be more than 0`,
              position,
            ),
            netPositive: named(
              "Income before any deductions must be more than income tax and National Insurance combined",
              (n) =>
                `Income before any deductions for employment income ${n} must be more than income tax and National Insurance combined`,
              position,
            ),
          },
          income_tax: {
            required: named(
              "Enter the income tax amount",
              (n) => `Enter the income tax amount for employment income ${n}`,
              position,
            ),
            notANumber: named(
              "Income tax amount must be a number",
              (n) =>
                `Income tax amount for employment income ${n} must be a number`,
              position,
            ),
            zeroOrMore: named(
              "Income tax amount must be 0 or more",
              (n) =>
                `Income tax amount for employment income ${n} must be 0 or more`,
              position,
            ),
          },
          national_insurance: {
            required: named(
              "Enter the National Insurance amount",
              (n) =>
                `Enter the National Insurance amount for employment income ${n}`,
              position,
            ),
            notANumber: named(
              "National Insurance amount must be a number",
              (n) =>
                `National Insurance amount for employment income ${n} must be a number`,
              position,
            ),
            zeroOrMore: named(
              "National Insurance amount must be 0 or more",
              (n) =>
                `National Insurance amount for employment income ${n} must be 0 or more`,
              position,
            ),
          },
        }),
      }),
  };
}

const BENEFIT_FIELDS = [
  "benefit_type",
  "benefit_amount",
  "benefit_frequency",
] as const;

/**
 * Builds a list of benefit rows.
 * @param {string} key - the session key, `benefits` or `partner_benefits`
 * @param {Wording} wording - who the benefits belong to
 * @returns {AddAnotherList} the list
 */
function benefitList(key: string, wording: Wording): AddAnotherList {
  return {
    key,
    rowsData: `${key}Rows`,
    fields: {
      benefit_type: "text",
      benefit_amount: "amount",
      benefit_frequency: "text",
    },
    describeRow: (index, rowCount) =>
      describeRow({
        key,
        index,
        rowCount,
        heading: "Benefit",
        fields: BENEFIT_FIELDS,
        messages: (position) => ({
          benefit_type: {
            required: named(
              "Select the benefit name",
              (n) => `Select benefit ${n} name`,
              position,
            ),
          },
          benefit_amount: {
            required: named(
              "Enter benefit amount",
              (n) => `Enter benefit amount for benefit ${n}`,
              position,
            ),
            notANumber: named(
              "Benefit amount must be a number",
              (n) => `Benefit amount for benefit ${n} must be a number`,
              position,
            ),
            greaterThanZero: named(
              "Benefit amount must be more than 0",
              (n) => `Benefit amount for benefit ${n} must be more than 0`,
              position,
            ),
          },
          benefit_frequency: {
            required: named(
              `Select when ${wording.subject} normally gets this benefit`,
              (n) =>
                `Select when ${wording.subject} normally gets benefit ${n}`,
              position,
            ),
          },
        }),
      }),
  };
}

/** The client's employment incomes. */
export const INCOMES_LIST = incomeList("incomes", { subject: "your client" });
/** The partner's employment incomes. */
export const PARTNER_INCOMES_LIST = incomeList("partner_incomes", {
  subject: "the partner",
});
/** The client's benefits. */
export const BENEFITS_LIST = benefitList("benefits", {
  subject: "your client",
});
/** The partner's benefits. */
export const PARTNER_BENEFITS_LIST = benefitList("partner_benefits", {
  subject: "the partner",
});
