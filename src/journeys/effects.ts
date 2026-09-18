import type { Deps } from "#src/journeys/api.js";
import {
  type EffectFunctionExpr,
  type EffectFunctionContext,
  EffectRegistry,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { FIRST_PAGE, getAuthenticatedAxios, getPageNumberFromQuery, getSearchParamFromAnswers, setPaginatedSearchData, SEARCH_PAGE_SIZE } from "#src/journeys/helpers/effectHelpers.js";


export interface InboundCallEffectShape {
  GetAllCases: () => EffectFunctionExpr;
  /** Add a new one called save client details */
  saveClientDetails: () => EffectFunctionExpr;
    SearchCase: () => EffectFunctionExpr;
    SearchCasePagination: () => EffectFunctionExpr;
}

type InboundCallEffectsImplementation = (
  deps: Deps,
) => (context: EffectFunctionContext) => Promise<void>;

export const InboundCallEffectsImplementation: Record<keyof InboundCallEffectShape, InboundCallEffectsImplementation> = {

    /**
     * Implementation of the effect for retrieving all cases.
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    GetAllCases: (deps: Deps) => async (context: EffectFunctionContext) => {
       const authenticatedAxiosState = getAuthenticatedAxios(context);

    const result = await deps.caseApi.getAllCases(authenticatedAxiosState);
    context.setData("allCases", result);
  },
  /**
   * Implementation of the effect for retrieving all cases.
   * @param {Deps} deps - The dependencies required for the effect.
   * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
   */
  saveClientDetails: (deps: Deps) => async (context: EffectFunctionContext) => {
    const authenticatedAxiosState = context.getState("authenticatedAxios");

    if (!isAxiosInstanceWrapper(authenticatedAxiosState)) {
      throw new Error("Axios middleware is not available in the context.");
    }

    const personalDetails = {
      full_name: context.getPostData("fullName"),
      date_of_birth: context.getPostData("dateOfBirth"),
      mobile_phone: context.getPostData("phoneNumber"),
      safe_to_contact:
        context.getPostData("safeToCall") === "yes" ? "SAFE" : "DONT_CALL",
      email: context.getPostData("email"),
    };

    const apiPersonalDetails = {
      full_name: personalDetails.full_name,
      dob: personalDetails.date_of_birth,
      mobile_phone: personalDetails.mobile_phone,
      safe_to_contact: personalDetails.safe_to_contact,
      email: personalDetails.email,
    };

    context.setData("personalDetails", personalDetails);

    await deps.caseApi.updatePersonalDetails(
      authenticatedAxiosState,
      "ED-0001-0002",
      apiPersonalDetails,
    );
  },


    /**
     * Implementation of the effect for searching cases based on user input.
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    SearchCase: (deps: Deps) => async (context: EffectFunctionContext) => {
       const authenticatedAxiosState = getAuthenticatedAxios(context);
       const searchParam = getSearchParamFromAnswers(context);

        context.setData("searchParam", searchParam);
        const result = await deps.caseApi.searchCases(authenticatedAxiosState, {
           query: searchParam,
           pageSize: SEARCH_PAGE_SIZE,
           pageNumber: FIRST_PAGE,
       });

        setPaginatedSearchData(context, result, FIRST_PAGE);
    },

    /**
     * Implementation of the effect for handling pagination of search results.
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    SearchCasePagination: (deps: Deps) => async (context: EffectFunctionContext) => {
       const authenticatedAxiosState = getAuthenticatedAxios(context);
       const searchParam = String(context.getData("searchParam"));
       const pageNumber = getPageNumberFromQuery(context);
       const result = await deps.caseApi.searchCases(authenticatedAxiosState, {
           query: searchParam,
           pageSize: SEARCH_PAGE_SIZE,
           pageNumber,
       });

        setPaginatedSearchData(context, result, pageNumber);
    }
};

export const InboundCallEffectsRegistry = new EffectRegistry<Deps>();

export const InboundCallEffects: InboundCallEffectShape = {
  GetAllCases: InboundCallEffectsRegistry.register(
    "GetAllCases",
    InboundCallEffectsImplementation.GetAllCases,
  ),
  saveClientDetails: InboundCallEffectsRegistry.register(
    "saveClientDetails",
    InboundCallEffectsImplementation.saveClientDetails,
  ),
    SearchCase: InboundCallEffectsRegistry.register("SearchCase", InboundCallEffectsImplementation.SearchCase),
    SearchCasePagination: InboundCallEffectsRegistry.register("SearchCasePagination", InboundCallEffectsImplementation.SearchCasePagination),
};
