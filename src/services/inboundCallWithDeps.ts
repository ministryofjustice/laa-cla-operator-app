import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core";
import type { AxiosInstanceWrapper } from "#node_modules/middleware-axios/dist/esm/index.js";
import type { Deps, InboundCallEffectsWithDeps } from "#src/journeys/api.js"
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";

/**
 * Implementation of the InboundCallEffectsWithDeps interface that interacts with the API service using Axios middleware.
 */
export class InboundCallEffectsWithDepsImpl implements InboundCallEffectsWithDeps {
    private readonly apiService: Record<string, CallableFunction>;

    /**
     * Creates an instance of InboundCallEffectsWithDepsImpl.
     * @param apiService {Record<string, CallableFunction>} The API service containing the callable functions.
     * @throws {Error} If the API service is not provided.
     */
    constructor(apiService: Record<string, CallableFunction>)
    {
        this.apiService = apiService;
    }

    /**
     *
     * Executes the effect to retrieve all cases from the API service.
     * @param _deps {Deps} The dependencies required to execute the effect.
     * @param context {EffectFunctionContext} The context in which the effect is executed.
     * @returns {Promise<void>} A promise that resolves when the effect has been executed.
     */
    GetAllCases = async (_deps: Deps, context: EffectFunctionContext): Promise<void> => {
        const authenticatedAxiosState = context.getState("authenticatedAxios");

        if (!isAxiosInstanceWrapper(authenticatedAxiosState)) {
            throw new Error("Axios middleware is not available in the context.");
        }
        
        const axiosMiddleware = authenticatedAxiosState;

        const result = await this.apiService.getAllCases(axiosMiddleware);

        // Store the result in the context for Forge to use
        context.setData("allCases", result);
    };
}