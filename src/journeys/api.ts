import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse, SearchCasesParams, CaseDetails, CreateCasePayload } from "#types/api-types.js";

export interface Deps {
  caseApi: CaseApiService;
}

export interface CaseApiService {
  getAllCases: (
    axiosMiddleware: AxiosInstanceWrapper,
  ) => Promise<GetAllCasesResponse>;
  searchCases: (axiosMiddleware: AxiosInstanceWrapper, params: SearchCasesParams) => Promise<GetAllCasesResponse>;
  createCase: (axiosMiddleware: AxiosInstanceWrapper, payload: CreateCasePayload) => Promise<CaseDetails>;
  updatePersonalDetails: (
    axiosMiddleware: AxiosInstanceWrapper,
    caseId: string,
    body: Record<string, unknown>,
  ) => Promise<void>;
}
