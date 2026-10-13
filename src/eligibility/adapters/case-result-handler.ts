import type { ResultHandler } from "../ports/result-handler.js";
import { caseDetailsService } from "../../services/api/caseDetailsService.js";

/**
 * Handles CFE assessment results by saving them to the case
 */
export class CaseResultHandler implements ResultHandler {
  async handle(input: {
    checkId: unknown;
    answers: unknown;
    result: {
      result: "eligible" | "contribution_required" | "ineligible";
      calculations?: {
        disposable_income?: number;
        disposable_capital?: number;
        upper_tribunal?: boolean;
      };
    };
  }): Promise<void> {
    const { checkId, result } = input;

    // Save the eligibility assessment result to the case
    // This would typically store the result in the database via caseDetailsService
    // For now, we're creating the structure but actual implementation depends on
    // the case schema and API endpoints

    try {
      // TODO: Update once case schema is finalized
      // This should save the result to case.eligibility_check[checkId] or similar
      console.log("Assessment result:", {
        checkId,
        result: result.result,
        disposable_income: result.calculations?.disposable_income,
        disposable_capital: result.calculations?.disposable_capital,
      });
    } catch (error) {
      throw new Error(
        `Failed to save assessment result: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const caseResultHandler = new CaseResultHandler();
