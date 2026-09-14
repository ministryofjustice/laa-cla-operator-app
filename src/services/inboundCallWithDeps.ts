import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core";
import type { AxiosInstanceWrapper } from "#node_modules/middleware-axios/dist/esm/index.js";
import type { Deps, InboundCallEffectsWithDeps } from "#src/journeys/api.js"

/**
 *
 */
export class InboundCallEffectsWithDepsImpl implements InboundCallEffectsWithDeps {
    private readonly apiService: Record<string, CallableFunction>;

    /**
     *
     * @param apiService
     */
    constructor(apiService: Record<string, CallableFunction>)
    {
        this.apiService = apiService;
    }

    /**
     *
     * @param _deps
     * @param context
     */
    GetAllCases = async (_deps: Deps, context: EffectFunctionContext): Promise<void> => {
        const axiosMiddleware = context.getState("authenticatedAxios") as AxiosInstanceWrapper | undefined;
        
        if (!axiosMiddleware) {
            throw new Error("Axios middleware is not available in the context.");
        }

        const result = await this.apiService.getAllCases(axiosMiddleware);

        // Store the result in the context for Forge to use
        context.setData("allCases", result);
    };
}