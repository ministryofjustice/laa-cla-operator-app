import axios from "axios";
import type {
  Assessor,
  CfeResult,
  StateBenefitType,
} from "../ports/assessor.js";

interface CfeConfig {
  baseUrl: string;
}

const EMPTY_LENGTH = 0;

/**
 * HTTP client for communicating with the CFE (Check Financial Eligibility) service.
 */
export class CfeHttpClient implements Assessor {
  private readonly axiosInstance = axios.create();

  /**
   * Creates a new CfeHttpClient.
   *
   * @param config - Configuration including CFE base URL
   * @throws Error if baseUrl is not provided
   */
  constructor(private readonly config: CfeConfig) {
    const baseUrl = config.baseUrl.trim();
    if (baseUrl.length === EMPTY_LENGTH) {
      throw new Error(
        "CfeHttpClient requires config.baseUrl (CFE_HOST environment variable)",
      );
    }
  }

  /**
   * Performs a financial eligibility assessment using CFE.
   *
   * @param payload - The assessment request payload
   * @returns The assessment result with eligibility determination and calculations
   * @throws Error if the assessment fails
   */
  async assess(payload: unknown): Promise<CfeResult> {
    try {
      const response = await this.axiosInstance.post<{
        assessment_result?: string;
        disposable_income_amount?: number;
        disposable_capital_amount?: number;
        upper_tribunal_available?: boolean;
      }>(`${this.config.baseUrl}/v6/assessments`, payload);

      const { data } = response;
      const result = CfeHttpClient.translateResult(
        data.assessment_result ?? "",
      );

      return {
        result,
        calculations: {
          disposable_income: data.disposable_income_amount,
          disposable_capital: data.disposable_capital_amount,
          upper_tribunal: data.upper_tribunal_available,
        },
      };
    } catch (error) {
      throw new Error(
        `CFE assessment failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Fetches available state benefit types from CFE.
   *
   * @returns Array of state benefit types
   * @throws Error if the fetch fails
   */
  async stateBenefitTypes(): Promise<StateBenefitType[]> {
    try {
      const response = await this.axiosInstance.get<StateBenefitType[]>(
        `${this.config.baseUrl}/state_benefit_type`,
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch benefit types: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Translates CFE result string to typed result.
   *
   * @param cfeResult - The result string from CFE
   * @returns The typed result, defaulting to ineligible for unknown values
   */
  private static translateResult(cfeResult: string): CfeResult["result"] {
    // CFE returns result as a string like "eligible", "ineligible", "contribution_required"
    if (
      cfeResult === "eligible" ||
      cfeResult === "ineligible" ||
      cfeResult === "contribution_required"
    ) {
      return cfeResult;
    }
    // Default to ineligible if we get an unexpected value
    return "ineligible";
  }
}
