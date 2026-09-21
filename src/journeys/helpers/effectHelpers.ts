import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { CreateCasePayload, GetAllCasesResponse } from "#types/api-types.js";
import { isAxiosInstanceWrapper } from "#src/helpers/axiosTypeGuards.js";
import { dateStringFromThreeFields, mapResultsToFormatDob, type DobAnswer } from "#src/helpers/dataTransformers.js";


export const SEARCH_PAGE_SIZE = 10;
export const FIRST_PAGE = 1;
const DECIMAL_RADIX = 10;
const ZERO = 0;
const SINGLE_STEP = 1;

/**
 * Type guard to check if a value is a DobAnswer object.
 * @param {unknown} value - The value to check.
 * @returns {boolean} True if the value is a DobAnswer object.
 */
function isDobAnswer(value: unknown): value is DobAnswer {
    return typeof value === "object" && value !== null;
}

/**
 * Normalises an answer value by trimming whitespace and converting non-string values to an empty string.
 * @param {unknown} value - The value to normalise.
 * @returns {string} The normalised string.
 */
function normaliseAnswerValue(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }

    return "";
}

/**
 * Returns the authenticated Axios wrapper from request state.
 * @param {EffectFunctionContext} context - Effect runtime context.
 * @returns {AxiosInstanceWrapper} The authenticated Axios wrapper.
 */
export function getAuthenticatedAxios(context: EffectFunctionContext): AxiosInstanceWrapper {
    const authenticatedAxiosState = context.getState("authenticatedAxios");

    if (!isAxiosInstanceWrapper(authenticatedAxiosState)) {
        throw new Error("Axios middleware is not available in the context.");
    }

    return authenticatedAxiosState;
}

/**
 * Parses the requested page number from the query string.
 * @param {EffectFunctionContext} context - Effect runtime context.
 * @returns {number} The parsed page number clamped to a minimum of 1.
 */
export function getPageNumberFromQuery(context: EffectFunctionContext): number {
    const rawPage = context.getQueryParam("page");
    const page = Number.parseInt(Array.isArray(rawPage) ? rawPage[ZERO] : rawPage ?? String(FIRST_PAGE), DECIMAL_RADIX);

    return Math.max(
        FIRST_PAGE,
        Number.isNaN(page) ? FIRST_PAGE : page
    );
}

/**
 * Picks the first non-empty search answer to be used as the API search term.
 * @param {EffectFunctionContext} context - Effect runtime context.
 * @returns {string} The first non-empty search term, otherwise an empty string.
 */
export function getSearchParamFromAnswers(context: EffectFunctionContext): string {
    const fullName = context.getAnswer("fullName");
    const phone = context.getAnswer("phone");
    const dateOfBirthRaw = context.getAnswer("dateOfBirth");
    const postcode = context.getAnswer("postcode");
    const dateOfBirth = isDobAnswer(dateOfBirthRaw) ? dateOfBirthRaw : {};

    const formattedDob = dateStringFromThreeFields(
        normaliseAnswerValue(dateOfBirth.day),
        normaliseAnswerValue(dateOfBirth.month),
        normaliseAnswerValue(dateOfBirth.year)
    );

    return [fullName, phone, postcode, formattedDob]
        .map(value => normaliseAnswerValue(value))
        .find(value => value.length > ZERO) ?? "";
}

/**
 * Stores paginated search data in the effect context.
 * @param {EffectFunctionContext} context - Effect runtime context.
 * @param {GetAllCasesResponse} result - Search API response.
 * @param {number} requestedPage - Requested page number.
 * @returns {void}
 */
export function setPaginatedSearchData(context: EffectFunctionContext, result: GetAllCasesResponse, requestedPage: number): void {
    const mapped = mapResultsToFormatDob(result);
    const totalPages = Math.max(FIRST_PAGE, Math.ceil(result.count / SEARCH_PAGE_SIZE));
    const currentPage = Math.min(Math.max(FIRST_PAGE, requestedPage), totalPages);

    context.setData("searchResults", mapped);
    context.setData("searchCurrentPage", currentPage);
    context.setData("searchHasNext", currentPage < totalPages);
    context.setData("searchHasPrevious", currentPage > FIRST_PAGE);
    context.setData("searchNextPage", Math.min(totalPages, currentPage + SINGLE_STEP));
    context.setData("searchPreviousPage", Math.max(FIRST_PAGE, currentPage - SINGLE_STEP));
    context.setData("searchTotalPages", totalPages);
    context.setData("searchPages", Array(totalPages).fill(ZERO));
}

/**
 * Extracts case details from the effect context based on user answers.
 * @param {EffectFunctionContext} context - Effect runtime context.
 * @returns {Record<string, unknown>} Case details formatted for API submission.
 */
export function getCreateCasePayloadFromAnswers(context: EffectFunctionContext): CreateCasePayload {
    const fullName = context.getAnswer("fullName");
    const phone = context.getAnswer("phone");
    const dateOfBirthRaw = context.getAnswer("dateOfBirth");
    const postcode = context.getAnswer("postcode");
    const dateOfBirth = isDobAnswer(dateOfBirthRaw) ? dateOfBirthRaw : {};

    const formattedDob = dateStringFromThreeFields(
        normaliseAnswerValue(dateOfBirth.day),
        normaliseAnswerValue(dateOfBirth.month),
        normaliseAnswerValue(dateOfBirth.year)
    );

    return {
        full_name: normaliseAnswerValue(fullName),
        phone: normaliseAnswerValue(phone),
        postcode: normaliseAnswerValue(postcode),
        date_of_birth: formattedDob,
    };
}