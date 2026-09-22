import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse } from "#types/api-types.js";

export interface Deps {
  caseApi: CaseApiService;
}

export interface CaseApiService {
  getAllCases: (axiosMiddleware: AxiosInstanceWrapper) => Promise<GetAllCasesResponse>;
  updatePersonalDetails: (
    axiosMiddleware: AxiosInstanceWrapper,
    caseId: string,
    body: Record<string, unknown>,
  ) => Promise<void>;

}
