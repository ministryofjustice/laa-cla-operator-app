import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse } from "#types/api-types.js";
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";
import { dateStringFromThreeFields, mapResultsToFormatDob, type DobAnswer } from "#src/helpers/dataTransformers.js";


export const SEARCH_PAGE_SIZE = 10;

export function getAuthenticatedAxios(context: EffectFunctionContext): AxiosInstanceWrapper {
    const authenticatedAxiosState = context.getState("authenticatedAxios");

    if (!isAxiosInstanceWrapper(authenticatedAxiosState)) {
        throw new Error("Axios middleware is not available in the context.");
    }

    return authenticatedAxiosState;
}

export function getPageNumberFromQuery(context: EffectFunctionContext): number {
    const rawPage = context.getQueryParam("page");
    return Math.max(
        1,
        Number.parseInt(Array.isArray(rawPage) ? rawPage[0] : rawPage ?? "1", 10) || 1
    );
}

// Helper method to make it easier to extract the search parameter from the response.
export function getSearchParamFromAnswers(context: EffectFunctionContext): string {
    const fullName = context.getAnswer("fullName");
    const phone = context.getAnswer("phone");
    const dateOfBirth = context.getAnswer("dateOfBirth") as DobAnswer;
    const postcode = context.getAnswer("postcode");

    const formattedDob = dateStringFromThreeFields(
        dateOfBirth?.day ?? "",
        dateOfBirth?.month ?? "",
        dateOfBirth?.year ?? ""
    );

    return [fullName, phone, postcode, formattedDob]
        .map(value => String(value ?? "").trim())
        .find(value => value.length > 0) ?? "";
}

// Sets the paginated search data in the context based on the result and requested page.
export function setPaginatedSearchData(context: EffectFunctionContext, result: GetAllCasesResponse, requestedPage: number): void {
    const mapped = mapResultsToFormatDob(result);
    const totalPages = Math.max(1, Math.ceil((result.count ?? 0) / SEARCH_PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

    context.setData("searchResults", mapped);
    context.setData("searchCurrentPage", currentPage);
    context.setData("searchHasNext", currentPage < totalPages);
    context.setData("searchHasPrevious", currentPage > 1);
    context.setData("searchNextPage", Math.min(totalPages, currentPage + 1));
    context.setData("searchPreviousPage", Math.max(1, currentPage - 1));
    context.setData("searchTotalPages", totalPages);
    context.setData("searchPages", Array(totalPages).fill(0));
}
