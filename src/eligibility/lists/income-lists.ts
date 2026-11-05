import eligibilityCopy from "../locales/en.json" with { type: "json" };
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
    heading: row.heading,
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
        heading: eligibilityCopy.dynamic.lists.incomeHeading.replace(
          "%1",
          String(index + FIRST_POSITION),
        ),
        fields: INCOME_FIELDS,
        messages: (position) => ({
          income_type: {
            required: named(
              eligibilityCopy.dynamic.lists.employmentTypeRequired,
              (n) =>
                eligibilityCopy.dynamic.lists.employmentTypeRequiredMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
          },
          income_frequency: {
            required: named(
              eligibilityCopy.dynamic.lists.incomeFrequencyRequired.replace(
                "%1",
                wording.subject,
              ),
              (n) =>
                eligibilityCopy.dynamic.lists.incomeFrequencyRequiredMany
                  .replace("%1", wording.subject)
                  .replace("%2", String(n)),
              position,
            ),
          },
          gross_income: {
            required: named(
              eligibilityCopy.dynamic.lists.grossRequired,
              (n) =>
                eligibilityCopy.dynamic.lists.grossRequiredMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            notANumber: named(
              eligibilityCopy.dynamic.lists.grossNumber,
              (n) =>
                eligibilityCopy.dynamic.lists.grossNumberMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            greaterThanZero: named(
              eligibilityCopy.dynamic.lists.grossGreaterThanZero,
              (n) =>
                eligibilityCopy.dynamic.lists.grossGreaterThanZeroMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            netPositive: named(
              eligibilityCopy.dynamic.lists.grossNetPositive,
              (n) =>
                eligibilityCopy.dynamic.lists.grossNetPositiveMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
          },
          income_tax: {
            required: named(
              eligibilityCopy.dynamic.lists.taxRequired,
              (n) =>
                eligibilityCopy.dynamic.lists.taxRequiredMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            notANumber: named(
              eligibilityCopy.dynamic.lists.taxNumber,
              (n) =>
                eligibilityCopy.dynamic.lists.taxNumberMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            zeroOrMore: named(
              eligibilityCopy.dynamic.lists.taxZeroOrMore,
              (n) =>
                eligibilityCopy.dynamic.lists.taxZeroOrMoreMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
          },
          national_insurance: {
            required: named(
              eligibilityCopy.dynamic.lists.nationalInsuranceRequired,
              (n) =>
                eligibilityCopy.dynamic.lists.nationalInsuranceRequiredMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            notANumber: named(
              eligibilityCopy.dynamic.lists.nationalInsuranceNumber,
              (n) =>
                eligibilityCopy.dynamic.lists.nationalInsuranceNumberMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            zeroOrMore: named(
              eligibilityCopy.dynamic.lists.nationalInsuranceZeroOrMore,
              (n) =>
                eligibilityCopy.dynamic.lists.nationalInsuranceZeroOrMoreMany.replace(
                  "%1",
                  String(n),
                ),
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
        heading: eligibilityCopy.dynamic.lists.benefitHeading.replace(
          "%1",
          String(index + FIRST_POSITION),
        ),
        fields: BENEFIT_FIELDS,
        messages: (position) => ({
          benefit_type: {
            required: named(
              eligibilityCopy.dynamic.lists.benefitTypeRequired,
              (n) =>
                eligibilityCopy.dynamic.lists.benefitTypeRequiredMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
          },
          benefit_amount: {
            required: named(
              eligibilityCopy.dynamic.lists.benefitAmountRequired,
              (n) =>
                eligibilityCopy.dynamic.lists.benefitAmountRequiredMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            notANumber: named(
              eligibilityCopy.dynamic.lists.benefitAmountNumber,
              (n) =>
                eligibilityCopy.dynamic.lists.benefitAmountNumberMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
            greaterThanZero: named(
              eligibilityCopy.dynamic.lists.benefitAmountGreaterThanZero,
              (n) =>
                eligibilityCopy.dynamic.lists.benefitAmountGreaterThanZeroMany.replace(
                  "%1",
                  String(n),
                ),
              position,
            ),
          },
          benefit_frequency: {
            required: named(
              eligibilityCopy.dynamic.lists.benefitFrequencyRequired.replace(
                "%1",
                wording.subject,
              ),
              (n) =>
                eligibilityCopy.dynamic.lists.benefitFrequencyRequiredMany
                  .replace("%1", wording.subject)
                  .replace("%2", String(n)),
              position,
            ),
          },
        }),
      }),
  };
}

/** The client's employment incomes. */
export const INCOMES_LIST = incomeList("incomes", {
  subject: eligibilityCopy.your_client,
});
/** The partner's employment incomes. */
export const PARTNER_INCOMES_LIST = incomeList("partner_incomes", {
  subject: eligibilityCopy.the_partner,
});
/** The client's benefits. */
export const BENEFITS_LIST = benefitList("benefits", {
  subject: eligibilityCopy.your_client,
});
/** The partner's benefits. */
export const PARTNER_BENEFITS_LIST = benefitList("partner_benefits", {
  subject: eligibilityCopy.the_partner,
});
