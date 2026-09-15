import type { Deps } from "#src/journeys/api.js";
import { type EffectFunctionExpr, type EffectFunctionContext, EffectRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";

export interface InboundCallEffectShape {
    GetAllCases: () => EffectFunctionExpr;
}

type InboundCallEffectsImplementation = (deps: Deps) => (context: EffectFunctionContext) => Promise<void>;

export const InboundCallEffectsImplementation: Record<keyof InboundCallEffectShape, InboundCallEffectsImplementation> = {

    /**
     *
     * @param deps {Deps} The dependencies required to execute the effect.
     * @param context {EffectFunctionContext} The context in which the effect is executed.
     * @returns {Promise<void>} A promise that resolves when the effect has been executed.
     */
    GetAllCases: (deps: Deps) => async (context: EffectFunctionContext) => {
       await deps.effectsWithDeps.GetAllCases(deps, context);
    },
};


export const InboundCallEffectsRegistry = new EffectRegistry<Deps>();

export const InboundCallEffects: InboundCallEffectShape = {
    GetAllCases: InboundCallEffectsRegistry.register("GetAllCases", InboundCallEffectsImplementation.GetAllCases),
}