import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { GetAllCasesResponse } from "#types/api-types.js";
import type { PostcodeLookupService } from "#src/services/postcodeLookup.js";

export interface Deps {
    caseApi: CaseApiService;
    postcodeapi: PostcodeLookupService
}

export interface CaseApiService {
  getAllCases: (axiosMiddleware: AxiosInstanceWrapper) => Promise<GetAllCasesResponse>;
  updatePersonalDetails: (
    axiosMiddleware: AxiosInstanceWrapper,
    caseId: string,
    body: { address: Record<string, unknown> },
  ) => Promise<void>;
}
