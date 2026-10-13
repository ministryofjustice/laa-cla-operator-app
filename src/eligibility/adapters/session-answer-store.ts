import type { Request } from "express";
import type { AnswerStore } from "../ports/answer-store.js";
import type { Answers } from "../domain/logic.js";

// Thread-local storage for the current request (set by middleware)
let currentRequest: Request | null = null;

/**
 * Sets the current request context for session access.
 *
 * @param req - The express request object
 */
export function setCurrentRequest(req: Request): void {
  currentRequest = req;
}

/**
 * Session-based answer store for the eligibility journey.
 */
export class SessionAnswerStore implements AnswerStore {
  /**
   * Loads previously saved answers for a check.
   *
   * @param checkId - The eligibility check ID
   * @returns The saved answers or empty object if none exist
   */
  // Async required by AnswerStore interface
  // eslint-disable-next-line @typescript-eslint/require-await
  async load(checkId: unknown): Promise<Answers> {
    const session = this.getSession();
    const saved = session.eligibility?.[String(checkId)];
    if (
      saved !== null &&
      saved !== undefined &&
      typeof saved === "object" &&
      !Array.isArray(saved)
    ) {
      // Type guard: verified this is an Answers object
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      return saved as Answers;
    }
    return {};
  }

  /**
   * Saves answers for a check.
   *
   * @param checkId - The eligibility check ID
   * @param partial - The answers to save
   */
  // Async required by AnswerStore interface
  // eslint-disable-next-line @typescript-eslint/require-await
  async save(checkId: unknown, partial: Answers): Promise<void> {
    const session = this.getSession();
    const checkIdStr = String(checkId);

    session.eligibility ??= {};

    const current = session.eligibility[checkIdStr] ?? {};
    const merged = { ...current, ...partial };

    // Convert flat add-another field names to lists
    const normalized = this.normalizeAddAnotherFields(merged);

    session.eligibility[checkIdStr] = normalized;
  }

  /**
   * Clears saved answers for a check.
   *
   * @param checkId - The eligibility check ID
   */
  // Async required by AnswerStore interface
  // eslint-disable-next-line @typescript-eslint/require-await
  async clear(checkId: unknown): Promise<void> {
    const session = this.getSession();
    // Only delete if eligibility object exists
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (session.eligibility !== null && session.eligibility !== undefined) {
      // Dynamic delete needed for session cleanup
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete session.eligibility[String(checkId)];
    }
  }

  /**
   * Gets the current session object.
   *
   * @returns The session object
   * @throws Error if no request context is available
   */
  private getSession(): Record<string, unknown> & { eligibility?: Record<string, unknown> } {
    if (currentRequest === null || currentRequest === undefined) {
      throw new Error("SessionAnswerStore: no request context available");
    }
    return currentRequest.session;
  }

  /**
   * Normalizes add-another list fields from flat names to arrays.
   *
   * Converts field names like `items_0_name` to `{ items: [{ name: value }] }`
   *
   * @param answers - The answers object with flat field names
   * @returns The normalized answers with list arrays
   */
  private normalizeAddAnotherFields(answers: Answers): Answers {
    const result = { ...answers };

    // Collect flat field names into lists
    // Pattern: <list_name>_<index>_<field_name> -> { <list_name>: [{ <field_name>: value }] }
    const fieldPattern = /^(?<listName>[a-z_]+)_(?<index>\d+)_(?<fieldName>[a-z_]+)$/u;
    const listsByName = new Map<string, Map<number, Record<string, unknown>>>();

    for (const [key, value] of Object.entries(result)) {
      const match = fieldPattern.exec(key);
      if (match?.groups !== undefined) {
        const { listName, index: indexStr, fieldName } = match.groups;
        const index = Number(indexStr);

        if (!listsByName.has(listName)) {
          listsByName.set(listName, new Map());
        }

        const rows = listsByName.get(listName);
        if (rows !== undefined) {
          if (!rows.has(index)) {
            rows.set(index, {});
          }

          const row = rows.get(index);
          if (row !== undefined) {
            row[fieldName] = value;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete result[key];
      }
    }

    // Convert maps to arrays
    for (const [listName, rows] of listsByName) {
      const sortedIndices = Array.from(rows.keys()).sort((a, b) => a - b);
      result[listName] = sortedIndices
        .map((i) => rows.get(i))
        .filter((row): row is Record<string, unknown> => row !== undefined);
    }

    return result;
  }
}

