import type { Deps } from "#src/journeys/api.js";
import { type EffectFunctionExpr, type EffectFunctionContext, EffectRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";

export interface InboundCallEffectShape {
    GetAllCases: () => EffectFunctionExpr;
}

type InboundCallEffectsImplementation = (deps: Deps) => (context: EffectFunctionContext) => Promise<void>;

export const InboundCallEffectsImplementation: Record<keyof InboundCallEffectShape, InboundCallEffectsImplementation> = {

    /**
     * Implementation of the effect for retrieving all cases.
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    GetAllCases: (deps: Deps) => async (context: EffectFunctionContext) => {
       const authenticatedAxiosState = context.getState("authenticatedAxios");

       if (!isAxiosInstanceWrapper(authenticatedAxiosState)) {
           throw new Error("Axios middleware is not available in the context.");
       }

       const result = await deps.caseApi.getAllCases(authenticatedAxiosState);
       context.setData("allCases", result);
    },
    // 

    //PostAddress: ()

    // TO fetch Forge data you use `context`, for forms you'd use `context.getAnswer('{code}')`
};


// REGISTRATION
export const InboundCallEffectsRegistry = new EffectRegistry<Deps>();

export const InboundCallEffects: InboundCallEffectShape = {
    GetAllCases: InboundCallEffectsRegistry.register("GetAllCases", InboundCallEffectsImplementation.GetAllCases),
}
