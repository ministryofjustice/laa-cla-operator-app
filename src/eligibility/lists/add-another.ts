// Add-another lists (CCQ's `AddAnotherable` forms): incomes, benefits, bank
// accounts and their partner equivalents.
//
// Forge reads posted values by literal field name, so each row's fields are
// flat (`incomes_0_gross_income`) while the session, and so the CFE payload
// builders, hold CCQ's shape (`incomes: [{ gross_income }]`). This module
// converts between the two and describes the rows a step renders.
import type { Answers } from "../domain/logic.js";

export type FieldKind = "text" | "amount" | "checkbox" | "boolean";

/** What a step needs to render one row: field codes, wording and layout. */
export type RowDescriptor = Record<string, unknown>;

export interface AddAnotherList {
  /** The session key the rows are saved under, as in CCQ's `ITEMS_SESSION_KEY`. */
  key: string;
  /** The `Data` key the row descriptors are published under. */
  rowsData: string;
  /** The row's fields. */
  fields: Readonly<Record<string, FieldKind>>;
  /** What a newly added row holds before anything is entered. */
  blankRow?: Readonly<Record<string, unknown>>;
  /** Maximum rows, when the list's size depends on earlier answers. */
  maxRows?: (answers: Answers) => number;
  /** Builds the descriptor for the row at `index` in a list of `rowCount` rows. */
  describeRow: (
    index: number,
    rowCount: number,
    answers?: Answers,
  ) => RowDescriptor;
}

export type Row = Record<string, unknown>;

/** The position of the first row, which is never removed. */
export const FIRST_ROW = 0;
const NO_ROWS = 0;
const MIN_ROWS = 1;
const NEXT_INDEX = 1;

/**
 * The flat form field code for one field of one row.
 * @param {string} key - the list's session key
 * @param {number} index - the zero-based row position
 * @param {string} field - the row field name
 * @returns {string} the field code
 */
export function rowFieldCode(
  key: string,
  index: number,
  field: string,
): string {
  return `${key}_${index}_${field}`;
}

/**
 * The saved rows of a list.
 * @param {AddAnotherList} list - the list
 * @param {Answers} answers - the saved answers
 * @returns {Row[]} the rows, skipping anything that is not a row object
 */
export function savedRows(list: AddAnotherList, answers: Answers): Row[] {
  const { [list.key]: saved } = answers;
  if (!Array.isArray(saved)) return [];
  return Array.from(saved as unknown[]).filter(
    (row): row is Row =>
      typeof row === "object" && row !== null && !Array.isArray(row),
  );
}

/**
 * How many rows to show: one per saved row, and always at least one.
 * @param {AddAnotherList} list - the list
 * @param {Answers} answers - the saved answers
 * @returns {number} the row count
 */
export function rowCountFor(list: AddAnotherList, answers: Answers): number {
  const count = Math.max(savedRows(list, answers).length, MIN_ROWS);
  return list.maxRows === undefined
    ? count
    : Math.min(count, Math.max(list.maxRows(answers), NO_ROWS));
}

/**
 * Whether another row can be added without exceeding the list's limit.
 * @param {AddAnotherList} list - the list
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether another row is available
 */
export function canAddRows(list: AddAnotherList, answers: Answers): boolean {
  return (
    list.maxRows === undefined ||
    savedRows(list, answers).length < Math.max(list.maxRows(answers), NO_ROWS)
  );
}

/**
 * Describes each row to render.
 * @param {AddAnotherList} list - the list
 * @param {Answers} answers - the saved answers
 * @returns {RowDescriptor[]} one descriptor per row
 */
export function describeRows(
  list: AddAnotherList,
  answers: Answers,
): RowDescriptor[] {
  const rowCount = rowCountFor(list, answers);
  return Array.from({ length: rowCount }, (_, index) =>
    list.describeRow(index, rowCount, answers),
  );
}

/**
 * Turns saved rows into the flat answers the row fields are pre-filled from.
 * @param {AddAnotherList} list - the list
 * @param {Answers} answers - the saved answers
 * @returns {Answers} the flat form answers
 */
export function formAnswersFor(
  list: AddAnotherList,
  answers: Answers,
): Answers {
  const flat: Answers = {};
  savedRows(list, answers).forEach((row, index) => {
    for (const [field, kind] of Object.entries(list.fields)) {
      const { [field]: value } = row;
      if (kind === "checkbox") {
        // Forge only ticks a checkbox whose value is a list of its options.
        if (value === true) {
          flat[rowFieldCode(list.key, index, field)] = ["true"];
        }
      } else if (kind === "boolean") {
        if (typeof value === "boolean") {
          flat[rowFieldCode(list.key, index, field)] = String(value);
        }
      } else if (typeof value === "string" || typeof value === "number") {
        flat[rowFieldCode(list.key, index, field)] = String(value);
      }
    }
  });
  return flat;
}

/**
 * Reads an amount field: a number when it is one, otherwise as typed, so
 * validation errors can still quote what the operator entered.
 * @param {unknown} value - the posted value
 * @returns {unknown} the number, or the original value
 */
export function readAmount(value: unknown): unknown {
  if (typeof value !== "string" || value.trim() === "") return value;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : value;
}

/**
 * Whether a checkbox field was ticked.
 * @param {unknown} value - the posted value
 * @returns {boolean} whether it is checked
 */
function isChecked(value: unknown): boolean {
  return (
    value === true ||
    value === "true" ||
    (Array.isArray(value) && value.includes("true"))
  );
}

/**
 * Reads one row field from the flat form answers.
 * @param {FieldKind} kind - how the field is read
 * @param {unknown} value - the posted value
 * @returns {unknown} the value as saved, or undefined when there is none
 */
function readField(kind: FieldKind, value: unknown): unknown {
  if (kind === "checkbox") return isChecked(value) ? true : undefined;
  if (kind === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return undefined;
  }
  return kind === "amount" ? readAmount(value) : value;
}

/**
 * Converts one list's flat form fields to a rows array.
 * @param {AddAnotherList} list - the list
 * @param {Answers} answers - answers as Forge holds them
 * @returns {Answers} the answers with the list's flat fields replaced by its rows
 */
function collapseList(list: AddAnotherList, answers: Answers): Answers {
  const fieldNames = Object.keys(list.fields).join("|");
  const pattern = new RegExp(
    `^${list.key}_(?<index>\\d+)_(?:${fieldNames})$`,
    "u",
  );
  const indexes = Object.keys(answers)
    .map((key) => pattern.exec(key)?.groups?.index)
    .filter((index): index is string => index !== undefined)
    .map(Number);

  if (indexes.length === NO_ROWS) return answers;

  const collapsed = Object.fromEntries(
    Object.entries(answers).filter(([key]) => !pattern.test(key)),
  );
  const rowLimit =
    list.maxRows === undefined
      ? Math.max(...indexes) + NEXT_INDEX
      : Math.max(list.maxRows(answers), NO_ROWS);
  collapsed[list.key] = Array.from(
    { length: Math.min(Math.max(...indexes) + NEXT_INDEX, rowLimit) },
    (_, index) =>
      Object.fromEntries(
        Object.entries(list.fields)
          .map(([field, kind]): [string, unknown] => [
            field,
            readField(kind, answers[rowFieldCode(list.key, index, field)]),
          ])
          .filter(([, value]) => value !== undefined),
      ),
  );
  return collapsed;
}

/**
 * Converts every list's flat form fields to rows arrays.
 * @param {readonly AddAnotherList[]} lists - the lists to convert
 * @param {Answers} answers - answers as Forge holds them
 * @returns {Answers} the answers with each list's fields collapsed to its rows
 */
export function collapseLists(
  lists: readonly AddAnotherList[],
  answers: Answers,
): Answers {
  return lists.reduce((current, list) => collapseList(list, current), answers);
}

/**
 * Adds a blank row to the end of a list.
 * @param {AddAnotherList} list - the list
 * @param {Answers} answers - the saved answers
 * @returns {Row[]} the rows, with a new blank row last
 */
export function withBlankRow(list: AddAnotherList, answers: Answers): Row[] {
  const rows = savedRows(list, answers);
  return canAddRows(list, answers) ? [...rows, { ...list.blankRow }] : rows;
}

/**
 * Removes a row from a list. The first row is never removed, as every list
 * asks for at least one.
 * @param {AddAnotherList} list - the list
 * @param {Answers} answers - the saved answers
 * @param {number} index - the zero-based row to remove
 * @returns {Row[]} the remaining rows
 */
export function withoutRow(
  list: AddAnotherList,
  answers: Answers,
  index: number,
): Row[] {
  const rows = savedRows(list, answers);
  return index > FIRST_ROW
    ? rows.filter((_, position) => position !== index)
    : rows;
}
