import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { Deps, InboundCallEffectsWithDeps } from "#src/journeys/api.js"
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";

interface InboundCallApiService {
    getAllCases: (axiosMiddleware: AxiosInstanceWrapper) => Promise<unknown>;
}

/**
 * Implementation of the InboundCallEffectsWithDeps interface that interacts with the API service using Axios middleware.
 */
export class InboundCallEffectsWithDepsImpl implements InboundCallEffectsWithDeps {
    private readonly apiService: InboundCallApiService;

    /**
     * Creates an instance of InboundCallEffectsWithDepsImpl.
     * @param {InboundCallApiService} apiService The API service containing callable functions.
     * @throws {Error} If the API service is not provided.
     */
    constructor(apiService: InboundCallApiService)
    {
        this.apiService = apiService;
    }

    /**
     *
     * Executes the effect to retrieve all cases from the API service.
     * @param {Deps} _deps The dependencies required to execute the effect.
     * @param {EffectFunctionContext} context The context in which the effect is executed.
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
    /* c8 ignore next */
}