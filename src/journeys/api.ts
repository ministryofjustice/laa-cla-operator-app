import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse } from "#types/api-types.js";
import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";


export interface Deps {
    effectsWithDeps: InboundCallEffectsWithDeps;
}

export interface InboundCallEffectsWithDeps {
    GetAllCases: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
}

export interface InboundCallApiService {
    GetAllCases: (axiosMiddleware: AxiosInstanceWrapper) => Promise<GetAllCasesResponse>;
}