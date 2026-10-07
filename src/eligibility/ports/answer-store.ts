import type { Answers } from "../domain/logic.js";

export interface AnswerStore {
  load(checkId: unknown): Promise<Answers>;
  save(checkId: unknown, partial: Answers): Promise<void>;
  clear(checkId: unknown): Promise<void>;
}
