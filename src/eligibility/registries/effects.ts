import {
  EffectRegistry,
  type EffectFunctionContext,
  type EffectFunctionExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import {
  cannotUseService,
  stepsFor,
  relevantAnswers,
} from "../domain/navigation.js";
import { withClientAge } from "../domain/client-age.js";
import type { Answers } from "../domain/logic.js";

// Yes/no radios post "true"/"false", but the domain logic (ported from CCQ)
// expects booleans: `truthy("false")` is true.
const FORM_BOOLEANS: Readonly<Record<string, boolean>> = {
  true: true,
  false: false,
};

const NEXT_STEP_OFFSET = 1;

// Journey steps outside the domain's step list
const CHECK_YOUR_ANSWERS_PATH = "check-your-answers";
const CANNOT_USE_SERVICE_PATH = "cannot-use-service";

/**
 * The URL path segment for a step code.
 * @param {string} step - a step code
 * @returns {string} the step's path segment
 */
function toPath(step: string): string {
  return step.replace(/_/gu, "-");
}

/**
 * Converts answers as Forge holds them into the shape the domain expects.
 * @param {Answers} formAnswers - answers keyed by field code, as posted
 * @returns {Answers} the same answers with yes/no strings as booleans
 */
function toDomainAnswers(formAnswers: Answers): Answers {
  return Object.fromEntries(
    Object.entries(formAnswers).map(([key, value]) => [
      key,
      typeof value === "string" && value in FORM_BOOLEANS
        ? FORM_BOOLEANS[value]
        : value,
    ]),
  );
}

/**
 * Converts a saved domain answer back into the value its form field posts.
 * @param {unknown} value - a saved answer
 * @returns {unknown} the value as Forge's field expects it
 */
function toFormValue(value: unknown): unknown {
  return typeof value === "boolean" ? String(value) : value;
}

/**
 * Today's date, as the UTC midnight instant the domain's date logic expects.
 * @returns {Date} today at UTC midnight
 */
function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
}

/**
 * Where a step goes once answered: off the service for an unsupported
 * route, otherwise to the next relevant step, or to check your answers
 * after the last one.
 * @param {Answers} answers - all saved answers
 * @param {string} step - the answered step code
 * @param {string | undefined} nextStep - the next relevant step code, if any
 * @returns {string} the path segment to go to
 */
function nextPath(
  answers: Answers,
  step: string,
  nextStep: string | undefined,
): string {
  if (cannotUseService(answers, step)) return CANNOT_USE_SERVICE_PATH;
  return nextStep === undefined ? CHECK_YOUR_ANSWERS_PATH : toPath(nextStep);
}

/**
 * Publishes the next-step map that each step's redirect reads via
 * `Data("nav.<step>")`, and that Forge's reachability walk follows.
 * Computed from all saved answers, as CCQ does: the section logic already
 * ignores answers for branches the client is no longer on.
 * @param {EffectFunctionContext} context - the effect context
 * @param {Answers} answers - all saved answers
 */
function publishNavigation(
  context: EffectFunctionContext,
  answers: Answers,
): void {
  const domainAnswers = withClientAge(answers, todayUtc());
  const steps = stepsFor(domainAnswers);
  const navigationMap = Object.fromEntries(
    steps.map((step, index) => [
      step,
      nextPath(domainAnswers, step, steps.at(index + NEXT_STEP_OFFSET)),
    ]),
  );

  context.setData("nav", navigationMap);
  context.setData("steps", steps);
}

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
            context.setAnswer(key, toFormValue(value));
          }
        }

        console.error("[LoadAnswers] Computing navigation");
        publishNavigation(context, answers);
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

        // Forge has already parsed and validated every field on the step, so
        // persist its answers rather than picking known fields off the POST.
        // Forge's reachability walk only follows a step's redirect once that
        // step's answer is loaded back, so an unsaved answer strands every
        // step after it.
        await answerStore.save(
          checkId,
          toDomainAnswers(context.getAllAnswers()),
        );

        const allAnswers = await answerStore.load(checkId);
        console.error(
          `[SaveAnswers] Saved answers: ${JSON.stringify(allAnswers)}`,
        );

        publishNavigation(context, allAnswers);
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

      const today = todayUtc();
      const allAnswers = withClientAge(await answerStore.load(checkId), today);
      const filtered = relevantAnswers(allAnswers);

      // Build assessment payload
      const payload = buildAssessment(filtered, today);

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
