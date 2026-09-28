import type { Deps } from "#src/journeys/api.js";
import {
  type EffectFunctionExpr,
  type EffectFunctionContext,
  EffectRegistry,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { getAuthenticatedAxios, getPageNumberFromQuery, getSearchParamFromAnswers, setPaginatedSearchData } from "#src/journeys/helpers/effectHelpers.js";
import { withServiceUnavailableSummary } from "#src/journeys/helpers/effectErrorHandlers.js";
import { ZERO, FIRST_PAGE, SEARCH_PAGE_SIZE } from "./helpers/constants.js";


export interface InboundCallEffectShape {
  GetAllCases: () => EffectFunctionExpr;
  /** Add a new one called save client details */
  saveClientDetails: () => EffectFunctionExpr;
    SearchCases: () => EffectFunctionExpr;
    SearchCasesPagination: () => EffectFunctionExpr;
    CreateCase: () => EffectFunctionExpr;
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
    const authenticatedAxiosState = getAuthenticatedAxios(context);

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
    SearchCases: (deps: Deps) => async (context: EffectFunctionContext) => {
      await withServiceUnavailableSummary(async (safeContext: EffectFunctionContext) => {
        const authenticatedAxiosState = getAuthenticatedAxios(context);
        const searchParam = getSearchParamFromAnswers(safeContext).trim();

        if (searchParam.length === ZERO) return;
        safeContext.setData("searchParam", searchParam);

        const result = await deps.caseApi.searchCases(authenticatedAxiosState, {
          query: searchParam,
          pageSize: SEARCH_PAGE_SIZE,
          pageNumber: FIRST_PAGE,
        });

        setPaginatedSearchData(safeContext, result, FIRST_PAGE);
      })(context);
    },

    /**
     * Implementation of the effect for handling pagination of search results.
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    SearchCasesPagination: (deps: Deps) => async (context: EffectFunctionContext) => {
      await withServiceUnavailableSummary(async (safeContext: EffectFunctionContext) => {
        const authenticatedAxiosState = getAuthenticatedAxios(context);
        const rawQ = safeContext.getQueryParam("q");
        const queryFromUrl = Array.isArray(rawQ) ? rawQ[ZERO] : rawQ;
        const searchParam = (queryFromUrl ?? "").trim();

       if (searchParam.length === ZERO) return;

       safeContext.setData("searchParam", searchParam);

       const result = await deps.caseApi.searchCases(authenticatedAxiosState, {
         query: searchParam,
         pageSize: SEARCH_PAGE_SIZE,
         pageNumber: getPageNumberFromQuery(safeContext),
       });

       setPaginatedSearchData(safeContext, result, getPageNumberFromQuery(safeContext));
      })(context);
    },

    /**
     * Implementation of the effect for creating a new case based on user input.
     * @param {Deps} deps - The dependencies required for the effect.
     * @returns {(context: EffectFunctionContext) => Promise<void>} Effect function bound to dependencies.
     */
    CreateCase: (deps: Deps) => async (context: EffectFunctionContext) => {
       const authenticatedAxiosState = getAuthenticatedAxios(context);
       const { reference } = await deps.caseApi.createCase(authenticatedAxiosState);
       context.setData("createdCaseRef", reference);
    },
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
    SearchCases: InboundCallEffectsRegistry.register("SearchCases", InboundCallEffectsImplementation.SearchCases),
    SearchCasesPagination: InboundCallEffectsRegistry.register("SearchCasesPagination", InboundCallEffectsImplementation.SearchCasesPagination),
    CreateCase: InboundCallEffectsRegistry.register("CreateCase", InboundCallEffectsImplementation.CreateCase),
};
