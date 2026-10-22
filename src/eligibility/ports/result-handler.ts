import type { Answers } from "../domain/logic.js";
import type { CfeResult } from "./assessor.js";

export interface ResultHandler {
  handle: (result: {
    checkId: unknown;
    answers: Answers;
    result: CfeResult;
  }) => Promise<void>;
}
