import axios from "axios";
import type {
  Assessor,
  CfeResult,
  StateBenefitType,
} from "../ports/assessor.js";

interface CfeConfig {
  baseUrl: string;
}

interface CfeAssessmentResponse {
  success: boolean;
  result_summary?: {
    overall_result?: {
      result?: unknown;
    };
    disposable_income?: {
      combined_total_disposable_income?: number;
    };
    capital?: {
      combined_assessed_capital?: number;
    };
  };
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
    console.log(`[CFE] Assessment payload: ${JSON.stringify(payload)}`);
    try {
      const response =
        await this.axiosInstance.post<CfeAssessmentResponse | null>(
          `${this.config.baseUrl}/v6/assessments`,
          payload,
        );

      const { data } = response;
      console.log(
        `[CFE] Assessment response (${response.status}): ${JSON.stringify(data)}`,
      );
      return CfeHttpClient.translateResponse(data);
    } catch (error) {
      CfeHttpClient.logFailure(error);
      const errors = axios.isAxiosError<
        { errors?: unknown } | null | undefined
      >(error)
        ? error.response?.data?.errors
        : undefined;
      const validationDetails =
        Array.isArray(errors) &&
        errors.every(
          (message): message is string => typeof message === "string",
        )
          ? `; validation errors: ${errors.join("; ")}`
          : "";
      throw new Error(
        `CFE assessment failed: ${error instanceof Error ? error.message : String(error)}${validationDetails}`,
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
   * Logs CFE's status and response body for a failed assessment.
   *
   * @param error - The error thrown by the assessment request
   */
  private static logFailure(error: unknown): void {
    if (!axios.isAxiosError(error)) return;
    console.error(
      `[CFE] Assessment failed (${error.response?.status ?? "no response"}): ${JSON.stringify(error.response?.data)}`,
    );
  }

  /**
   * Maps the v6 assessment summary to the module's result.
   *
   * @returns The eligibility decision and combined financial calculations
   * @throws Error if CFE did not return a successful, supported assessment
   */
  private static translateResponse(
    data: CfeAssessmentResponse | null,
  ): CfeResult {
    if (data?.success !== true) {
      throw new Error("CFE did not return a successful assessment");
    }
    const { result_summary: summary } = data;
    return {
      result: CfeHttpClient.translateResult(summary?.overall_result?.result),
      calculations: {
        disposable_income:
          summary?.disposable_income?.combined_total_disposable_income,
        disposable_capital: summary?.capital?.combined_assessed_capital,
      },
    };
  }

  /**
   * Translates CFE result string to typed result.
   *
   * @param cfeResult - The result string from CFE
   * @returns The typed result
   * @throws Error if CFE returns a missing or unsupported result
   */
  private static translateResult(cfeResult: unknown): CfeResult["result"] {
    if (
      cfeResult === "eligible" ||
      cfeResult === "ineligible" ||
      cfeResult === "contribution_required"
    ) {
      return cfeResult;
    }
    throw new Error(`Unsupported CFE assessment result: ${String(cfeResult)}`);
  }
}
