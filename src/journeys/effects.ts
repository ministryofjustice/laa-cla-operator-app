import type { Deps } from "#src/journeys/api.js";
import { type EffectFunctionExpr, type EffectFunctionContext, EffectRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";
import {SessionData, Session} from "express-session"

export interface InboundCallEffectShape {
    GetAllCases: () => EffectFunctionExpr;
    postcodeLookup: () => EffectFunctionExpr;
    saveFormData: () => EffectFunctionExpr;
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
    postcodeLookup: (deps: Deps) => async (context: EffectFunctionContext) => {
        const session = context.getSession() as Session;
        const postcode = session.forms?.postcodeLookup?.postcode
        const building = session.forms?.postcodeLookup?.building
        const data = {
            building,
            postcode,
            count: 0,
            result: [] as { address: string }[] | null
        }
        if(!postcode || !building) {
            context.setData("lookup", data);
            return;
        }

        data.result = await deps.postcodeapi.lookup(building, postcode)
        data.count = data.result?.length ?? 0
        context.setData("lookup", data)
    },

    saveFormData: (deps: Deps) => async (context: EffectFunctionContext) => {
        const session = context.getSession() as Session;
        if(!session.forms) {
            session.forms = {}
        }
        session.forms.postcodeLookup = { 
            building: context.getPostData("building"),
            postcode: context.getPostData("postcode")
        }
        session.save()
    }

};

export const InboundCallEffectsRegistry = new EffectRegistry<Deps>();

export const InboundCallEffects: InboundCallEffectShape = {
    GetAllCases: InboundCallEffectsRegistry.register("GetAllCases", InboundCallEffectsImplementation.GetAllCases),
    postcodeLookup: InboundCallEffectsRegistry.register("postcodeLookup", InboundCallEffectsImplementation.postcodeLookup),
    saveFormData: InboundCallEffectsRegistry.register("saveFormData", InboundCallEffectsImplementation.saveFormData)
}
