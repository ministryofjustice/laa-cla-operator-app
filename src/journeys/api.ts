import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse, SearchCasesParams } from "#types/api-types.js";


export interface Deps {
    caseApi: CaseApiService;
}

export interface CaseApiService {
    getAllCases: (axiosMiddleware: AxiosInstanceWrapper) => Promise<GetAllCasesResponse>;
    searchCases: (axiosMiddleware: AxiosInstanceWrapper, params: SearchCasesParams) => Promise<GetAllCasesResponse>;
}