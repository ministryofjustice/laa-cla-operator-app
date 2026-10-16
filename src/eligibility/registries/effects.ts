import {
  EffectRegistry,
  type EffectFunctionContext,
  type EffectFunctionExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import {
  stepsFor,
  relevantAnswers,
} from "../domain/navigation.js";
import type { Answers } from "../domain/logic.js";

export interface EligibilityEffectShape {
  LoadAnswers: () => EffectFunctionExpr;
  SaveAnswers: () => EffectFunctionExpr;
  RunAssessment: () => EffectFunctionExpr;
}

type EffectImplementation = (
  deps: EligibilityDeps,
) => (context: EffectFunctionContext) => Promise<void>;

const EligibilityEffectsImplementation: Record<
  keyof EligibilityEffectShape,
  EffectImplementation
> = {
  /**
   *
   * @param deps
   */
  LoadAnswers:
    (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
      try {
        console.error("[LoadAnswers] Starting LoadAnswers effect");
        const checkId = context.getRequestParam("caseId");
        console.error(`[LoadAnswers] checkId: ${checkId}`);
        const {answerStore} = deps;
        console.error(`[LoadAnswers] answerStore available: ${!!answerStore}`);

        if (!answerStore) {
          throw new Error("answerStore not provided to eligibility package");
        }

        const answers = await answerStore.load(checkId);
        console.error(
          `[LoadAnswers] answers loaded: ${JSON.stringify(answers)}`,
        );

        // On first access, preload date_of_birth from case data
        if (Object.keys(answers).length === 0 && deps.caseApi) {
          try {
            console.error(
              "[LoadAnswers] Attempting to preload DOB from case data",
            );
            // Get the axios middleware from the request (Forge provides this in context)
            const forgeContext = context as EffectFunctionContext & {
              axiosMiddleware?: AxiosInstanceWrapper;
            };
            const {axiosMiddleware} = forgeContext;
            console.error(
              `[LoadAnswers] axiosMiddleware available: ${!!axiosMiddleware}`,
            );
            if (axiosMiddleware) {
              const caseData = await deps.caseApi.loadCase(
                axiosMiddleware,
                String(checkId),
              );
              console.error(
                `[LoadAnswers] caseData loaded: ${JSON.stringify(caseData)}`,
              );
              if (caseData.date_of_birth) {
                answers.date_of_birth = caseData.date_of_birth;
                // Save the preloaded DOB to session
                await answerStore.save(checkId, {
                  date_of_birth: caseData.date_of_birth,
                });
                console.error("[LoadAnswers] DOB preloaded and saved");
              }
            }
          } catch (error) {
            // Log but don't fail - DOB can be entered manually if fetch fails
            console.warn(
              `Failed to preload DOB from case: ${error instanceof Error ? error.message : String(error)}`,
            );
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
          navigationMap[currentStep] = nextStep
            ? nextStep.replace(/_/gu, "-")
            : undefined;
        }

        context.setData("nav", navigationMap);
        context.setData("steps", steps);
        console.error(
          "[LoadAnswers] LoadAnswers effect completed successfully",
        );
      } catch (error) {
        console.error(
          `[LoadAnswers] FATAL ERROR: ${error instanceof Error ? error.stack : String(error)}`,
        );
        throw error;
      }
    },

  /**
   *
   * @param deps
   */
  SaveAnswers:
    (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
      try {
        console.error("[SaveAnswers] Starting SaveAnswers effect");
        const checkId = context.getRequestParam("caseId");
        console.error(`[SaveAnswers] checkId: ${checkId}`);
        const {answerStore} = deps;

        if (!answerStore) {
          throw new Error("answerStore not provided to eligibility package");
        }

        // Load previous answers to merge with posted data
        const previousAnswers = await answerStore.load(checkId);
        console.error(
          `[SaveAnswers] previousAnswers: ${JSON.stringify(previousAnswers)}`,
        );

        // Get posted form data. Forge passes form fields as POST data.
        // For now, we collect all posted data by checking common field names
        const postedAnswers: Answers = {};

        // Get all possible form field values from POST data
        // This is a generic approach that works for simple form fields
        const postDataKeys = [
          "level_of_help",
          "domestic_abuse_applicant",
          "date_of_birth",
          "client_age",
          // Add other known field names as needed
        ];

        for (const key of postDataKeys) {
          const value = context.getPostData(key);
          if (value !== undefined && value !== null) {
            postedAnswers[key] = value;
            console.error(`[SaveAnswers] Posted data: ${key} = ${value}`);
          }
        }

        // Merge posted answers with previous answers
        const merged = { ...previousAnswers, ...postedAnswers };
        console.error(
          `[SaveAnswers] Merged answers: ${JSON.stringify(merged)}`,
        );

        // Save merged answers to session
        if (Object.keys(postedAnswers).length > 0) {
          await answerStore.save(checkId, postedAnswers);
          console.error("[SaveAnswers] Answers saved to session");
        }

        // Reload all answers to recompute navigation
        const allAnswers = await answerStore.load(checkId);
        console.error(
          `[SaveAnswers] Reloaded answers: ${JSON.stringify(allAnswers)}`,
        );

        // Recompute navigation
        const steps = stepsFor(allAnswers);
        const navigationMap: Record<string, string | undefined> = {};

        for (let i = 0; i < steps.length; i++) {
          const currentStep = steps[i];
          const nextStep = steps[i + 1];
          // Convert underscore step codes to hyphen paths for URL routing
          navigationMap[currentStep] = nextStep
            ? nextStep.replace(/_/g, "-")
            : undefined;
        }

        console.error(
          `[SaveAnswers] Navigation map computed, next step for level_of_help: ${navigationMap.level_of_help}`,
        );
        context.setData("nav", navigationMap);
        context.setData("steps", steps);
        console.error(
          "[SaveAnswers] SaveAnswers effect completed successfully",
        );
      } catch (error) {
        console.error(
          `[SaveAnswers] FATAL ERROR: ${error instanceof Error ? error.stack : String(error)}`,
        );
        throw error;
      }
    },

  /**
   *
   * @param deps
   */
  RunAssessment:
    (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
      const checkId = context.getRequestParam("caseId");
      const {answerStore} = deps;

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
