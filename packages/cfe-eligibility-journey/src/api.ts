import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { ClientDetailsApiResponse } from "#types/api-types.js";

export interface Deps {
    effectsWithDeps: FinancialEligibilityEffectsWithDeps;
}

export interface FinancialEligibilityEffectsWithDeps {
    LoadCaseDetails: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
    RestoreCaseDraft: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
    ValidateDraftAnswers: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
    PrepareSubmission: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
    CheckPreparedSubmission: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
    RestoreSubmissionError: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
    ClearDraftAnswers: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
    SaveNewAnswerIfAnswered: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
}

export interface FinancialEligibilityApiService {
    getClientDetails: (axiosMiddleware: AxiosInstanceWrapper, caseId: string) => Promise<ClientDetailsApiResponse>;
}