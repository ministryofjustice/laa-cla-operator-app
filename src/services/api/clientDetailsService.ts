import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { SearchClientDetailsResponse } from "#types/api-types.js";
import { configureAxiosInstance } from "./baseApiService.js"


/**
 *
 * @param axiosMiddleware
 * @param searchParam
 */
export async function searchClientDetails(axiosMiddleware: AxiosInstanceWrapper, searchParam: string): Promise<SearchClientDetailsResponse> {
    const configuredAxios = configureAxiosInstance(axiosMiddleware)

    const response = await configuredAxios.get<SearchClientDetailsResponse>(`/call_centre/api/v1/case/?search=${encodeURIComponent(searchParam)}`);
    console.log("The API Response is: ", response.data);
    
    return response.data;
}