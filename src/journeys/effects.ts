import type { Deps } from "#src/journeys/api.js";
import { type EffectFunctionExpr, type EffectFunctionContext, EffectRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";

export interface InboundCallEffectShape {
    // Effect for searching client details
    SearchClientDetails: () => EffectFunctionExpr;
}

type InboundCallEffectsImplementation = (deps: Deps) => (context: EffectFunctionContext) => Promise<void>;

export const InboundCallEffectsImplementation: Record<keyof InboundCallEffectShape, InboundCallEffectsImplementation> = {

    // Implementation for SearchClientDetails effect
    /**
     *
     * @param deps
     */
    SearchClientDetails: (deps: Deps) => async (context: EffectFunctionContext) => {
       await deps.effectsWithDeps.SearchClientDetails(deps, context);
    },
};


export const InboundCallEffectsRegistry = new EffectRegistry<Deps>();

export const InboundCallEffects: InboundCallEffectShape = {
    SearchClientDetails: InboundCallEffectsRegistry.register("SearchClientDetails", InboundCallEffectsImplementation.SearchClientDetails),
}