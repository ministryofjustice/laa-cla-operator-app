import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse, SearchCasesParams, CaseDetails, SearchCasesWithContactDetailsResponse } from "#types/api-types.js";

export interface Deps {
  caseApi: CaseApiService;
}

export interface CaseApiService {
  getAllCases: (
    axiosMiddleware: AxiosInstanceWrapper,
  ) => Promise<GetAllCasesResponse>;
  searchCasesWithContactDetails: (axiosMiddleware: AxiosInstanceWrapper, params: SearchCasesParams) => Promise<SearchCasesWithContactDetailsResponse>;
  createCase: (axiosMiddleware: AxiosInstanceWrapper) => Promise<CaseDetails>;
  updatePersonalDetails: (
    axiosMiddleware: AxiosInstanceWrapper,
    caseId: string,
    body: Record<string, unknown>,
  ) => Promise<void>;
}
