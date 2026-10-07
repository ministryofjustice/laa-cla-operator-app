import { ConditionRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import { stepsFor } from "../domain/navigation.js";
import type { Answers } from "../domain/logic.js";

export interface EligibilityConditionShape {
  StepIsRelevant: (stepCode: string) => unknown;
}

const EligibilityConditionsImplementation = {
  StepIsRelevant: (stepCode: string) => (_deps: EligibilityDeps) => (answers: Answers): boolean => {
    const relevantSteps = stepsFor(answers);
    return relevantSteps.includes(stepCode);
  },
};

export const EligibilityConditionsRegistry = new ConditionRegistry<EligibilityDeps>();

export const EligibilityConditions: EligibilityConditionShape = {
  StepIsRelevant: (stepCode: string) =>
    EligibilityConditionsRegistry.register(
      `StepIsRelevant_${stepCode}`,
      EligibilityConditionsImplementation.StepIsRelevant(stepCode),
    ),
};
