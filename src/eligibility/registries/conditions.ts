import { ConditionRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import { stepsFor } from "../domain/navigation.js";
import type { Answers } from "../domain/logic.js";

export interface EligibilityConditionShape {
  StepIsRelevant: (stepCode: string) => unknown;
}

const EligibilityConditionsImplementation = {
  /**
   * Checks if a step is relevant based on current answers.
   * @param stepCode - The step code to check
   * @returns A function that evaluates step relevance
   */
  StepIsRelevant: (stepCode: string) => (_deps: EligibilityDeps) => (answers: Answers): boolean => {
    const relevantSteps = stepsFor(answers);
    return relevantSteps.includes(stepCode);
  },
};

export const EligibilityConditionsRegistry = new ConditionRegistry<EligibilityDeps>();

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
