export type { AnswerStore } from "./answer-store.js";
export type { Assessor, CfeResult, StateBenefitType } from "./assessor.js";
export type { ResultHandler } from "./result-handler.js";

import type { AnswerStore } from "./answer-store.js";
import type { Assessor, CfeResult } from "./assessor.js";
import type { ResultHandler } from "./result-handler.js";

export interface EligibilityDeps {
  assessor: Assessor;
  resultHandler: ResultHandler;
  answerStore?: AnswerStore;
  caseApi?: {
    loadCase(axiosMiddleware: any, caseId: string): Promise<{ date_of_birth?: string }>;
  };
}
