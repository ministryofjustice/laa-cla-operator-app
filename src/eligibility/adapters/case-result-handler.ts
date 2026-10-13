import type { ResultHandler } from "../ports/result-handler.js";

/**
 * Handles CFE assessment results by saving them to the case.
 *
 * TEMPORARY IMPLEMENTATION (D9):
 * This uses the existing cla_backend eligibility check endpoint, which calls CFE again
 * to save the result. This causes a double CFE call but allows testing with persistence.
 * Once the backend team implements a dedicated endpoint that saves without re-calling CFE,
 * this should be updated to use that instead (see decision D9 and question Q3 in the plan).
 */
export class CaseResultHandler implements ResultHandler {
  /**
   * Creates a new CaseResultHandler.
   *
   * @param caseApi - Optional API client for saving to case
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- apiService is large, we only use updateEligibilityCheck
  constructor(private readonly caseApi?: any) {}

  /**
   * Handles a CFE assessment result by logging and persisting it.
   *
   * @param input - The assessment result to handle
   * @returns A promise that resolves when handling is complete
   */
  // eslint-disable-next-line complexity -- Method complexity is inherent to this business logic
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

    // Log result for debugging/monitoring
    console.log("CFE Assessment Result:", {
      checkId,
      result: result.result,
      disposable_income: result.calculations?.disposable_income,
      disposable_capital: result.calculations?.disposable_capital,
      upper_tribunal: result.calculations?.upper_tribunal,
    });

    // Save to case through existing endpoint
    // WARNING: This causes a double CFE call (D9 optimization pending)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- caseApi is intentionally typed as any to avoid large apiService type
    if (this.caseApi?.updateEligibilityCheck !== undefined) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- caseApi is intentionally typed as any to avoid large apiService type
        await this.caseApi.updateEligibilityCheck(null, String(checkId), {
          state: result.result,
          calculations: {
            disposable_income: result.calculations?.disposable_income,
            disposable_capital: result.calculations?.disposable_capital,
            upper_tribunal: result.calculations?.upper_tribunal,
          },
        });
      } catch (error) {
        console.error("Failed to save eligibility result:", error);
        throw new Error(
          `Failed to save assessment result: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
  }
}
