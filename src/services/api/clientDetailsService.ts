import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse } from "#types/api-types.js";
import { configureAxiosInstance } from "./baseApiService.js"


/**
 *
 * @param axiosMiddleware
 */
export async function getAllCases(axiosMiddleware: AxiosInstanceWrapper): Promise<GetAllCasesResponse> {
    const configuredAxios = configureAxiosInstance(axiosMiddleware);

    const response = await configuredAxios.get<GetAllCasesResponse>(`/call_centre/api/v1/case/`);
    
    return response.data;
}