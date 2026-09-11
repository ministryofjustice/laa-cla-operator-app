import { EffectFunctionContext } from "#node_modules/@ministryofjustice/hmpps-forge/dist/core/index.js";
import { AxiosInstanceWrapper } from "#node_modules/middleware-axios/dist/esm/index.js";
import { Deps, InboundCallEffectsWithDeps } from "#src/journeys/api.js"


export class InboundCallEffectsWithDepsImpl implements InboundCallEffectsWithDeps {
    constructor(
        private readonly apiService: {
            searchClientDetails: CallableFunction;
        }
    ) {}

    SearchClientDetails = async (_deps: Deps, context: EffectFunctionContext): Promise<void> => {
        const axiosMiddleware = context.getState("authenticatedAxios") as AxiosInstanceWrapper | undefined;
        
        if (!axiosMiddleware) {
            throw new Error("Axios middleware is not available in the context.");
        }
        
        const fullName = context.getAnswer("fullName");
        const phone = context.getAnswer("phone");
        const postcode = context.getAnswer("postcode");
        const dateOfBirth = context.getAnswer("dateOfBirth");

        const searchParam = String(
            fullName ??
            phone ??
            postcode ??
            dateOfBirth ?? ""
        )

        const result = await this.apiService.searchClientDetails(axiosMiddleware, searchParam);

        // Store the search result in the context for Forge to use
        context.setData("searchResult", result);
    }
}