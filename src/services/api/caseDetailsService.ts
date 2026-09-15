import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse } from "#types/api-types.js";
import { configureAxiosInstance } from "./baseApiService.js"

/**
 * Retrieves all cases from the API.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @returns {Promise<GetAllCasesResponse>} The response containing all cases.
 */
export async function getAllCases(axiosMiddleware: AxiosInstanceWrapper): Promise<GetAllCasesResponse> {
    const configuredAxios = configureAxiosInstance(axiosMiddleware);

    const response = await configuredAxios.get<GetAllCasesResponse>(`/call_centre/api/v1/case/`);
    
    return response.data;
}