import type { AddAnotherList } from "./add-another.js";
import { BANK_ACCOUNTS_LIST } from "./bank-accounts.js";
import {
  BENEFITS_LIST,
  INCOMES_LIST,
  PARTNER_BENEFITS_LIST,
  PARTNER_INCOMES_LIST,
} from "./income-lists.js";
import {
  ADDITIONAL_PROPERTIES_LIST,
  PARTNER_ADDITIONAL_PROPERTIES_LIST,
} from "./property-lists.js";

export {
  BANK_ACCOUNTS_LIST,
  BENEFITS_LIST,
  INCOMES_LIST,
  PARTNER_BENEFITS_LIST,
  PARTNER_INCOMES_LIST,
  ADDITIONAL_PROPERTIES_LIST,
  PARTNER_ADDITIONAL_PROPERTIES_LIST,
};

export const ADD_ANOTHER_LISTS: readonly AddAnotherList[] = [
  BANK_ACCOUNTS_LIST,
  INCOMES_LIST,
  PARTNER_INCOMES_LIST,
  BENEFITS_LIST,
  PARTNER_BENEFITS_LIST,
  ADDITIONAL_PROPERTIES_LIST,
  PARTNER_ADDITIONAL_PROPERTIES_LIST,
];

/**
 * Finds a list by its session key.
 * @param {string} key - the list's session key
 * @returns {AddAnotherList} the list
 */
export function listFor(key: string): AddAnotherList {
  const list = ADD_ANOTHER_LISTS.find((candidate) => candidate.key === key);
  if (list === undefined) throw new Error(`Unknown add-another list: ${key}`);
  return list;
}
