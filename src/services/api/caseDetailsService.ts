import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { CaseDetails, GetAllCasesResponse, SearchCasesParams, SearchCasesResponse } from "#types/api-types.js";
import { configureAxiosInstance, handleApiCall } from "./baseApiService.js";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_NUMBER = 1;

/**
 * Retrieves all cases from the API.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @returns {Promise<GetAllCasesResponse>} The response containing all cases.
 */
export async function getAllCases(axiosMiddleware: AxiosInstanceWrapper): Promise<GetAllCasesResponse> {
    return await handleApiCall(async () => {
        const configuredAxios = configureAxiosInstance(axiosMiddleware);
        const response = await configuredAxios.get<GetAllCasesResponse>('/call_centre/api/v1/case/');
        return response.data;
    }, 'Error fetching all cases');
}
/**
 * Updates the personal details (address) for a case.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @param {string} caseId The id of the case to update.
 * @param {{ address: Record<string, unknown> }} body The personal details payload.
 * @param {Record<string, unknown>} body.address The address fields to save.
 * @returns {Promise<void>} Resolves when the personal details have been updated.
 */
export async function updatePersonalDetails(
  axiosMiddleware: AxiosInstanceWrapper,
  caseId: string,
  body: Record<string, unknown>,
): Promise<void> {
  await handleApiCall(async () => {
    const configuredAxios = configureAxiosInstance(axiosMiddleware);
    await configuredAxios.put(`/call_centre/api/v1/case/${encodeURIComponent(caseId)}/personal_details/`, body);
  }, "Error updating personal details");
}

/**
 * Searches for cases matching the given query.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @param {SearchCasesParams} params The search query and pagination parameters.
 * @returns {Promise<SearchCasesResponse>} The response containing the matching cases.
 */
export async function searchCases(axiosMiddleware: AxiosInstanceWrapper, params: SearchCasesParams): Promise<SearchCasesResponse> {
    return await handleApiCall(async () => {
        const configuredAxios = configureAxiosInstance(axiosMiddleware);
        const response = await configuredAxios.get<SearchCasesResponse>(
            `/call_centre/api/v1/case/?search=${encodeURIComponent(params.query)}&page_size=${params.pageSize ?? DEFAULT_PAGE_SIZE}&page=${params.pageNumber ?? DEFAULT_PAGE_NUMBER}`
        );

        return response.data;
    }, 'Error searching cases');
}

/**
 * Creates a new case.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @returns {Promise<CaseDetails>} The response containing the created case.
 */
export async function createCase(axiosMiddleware: AxiosInstanceWrapper): Promise<CaseDetails> {
    return await handleApiCall(async () => {
        const configuredAxios = configureAxiosInstance(axiosMiddleware);
        const response = await configuredAxios.post<CaseDetails>('/call_centre/api/v1/case/');
        return response.data;
    }, 'Error creating case');
}