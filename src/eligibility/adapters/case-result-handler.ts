import type { ResultHandler } from "../ports/result-handler.js";

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

    // TODO: Save the eligibility assessment result to the case
    // This will be implemented once we know the case API endpoint and schema
    // For now, log the result for debugging
    console.log("CFE Assessment Result:", {
      checkId,
      result: result.result,
      disposable_income: result.calculations?.disposable_income,
      disposable_capital: result.calculations?.disposable_capital,
      upper_tribunal: result.calculations?.upper_tribunal,
    });

    // When implemented, this should call something like:
    // await caseApi.updateEligibility(checkId, {
    //   assessment_result: result.result,
    //   disposable_income: result.calculations?.disposable_income,
    //   disposable_capital: result.calculations?.disposable_capital,
    //   upper_tribunal: result.calculations?.upper_tribunal,
    // });
  }
}

export const caseResultHandler = new CaseResultHandler();
