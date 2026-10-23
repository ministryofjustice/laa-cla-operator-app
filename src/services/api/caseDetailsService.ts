import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type {
  CaseDetails,
  GetAllCasesResponse,
  SearchCasesParams,
  SearchCasesResponse,
  saveAdaptationDetailsResponse,
  saveAdaptationDetailsParams,
  FinancialEligibilityData,
  GetFinancialEligibilityApiResponse,
} from "#types/api-types.js";
import { configureAxiosInstance, handleApiCall } from "./baseApiService.js";
import { transformFinancialEligibilityItem } from "./transforms/transformFinancialEligibility.js";
import {
  devLog,
  extractAndLogError,
  isNotFoundError,
} from "#src/scripts/helpers/index.js";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_NUMBER = 1;

/**
 * Retrieves all cases from the API.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @returns {Promise<GetAllCasesResponse>} The response containing all cases.
 */
export async function getAllCases(
  axiosMiddleware: AxiosInstanceWrapper,
): Promise<GetAllCasesResponse> {
  return await handleApiCall(async () => {
    const configuredAxios = configureAxiosInstance(axiosMiddleware);
    const response = await configuredAxios.get<GetAllCasesResponse>(
      "/call_centre/api/v1/case/",
    );
    return response.data;
  }, "Error fetching all cases");
}

/**
 * Retrieves a case from the API.
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @param {string} caseId - The case id to load
 * @returns {Promise<GetAllCasesResponse>} The response containing all cases.
 */
export async function loadCase(
  axiosMiddleware: AxiosInstanceWrapper,
  caseId: string,
): Promise<CaseDetails> {
  return await handleApiCall(async () => {
    const configuredAxios = configureAxiosInstance(axiosMiddleware);
    const response = await configuredAxios.get<CaseDetails>(
      `/call_centre/api/v1/case/${caseId}`,
    );
    return response.data;
  }, "Error loading case");
}

/**
 * Updates the personal details (address) for a case.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @param {string} caseId The id of the case to update.
 * @param {{ address: Record<string, unknown> }} body The personal details payload.
 * @param {Record<string, unknown>} body.address The address fields to save.
 * @returns {Promise<void>} Resolves when the personal details have been updated.
 */
export async function updatePersonalDetails(
  axiosMiddleware: AxiosInstanceWrapper,
  caseId: string,
  body: Record<string, unknown>,
): Promise<void> {
  await handleApiCall(async () => {
    const configuredAxios = configureAxiosInstance(axiosMiddleware);
    await configuredAxios.patch(
      `/call_centre/api/v1/case/${caseId}/personal_details/`,
      body,
    );
  }, "Error updating personal details");
}

/**
 * Searches for cases matching the given query.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @param {SearchCasesParams} params The search query and pagination parameters.
 * @returns {Promise<SearchCasesResponse>} The response containing the matching cases.
 */
export async function searchCases(
  axiosMiddleware: AxiosInstanceWrapper,
  params: SearchCasesParams,
): Promise<SearchCasesResponse> {
  return await handleApiCall(async () => {
    const configuredAxios = configureAxiosInstance(axiosMiddleware);
    const response = await configuredAxios.get<SearchCasesResponse>(
      `/call_centre/api/v1/case/?search=${encodeURIComponent(params.query)}&page_size=${params.pageSize ?? DEFAULT_PAGE_SIZE}&page=${params.pageNumber ?? DEFAULT_PAGE_NUMBER}`,
    );

    return response.data;
  }, "Error searching cases");
}

/**
 * Creates a new case.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @returns {Promise<CaseDetails>} The response containing the created case.
 */
export async function createCase(
  axiosMiddleware: AxiosInstanceWrapper,
): Promise<CaseDetails> {
  return await handleApiCall(async () => {
    const configuredAxios = configureAxiosInstance(axiosMiddleware);
    const response = await configuredAxios.post<CaseDetails>(
      "/call_centre/api/v1/case/",
    );
    return response.data;
  }, "Error creating case");
}

/**
 * Creates or updates a client's adaptation details.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @param {boolean} isUpdate Whether to create (POST) or update (PATCH) the adaptation details.
 * @param {string} caseId The ID of the case the adaptation details belong to.
 * @param {saveAdaptationDetailsParams} body The adaptation details payload to send.
 * @returns {Promise<saveAdaptationDetailsResponse>} The saved adaptation details.
 */
export async function saveAdaptationDetails(
  axiosMiddleware: AxiosInstanceWrapper,
  isUpdate: boolean,
  caseId: string,
  body: saveAdaptationDetailsParams,
): Promise<saveAdaptationDetailsResponse> {
  const configuredAxios = configureAxiosInstance(axiosMiddleware);
  const url = `/call_centre/api/v1/case/${caseId}/adaptation_details/`;

  const response = isUpdate
    ? await configuredAxios.patch<saveAdaptationDetailsResponse>(url, body)
    : await configuredAxios.post<saveAdaptationDetailsResponse>(url, body);

  return response.data;
}

/**
 * Get the financial eligibility check for a case.
 * Cases created by operators have no eligibility check until one is first saved,
 * so a 404 is treated as "no data yet" rather than an error.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @param {string} caseId The case reference.
 * @returns {Promise<GetFinancialEligibilityApiResponse>} The eligibility data, null data when none exists, or an error response.
 */
export async function getFinancialEligibility(
  axiosMiddleware: AxiosInstanceWrapper,
  caseId: string,
): Promise<GetFinancialEligibilityApiResponse> {
  const url = `/call_centre/api/v1/case/${caseId}/eligibility_check/`;
  try {
    devLog(`API: GET ${url}`);
    const configuredAxios = configureAxiosInstance(axiosMiddleware);
    const response = await configuredAxios.get(url);
    return {
      data: transformFinancialEligibilityItem(response.data),
      status: "success",
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      devLog(`No eligibility check exists yet for case ${caseId}`);
      return { data: null, status: "success" };
    }
    return {
      data: null,
      status: "error",
      message: extractAndLogError(
        error,
        "Error fetching financial eligibility",
      ),
    };
  }
}

/**
 * Update the financial eligibility check for a case, creating it if it does not exist yet.
 *
 * @param {AxiosInstanceWrapper} axiosMiddleware The Axios instance wrapper used to make the API call.
 * @param {string} caseId The case reference.
 * @param {Partial<FinancialEligibilityData>} financialEligibilityData The eligibility_check payload.
 * @returns {Promise<GetFinancialEligibilityApiResponse>} The saved eligibility data or an error response.
 */
export async function updateFinancialEligibility(
  axiosMiddleware: AxiosInstanceWrapper,
  caseId: string,
  financialEligibilityData: Partial<FinancialEligibilityData>,
): Promise<GetFinancialEligibilityApiResponse> {
  const url = `/call_centre/api/v1/case/${caseId}/eligibility_check/`;
  const configuredAxios = configureAxiosInstance(axiosMiddleware);
  try {
    const savedData = await patchOrCreate(
      configuredAxios,
      url,
      financialEligibilityData,
    );
    return {
      data: transformFinancialEligibilityItem(savedData),
      status: "success",
    };
  } catch (error) {
    return {
      data: null,
      status: "error",
      message: extractAndLogError(
        error,
        "Error updating financial eligibility",
      ),
    };
  }
}

/**
 * PATCH a nested one-to-one resource, falling back to POST when it does not exist yet (404).
 *
 * @param {AxiosInstanceWrapper} configuredAxios The configured Axios instance wrapper.
 * @param {string} url The resource URL.
 * @param {unknown} body The request payload.
 * @returns {Promise<unknown>} The response data.
 */
async function patchOrCreate(
  configuredAxios: AxiosInstanceWrapper,
  url: string,
  body: unknown,
): Promise<unknown> {
  try {
    devLog(`API: PATCH ${url}`);
    const response = await configuredAxios.patch<unknown>(url, body);
    return response.data;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
    devLog(`API: POST ${url}`);
    const response = await configuredAxios.post<unknown>(url, body);
    return response.data;
  }
}
