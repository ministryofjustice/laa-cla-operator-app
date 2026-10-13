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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- caseApi is large; only specific methods are used
  caseApi?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- axiosMiddleware type varies by context
    loadCase(axiosMiddleware: any, caseId: string): Promise<{ date_of_birth?: string }>;
    // Temporary: save eligibility result through existing endpoint (causes double CFE call)
    // TODO (D9): Replace with dedicated endpoint that saves without re-calling CFE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- axiosMiddleware and data types vary
    updateEligibilityCheck?(axiosMiddleware: any, caseId: string, data: any): Promise<void>;
  };
}
