import type { Deps } from "#src/journeys/api.js";
import { type EffectFunctionExpr, type EffectFunctionContext, EffectRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";

export interface InboundCallEffectShape {
  GetAllCases: () => EffectFunctionExpr;
  postAddress: () => EffectFunctionExpr;
}

type InboundCallEffectsImplementation = (deps: Deps) => (context: EffectFunctionContext) => Promise<void>;

export const InboundCallEffectsImplementation: Record<keyof InboundCallEffectShape, InboundCallEffectsImplementation> = {
  /**
   * Implementation of the effect for retrieving all cases.
   * @param {Deps} deps - The API dependencies, including the case API client.
   * @returns {(context: EffectFunctionContext) => Promise<void>} An effect function that fetches all cases and stores them in context data as "allCases".
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
   * Implementation of the effect for saving the address entered by the user.
   * @param {Deps} deps - The API dependencies, including the case API client.
   * @returns {(context: EffectFunctionContext) => Promise<void>} An effect function that saves the address and sets "addressSaved" in context data to indicate success or failure.
   */
  postAddress: (deps: Deps) => async (context: EffectFunctionContext) => {
    const authenticatedAxiosState = context.getState("authenticatedAxios");

    if (!isAxiosInstanceWrapper(authenticatedAxiosState)) {
      throw new Error("Axios middleware is not available in the context.");
    }

    const address = {
      addressLine1: context.getAnswer("address-line-1"),
      postcode: context.getAnswer("postcode"),
    };
    // TODO: replace hardcoded case ID
    const caseId = "ED-0001-0001";

    try {
      await deps.caseApi.updatePersonalDetails(authenticatedAxiosState, caseId, { address });
      context.setData("addressSaved", true);
    } catch (error) {
      context.setData("addressSaved", false);
    }
  },
};

export const InboundCallEffectsRegistry = new EffectRegistry<Deps>();

export const InboundCallEffects: InboundCallEffectShape = {
  GetAllCases: InboundCallEffectsRegistry.register("GetAllCases", InboundCallEffectsImplementation.GetAllCases),
  postAddress: InboundCallEffectsRegistry.register("postAddress", InboundCallEffectsImplementation.postAddress),
};