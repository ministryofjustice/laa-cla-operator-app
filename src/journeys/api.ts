import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse, SearchCasesParams, CaseDetails, SearchCasesResponse } from "#types/api-types.js";

export interface Deps {
  caseApi: CaseApiService;
}

export interface CaseApiService {
  getAllCases: (
    axiosMiddleware: AxiosInstanceWrapper,
  ) => Promise<GetAllCasesResponse>;
  searchCases: (axiosMiddleware: AxiosInstanceWrapper, params: SearchCasesParams) => Promise<SearchCasesResponse>;
  createCase: (axiosMiddleware: AxiosInstanceWrapper) => Promise<CaseDetails>;
  updatePersonalDetails: (
    axiosMiddleware: AxiosInstanceWrapper,
    caseId: string,
    body: Record<string, unknown>,
  ) => Promise<void>;
}
