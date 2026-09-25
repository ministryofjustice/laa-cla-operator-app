import type { Deps } from "#src/journeys/api.js";
import {
  type EffectFunctionExpr,
  type EffectFunctionContext,
  EffectRegistry,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { FIRST_PAGE, getAuthenticatedAxios, getPageNumberFromQuery, getSearchParamFromAnswers, setPaginatedSearchData, SEARCH_PAGE_SIZE, ZERO } from "#src/journeys/helpers/effectHelpers.js";
import type {Session} from "express-session";
import type { Address } from "#src/services/postcodeLookup.js";

export interface InboundCallEffectShape {
  GetAllCases: () => EffectFunctionExpr;
  /** Add a new one called save client details */
  saveClientDetails: () => EffectFunctionExpr;
    SearchCases: () => EffectFunctionExpr;
    SearchCasesPagination: () => EffectFunctionExpr;
    CreateCase: () => EffectFunctionExpr;
    postcodeLookup: () => EffectFunctionExpr;
    saveToSession: () => EffectFunctionExpr;
    saveAddressLookup: () => EffectFunctionExpr;
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
        const authenticatedAxiosState = getAuthenticatedAxios(context);
        const searchParam = getSearchParamFromAnswers(context).trim();

        if (searchParam.length === ZERO) return;
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
    SearchCasesPagination: (deps: Deps) => async (context: EffectFunctionContext) => {
        const authenticatedAxiosState = getAuthenticatedAxios(context);
        const rawQ = context.getQueryParam("q");
        const queryFromUrl = Array.isArray(rawQ) ? rawQ[ZERO] : rawQ;
        const searchParam = (queryFromUrl ?? "").trim();

       if (searchParam.length === ZERO) return;

       context.setData("searchParam", searchParam);
    
       const result = await deps.caseApi.searchCases(authenticatedAxiosState, {
           query: searchParam,
           pageSize: SEARCH_PAGE_SIZE,
           pageNumber: getPageNumberFromQuery(context),
       });

        setPaginatedSearchData(context, result, getPageNumberFromQuery(context));
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
       const authenticatedAxiosState = getAuthenticatedAxios(context);
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
    postcodeLookup: InboundCallEffectsRegistry.register("postcodeLookup", InboundCallEffectsImplementation.postcodeLookup),
    saveToSession: InboundCallEffectsRegistry.register("saveToSession", InboundCallEffectsImplementation.saveToSession),
    saveAddressLookup: InboundCallEffectsRegistry.register("saveAddressLookup", InboundCallEffectsImplementation.saveAddressLookup)
};
