import {
  EffectRegistry,
  type EffectFunctionContext,
  type EffectFunctionExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
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
    try {
      console.error("[LoadAnswers] Starting LoadAnswers effect");
      const checkId = context.getRequestParam("caseId");
      console.error(`[LoadAnswers] checkId: ${checkId}`);
      const answerStore = deps.answerStore;
      console.error(`[LoadAnswers] answerStore available: ${!!answerStore}`);

      if (!answerStore) {
        throw new Error("answerStore not provided to eligibility package");
      }

      let answers = await answerStore.load(checkId);
      console.error(`[LoadAnswers] answers loaded: ${JSON.stringify(answers)}`);

      // On first access, preload date_of_birth from case data
      if (Object.keys(answers).length === 0 && deps.caseApi) {
        try {
          console.error("[LoadAnswers] Attempting to preload DOB from case data");
          // Get the axios middleware from the request (Forge provides this in context)
          const forgeContext = context as EffectFunctionContext & { axiosMiddleware?: AxiosInstanceWrapper };
          const axiosMiddleware = forgeContext.axiosMiddleware;
          console.error(`[LoadAnswers] axiosMiddleware available: ${!!axiosMiddleware}`);
          if (axiosMiddleware) {
            const caseData = await deps.caseApi.loadCase(axiosMiddleware, String(checkId));
            console.error(`[LoadAnswers] caseData loaded: ${JSON.stringify(caseData)}`);
            if (caseData.date_of_birth) {
              answers.date_of_birth = caseData.date_of_birth;
              // Save the preloaded DOB to session
              await answerStore.save(checkId, { date_of_birth: caseData.date_of_birth });
              console.error("[LoadAnswers] DOB preloaded and saved");
            }
          }
        } catch (error) {
          // Log but don't fail - DOB can be entered manually if fetch fails
          console.warn(`Failed to preload DOB from case: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.error("[LoadAnswers] Setting answers in Forge");
      // Set each answer in Forge
      for (const [key, value] of Object.entries(answers)) {
        if (value !== undefined && value !== null) {
          context.setAnswer(key, value);
        }
      }

      console.error("[LoadAnswers] Computing navigation");
      // Compute navigation
      const steps = stepsFor(answers);
      const navigationMap: Record<string, string | undefined> = {};

      for (let i = 0; i < steps.length; i++) {
        const currentStep = steps[i];
        const nextStep = steps[i + 1];
        // Convert underscore step codes to hyphen paths for URL routing
        navigationMap[currentStep] = nextStep ? nextStep.replace(/_/g, "-") : undefined;
      }

      context.setData("nav", navigationMap);
      context.setData("steps", steps);
      console.error("[LoadAnswers] LoadAnswers effect completed successfully");
    } catch (error) {
      console.error(`[LoadAnswers] FATAL ERROR: ${error instanceof Error ? error.stack : String(error)}`);
      throw error;
    }
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
      // Convert underscore step codes to hyphen paths for URL routing
      navigationMap[currentStep] = nextStep ? nextStep.replace(/_/g, "-") : undefined;
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
