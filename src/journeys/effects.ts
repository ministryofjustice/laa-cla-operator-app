import type { Deps } from "#src/journeys/api.js";
import { type EffectFunctionExpr, type EffectFunctionContext, EffectRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";
import type {Session} from "express-session"
import type { Address } from "#src/services/postcodeLookup.js";

export interface InboundCallEffectShape {
    GetAllCases: () => EffectFunctionExpr;
    postcodeLookup: () => EffectFunctionExpr;
    saveToSession: () => EffectFunctionExpr;
    saveAddressLookup: () => EffectFunctionExpr;
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
        const session = context.getSession() as Session;
        const postcode = session.forms?.postcodeLookup?.postcode
        const building = session.forms?.postcodeLookup?.building
        const data = {
            building,
            postcode,
            //eslint-disable-next-line  @typescript-eslint/no-magic-numbers -- counter starts at zero
            count: 0,
            result: [] as Array<{ address: string, uprn: string }> | null
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- this will capture all untruthy including null and undefined
        if(!postcode || !building) {
            context.setData("lookup", data);
            return;
        }

        const addresses = await deps.postcodeapi.byPostcode(building, postcode)
        data.result = addresses.map((address: Address) => ({address: address.address, uprn: address.uprn}))
        // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- Direct property access is clearer here
        data.count = data.result.length
        context.setData("lookup", data)
    },
    /**
     * Implementation of the effect for saving form data to session
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    // eslint-disable-next-line @typescript-eslint/require-await -- Forge expects methods to be async
    saveToSession: (deps: Deps) => async (context: EffectFunctionContext) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Forge context returns a session compatible with express-session
        const session = context.getSession() as Session;
        session.forms ??= {};
        session.forms.postcodeLookup = { 
            building: context.getPostData("building"),
            postcode: context.getPostData("postcode")
        }
        session.save()
    },

    /**
     * Implementation of the effect for saving form data to the api
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    saveAddressLookup: (deps: Deps) => async (context: EffectFunctionContext) => {
       const authenticatedAxiosState = context.getState("authenticatedAxios");

       if (!isAxiosInstanceWrapper(authenticatedAxiosState)) {
           throw new Error("Axios middleware is not available in the context.");
       }

        const uprn = context.getPostData("address")
        const address = await deps.postcodeapi.byUPRN(String(uprn))
        await deps.caseApi.updatePersonalDetails(authenticatedAxiosState, "ED-0001-0002", {
            postcode: address?.postcode,
            street: address?.address  
        })
    }

};

export const InboundCallEffectsRegistry = new EffectRegistry<Deps>();

export const InboundCallEffects: InboundCallEffectShape = {
    GetAllCases: InboundCallEffectsRegistry.register("GetAllCases", InboundCallEffectsImplementation.GetAllCases),
    postcodeLookup: InboundCallEffectsRegistry.register("postcodeLookup", InboundCallEffectsImplementation.postcodeLookup),
    saveToSession: InboundCallEffectsRegistry.register("saveToSession", InboundCallEffectsImplementation.saveToSession),
    saveAddressLookup: InboundCallEffectsRegistry.register("saveAddressLookup", InboundCallEffectsImplementation.saveAddressLookup)
}
