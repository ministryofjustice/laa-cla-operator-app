import type { AddAnotherList } from "./add-another.js";
import { rowFieldCode } from "./add-another.js";

const POSITION_OFFSET = 1;

/** The client's bank accounts, listed on the assets step. */
export const BANK_ACCOUNTS_LIST: AddAnotherList = {
  key: "bank_accounts",
  rowsData: "bankAccountRows",
  fields: { amount: "amount", account_in_dispute: "checkbox" },
  blankRow: { amount: "" },
  describeRow: (index) => {
    const position = index + POSITION_OFFSET;
    return {
      heading: `Bank account ${position}`,
      amountCode: rowFieldCode("bank_accounts", index, "amount"),
      disputeCode: rowFieldCode("bank_accounts", index, "account_in_dispute"),
      requiredMessage: `Enter total money in bank account ${position}. Enter 0 if this does not apply.`,
      numberMessage: `Total money in bank account ${position} must be a number. Enter 0 if this does not apply.`,
    };
  },
};
