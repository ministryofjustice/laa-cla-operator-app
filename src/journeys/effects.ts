import type { Deps } from "#src/journeys/api.js";
import { type EffectFunctionExpr, type EffectFunctionContext, EffectRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";
import type {Session} from "express-session"
import type { Address } from "#src/services/postcodeLookup.js";

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
    /**
     * Implementation of the effect for looking a postcode
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    postcodeLookup: (deps: Deps) => async (context: EffectFunctionContext) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Forge context returns a session compatible with express-session
        // See https://forge-developer-guide-dev.hmpps.service.justice.gov.uk/forge-developer-guide/authoring-language/session#how-it-works for more details
        const session = context.getSession() as Session;
        const postcode = session.forms?.postcodeLookup?.postcode
        const building = session.forms?.postcodeLookup?.building
        const data = {
            building,
            postcode,
            count: 0, // eslint-disable-line no-magic-numbers -- counter starts at zero
            result: [] as { address: string, uprn: string }[] | null
        }
        if(!postcode || !building) {
            context.setData("lookup", data);
            return;
        }

        const addresses = await deps.postcodeapi.byPostcode(building, postcode) ?? []
        data.result = addresses.map((address: Address) => ({address: address.address, uprn: address.uprn}))
        data.count = data.result?.length ?? 0
        context.setData("lookup", data)
    },
    /**
     * Implementation of the effect for saving form data
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
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
