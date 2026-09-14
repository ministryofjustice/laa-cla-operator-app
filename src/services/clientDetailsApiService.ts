import { BaseApiService } from "./baseApiService.js";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { AxiosResponse } from "axios";

const CLIENT_DETAILS_TIMEOUT_MS = 10000;

export interface ClientDetailsData {
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
}

/**
 * Client Details API Service
 *
 * Placeholder implementation pending confirmation of the real endpoint,
 * payload shape, and auth requirements from the backend team.
 */
export class ClientDetailsApiService extends BaseApiService {
  /**
   * Initialise ClientDetailsApiService
   */
  constructor() {
    super({
      baseUrl: process.env.CLA_API_URL ?? "", // TODO: confirm real base URL
      timeout: CLIENT_DETAILS_TIMEOUT_MS,
      apiPrefix: "", // TODO: confirm real API prefix, e.g. /cla_provider/api/v1
      enableLogging: true,
    });
  }

  /**
   * Create a new client
   * @param {AxiosInstanceWrapper} axiosMiddleware - Axios middleware from request
   * @param {ClientDetailsData} clientData - Client details submitted from the form
   * @returns {Promise<AxiosResponse>} Promise resolving to raw axios response
   */
  async createClient(
    axiosMiddleware: AxiosInstanceWrapper,
    clientData: ClientDetailsData,
  ): Promise<AxiosResponse> {
    // TODO: confirm real endpoint path and payload field names once the API ticket is complete
    return await this.post(axiosMiddleware, "/case/", clientData);
  }
}

export const clientDetailsApiService = new ClientDetailsApiService();
