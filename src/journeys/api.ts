import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse } from "#types/api-types.js";

export interface Deps {
    caseApi: CaseApiService;
    postcodeapi: PostcodeLookupService
}

export interface CaseApiService {
    getAllCases: (axiosMiddleware: AxiosInstanceWrapper) => Promise<GetAllCasesResponse>;
}

export interface PostcodeLookupService {
    lookup: (building: string, postcode: string) => Promise<{ address: string }[] | null>;
}