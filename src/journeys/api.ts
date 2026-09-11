import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { SearchClientDetailsResponse } from "#types/api-types.js";
import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";


export interface Deps {
    effectsWithDeps: InboundCallEffectsWithDeps;
}

export interface InboundCallEffectsWithDeps {
    SearchClientDetails: (_deps: Deps, context: EffectFunctionContext) => Promise<void>;
}

export interface InboundCallApiService {
    searchClientDetails: (axiosMiddleware: AxiosInstanceWrapper, searchParam: string) => Promise<SearchClientDetailsResponse>;
}