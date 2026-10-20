import eligibilityCopy from "../locales/en.json" with { type: "json" };
import { smodApplicable } from "../domain/logic.js";
import type {
  AddAnotherList,
  FieldKind,
  RowDescriptor,
} from "./add-another.js";
import { FIRST_ROW, rowFieldCode } from "./add-another.js";

const FIRST_POSITION = 1;

/**
 * Bank accounts, as CCQ's `BankAccountModel` rows on the assets forms. Only
 * the client's accounts can be a subject matter of dispute, and only when
 * that applies to the check.
 * @param {string} key - the session key, as CCQ's `ITEMS_SESSION_KEY`
 * @param {string} rowsData - the `Data` key the row descriptors are published under
 * @param {"client" | "partner"} subject - whose accounts these are
 * @returns {AddAnotherList} the list
 */
function createBankAccountsList(
  key: string,
  rowsData: string,
  subject: "client" | "partner",
): AddAnotherList {
  const fields: Record<string, FieldKind> =
    subject === "client"
      ? { amount: "amount", account_in_dispute: "checkbox" }
      : { amount: "amount" };
  const { bankAccount: wording } = eligibilityCopy.dynamic;

  return {
    key,
    rowsData,
    fields,
    blankRow: { amount: "" },
    /**
     * Describes one row, with messages naming its position if there are several.
     * @param {number} index - the row's index
     * @param {number} rowCount - how many rows there are
     * @param {Record<string, unknown>} [answers] - the saved answers
     * @returns {RowDescriptor} the row
     */
    describeRow: (index, rowCount, answers = {}): RowDescriptor => {
      const position = index + FIRST_POSITION;
      const many = rowCount > FIRST_POSITION;
      /**
       * The single-row message, or the many-row one naming this row.
       * @param {string} single - the message for a single row
       * @param {string} multiple - the message with `%1` for the position
       * @returns {string} the message
       */
      const pick = (single: string, multiple: string): string =>
        many ? multiple.replace("%1", String(position)) : single;
      return {
        index,
        position,
        heading: wording.heading.replace("%1", String(position)),
        removable: index > FIRST_ROW,
        smodApplicable: subject === "client" && smodApplicable(answers),
        codes: Object.fromEntries(
          Object.keys(fields).map((field) => [
            field,
            rowFieldCode(key, index, field),
          ]),
        ),
        messages: {
          amount: {
            required: pick(wording.required, wording.requiredMany),
            notANumber: pick(wording.number, wording.numberMany),
            outOfRange: pick(wording.atLeastZero, wording.atLeastZeroMany),
          },
        },
      };
    },
  };
}

/** The client's bank accounts, listed on the assets step. */
export const BANK_ACCOUNTS_LIST = createBankAccountsList(
  "bank_accounts",
  "bankAccountRows",
  "client",
);

/** The partner's bank accounts, listed on the partner assets step. */
export const PARTNER_BANK_ACCOUNTS_LIST = createBankAccountsList(
  "partner_bank_accounts",
  "partnerBankAccountRows",
  "partner",
);
