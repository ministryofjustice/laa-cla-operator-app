import axios from "axios";
import type { Assessor, CfeResult, StateBenefitType } from "../ports/assessor.js";

interface CfeConfig {
  baseUrl: string;
}

export class CfeHttpClient implements Assessor {
  private axiosInstance = axios.create();

  constructor(private config: CfeConfig) {
    if (!config.baseUrl) {
      throw new Error("CfeHttpClient requires config.baseUrl (CFE_HOST environment variable)");
    }
  }

  async assess(payload: unknown): Promise<CfeResult> {
    try {
      const response = await this.axiosInstance.post<{
        assessment_result?: string;
        disposable_income_amount?: number;
        disposable_capital_amount?: number;
        upper_tribunal_available?: boolean;
      }>(`${this.config.baseUrl}/v6/assessments`, payload);

      const data = response.data;
      const result = this.translateResult(data.assessment_result ?? "");

      return {
        result,
        calculations: {
          disposable_income: data.disposable_income_amount,
          disposable_capital: data.disposable_capital_amount,
          upper_tribunal: data.upper_tribunal_available,
        },
      };
    } catch (error) {
      // Let the effect handle the error
      throw new Error(
        `CFE assessment failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async stateBenefitTypes(): Promise<StateBenefitType[]> {
    try {
      const response = await this.axiosInstance.get<StateBenefitType[]>(
        `${this.config.baseUrl}/state_benefit_type`,
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch benefit types: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private translateResult(cfeResult: string): CfeResult["result"] {
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
