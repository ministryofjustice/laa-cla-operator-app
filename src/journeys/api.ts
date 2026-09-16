import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse } from "#types/api-types.js";


export interface Deps {
    caseApi: CaseApiEffectsWithDeps;
}

export interface CaseApiEffectsWithDeps {
    getAllCases: (axiosMiddleware: AxiosInstanceWrapper) => Promise<GetAllCasesResponse>;
}

export interface CaseApiService {
    getAllCases: (axiosMiddleware: AxiosInstanceWrapper) => Promise<GetAllCasesResponse>;
}