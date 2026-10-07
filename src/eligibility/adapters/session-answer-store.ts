import type { Request } from "express";
import type { AnswerStore } from "../ports/answer-store.js";
import type { Answers } from "../domain/logic.js";

export class SessionAnswerStore implements AnswerStore {
  constructor(private getRequest: () => Request) {}

  async load(checkId: unknown): Promise<Answers> {
    const session = this.getSession();
    const saved = session.eligibility?.[String(checkId)];
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return saved as Answers;
    }
    return {};
  }

  async save(checkId: unknown, partial: Answers): Promise<void> {
    const session = this.getSession();
    const checkIdStr = String(checkId);

    if (!session.eligibility) {
      session.eligibility = {};
    }

    const current = session.eligibility[checkIdStr] ?? {};
    const merged = { ...current, ...partial };

    // Convert flat add-another field names to lists
    const normalized = this.normalizeAddAnotherFields(merged);

    session.eligibility[checkIdStr] = normalized;
  }

  async clear(checkId: unknown): Promise<void> {
    const session = this.getSession();
    if (session.eligibility) {
      delete session.eligibility[String(checkId)];
    }
  }

  private getSession(): Record<string, unknown> & { eligibility?: Record<string, unknown> } {
    return this.getRequest().session;
  }

  private normalizeAddAnotherFields(answers: Answers): Answers {
    const result = { ...answers };

    // Collect flat field names into lists
    // Pattern: <list_name>_<index>_<field_name> -> { <list_name>: [{ <field_name>: value }] }
    const fieldPattern = /^([a-z_]+)_(\d+)_([a-z_]+)$/;
    const listsByName = new Map<
      string,
      Map<number, Record<string, unknown>>
    >();

    for (const [key, value] of Object.entries(result)) {
      const match = key.match(fieldPattern);
      if (match) {
        const [, listName, indexStr, fieldName] = match;
        const index = Number(indexStr);

        if (!listsByName.has(listName)) {
          listsByName.set(listName, new Map());
        }

        const rows = listsByName.get(listName)!;
        if (!rows.has(index)) {
          rows.set(index, {});
        }

        rows.get(index)![fieldName] = value;
        delete result[key];
      }
    }

    // Convert maps to arrays
    for (const [listName, rows] of listsByName) {
      const sortedIndices = Array.from(rows.keys()).sort((a, b) => a - b);
      result[listName] = sortedIndices.map((i) => rows.get(i)!);
    }

    return result;
  }
}
