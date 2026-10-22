export type { AnswerStore } from "./answer-store.js";
export type { Assessor, StateBenefitType } from "./assessor.js";
export type { ResultHandler } from "./result-handler.js";

import type { AnswerStore } from "./answer-store.js";
import type { Assessor } from "./assessor.js";
import type { ResultHandler } from "./result-handler.js";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";

export interface EligibilityDeps {
  assessor: Assessor;
  resultHandler: ResultHandler;
  answerStore?: AnswerStore;
  caseApi?: {
    loadCase: (
      axiosMiddleware: AxiosInstanceWrapper,
      caseId: string,
    ) => Promise<{ date_of_birth?: string }>;
    // Temporary: save eligibility result through existing endpoint (causes double CFE call)
    // TODO (D9): Replace with dedicated endpoint that saves without re-calling CFE
    updateEligibilityCheck?: (
      axiosMiddleware: AxiosInstanceWrapper,
      caseId: string,
      data: Record<string, unknown>,
    ) => Promise<void>;
  };
}
