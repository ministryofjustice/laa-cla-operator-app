import {
  EffectRegistry,
  type EffectFunctionContext,
  type EffectFunctionExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import { stepsFor, relevantAnswers, cannotUseService } from "../domain/navigation.js";
import type { Answers } from "../domain/logic.js";

export interface EligibilityEffectShape {
  LoadAnswers: () => EffectFunctionExpr;
  SaveAnswers: () => EffectFunctionExpr;
  RunAssessment: () => EffectFunctionExpr;
}

type EffectImplementation = (
  deps: EligibilityDeps,
) => (context: EffectFunctionContext) => Promise<void>;

const EligibilityEffectsImplementation: Record<keyof EligibilityEffectShape, EffectImplementation> = {
  LoadAnswers: (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
    const checkId = context.getRequestParam("caseId");
    const answerStore = deps.answerStore;

    if (!answerStore) {
      throw new Error("answerStore not provided to eligibility package");
    }

    const answers = await answerStore.load(checkId);

    // Set each answer in Forge
    for (const [key, value] of Object.entries(answers)) {
      if (value !== undefined && value !== null) {
        context.setAnswer(key, value);
      }
    }

    // Compute navigation
    const steps = stepsFor(answers);
    const navigationMap: Record<string, string | undefined> = {};

    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      navigationMap[currentStep] = nextStep;
    }

    context.setData("nav", navigationMap);
    context.setData("steps", steps);
  },

  SaveAnswers: (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
    const checkId = context.getRequestParam("caseId");
    const answerStore = deps.answerStore;

    if (!answerStore) {
      throw new Error("answerStore not provided to eligibility package");
    }

    // Get all answers that Forge has stored from the form submission
    // We need to iterate through all answers Forge has loaded
    const postedAnswers: Answers = {};
    // This is a simplification - in reality we need to track which fields are form fields
    // For Phase 2a, we'll just save what we get from the storage reload
    // In Phase 2b when we implement steps, we'll know exactly which fields are posted

    // Save whatever we have to session (in practice, Forge will have set answers via setAnswer in blocks)
    // Since we can't easily enumerate all current answers, we'll reload and compare
    const previousAnswers = await answerStore.load(checkId);
    // For now, just save what we know exists
    if (Object.keys(previousAnswers).length > 0) {
      await answerStore.save(checkId, previousAnswers);
    }

    // Reload all answers to recompute navigation
    const allAnswers = await answerStore.load(checkId);

    // Recompute navigation
    const steps = stepsFor(allAnswers);
    const navigationMap: Record<string, string | undefined> = {};

    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      navigationMap[currentStep] = nextStep;
    }

    context.setData("nav", navigationMap);
    context.setData("steps", steps);
  },

  RunAssessment: (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
    const checkId = context.getRequestParam("caseId");
    const answerStore = deps.answerStore;

    if (!answerStore) {
      throw new Error("answerStore not provided to eligibility package");
    }

    // Import here to avoid circular dependencies
    const { buildAssessment } = await import("../domain/cfe/payload.js");

    // Get all answers
    const allAnswers = await answerStore.load(checkId);
    const filtered = relevantAnswers(allAnswers);

    // Build assessment payload
    const payload = buildAssessment(filtered, new Date());

    // Call assessor
    const result = await deps.assessor.assess(payload);

    // Call result handler
    await deps.resultHandler.handle({
      checkId,
      answers: filtered,
      result,
    });

    // Clear answers
    await answerStore.clear(checkId);
  },
};

export const EligibilityEffectsRegistry = new EffectRegistry<EligibilityDeps>();

export const EligibilityEffects: EligibilityEffectShape = {
  LoadAnswers: EligibilityEffectsRegistry.register(
    "LoadAnswers",
    EligibilityEffectsImplementation.LoadAnswers,
  ),
  SaveAnswers: EligibilityEffectsRegistry.register(
    "SaveAnswers",
    EligibilityEffectsImplementation.SaveAnswers,
  ),
  RunAssessment: EligibilityEffectsRegistry.register(
    "RunAssessment",
    EligibilityEffectsImplementation.RunAssessment,
  ),
};
