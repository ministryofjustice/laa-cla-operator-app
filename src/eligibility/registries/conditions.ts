import {
  ConditionRegistry,
  type ConditionFunctionExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import { stepsFor } from "../domain/navigation.js";
import type { Answers } from "../domain/logic.js";
import { netIncomeIsPositive } from "../domain/income.js";

export interface EligibilityConditionShape {
  // Type assertion needed due to Forge's condition typing incompatibility
  // The condition correctly checks step relevance at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StepIsRelevant: (stepCode: string) => any;
}

const EligibilityConditionsImplementation = {
  /**
   * Checks if a step is relevant based on current answers.
   * @param stepCode - The step code to check
   * @returns A function that evaluates step relevance
   */
  StepIsRelevant:
    (stepCode: string) =>
    (_deps: EligibilityDeps) =>
    (answers: Answers): boolean => {
      const relevantSteps = stepsFor(answers);
      return relevantSteps.includes(stepCode);
    },
};

export const EligibilityConditionsRegistry =
  new ConditionRegistry<EligibilityDeps>();

export const EligibilityConditions: EligibilityConditionShape = {
  /**
   * Registers a condition to check if a step is relevant.
   * @param stepCode - The step code to check
   * @returns The registered condition
   */
  StepIsRelevant: (stepCode: string) =>
    EligibilityConditionsRegistry.register(
      `StepIsRelevant_${stepCode}`,
      EligibilityConditionsImplementation.StepIsRelevant(stepCode),
    ),
};

/**
 * Passes when the income in the field, less the tax and National Insurance
 * answers given, is still positive. See `netIncomeIsPositive`.
 */
export const NetIncomeIsPositive = EligibilityConditionsRegistry.register(
  "NetIncomeIsPositive",
  () => (gross: unknown, tax: unknown, nationalInsurance: unknown) =>
    netIncomeIsPositive(gross, tax, nationalInsurance),
);
