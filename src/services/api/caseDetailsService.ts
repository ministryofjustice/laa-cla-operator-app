import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse, SearchCasesParams } from "#types/api-types.js";
import { configureAxiosInstance, handleApiCall } from "./baseApiService.js";

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
 * @param {string} query The search query string.
 * @returns {Promise<GetAllCasesResponse>} The response containing the matching cases.
 */
export async function searchCases(axiosMiddleware: AxiosInstanceWrapper, params: SearchCasesParams): Promise<GetAllCasesResponse> {
    return await handleApiCall(async () => {
        const configuredAxios = configureAxiosInstance(axiosMiddleware);
        const response = await configuredAxios.get<GetAllCasesResponse>(
            `/call_centre/api/v1/case/?search=${encodeURIComponent(params.query)}&page_size=${params.pageSize ?? 10}&page=${params.pageNumber ?? 1}`
        );

        return response.data;
    }, 'Error searching cases');
}