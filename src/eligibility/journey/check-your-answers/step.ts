import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  type EffectFunctionExpr,
  type StepDefinition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import {
  checkYourAnswersHeadingBlock,
  checkYourAnswersSummaryBlock,
  checkYourAnswersButtonBlock,
  checkYourAnswersListBlock,
} from "./block.js";

export const CHECK_YOUR_ANSWERS_STEP_CODE = "check_your_answers";

/**
 * Creates the review step with the summary loader for this package.
 * @param {EffectFunctionExpr} loadSummary - the package's summary-loading effect
 * @returns {StepDefinition} the review step
 */
export const createCheckYourAnswersStep = (
  loadSummary: EffectFunctionExpr,
): StepDefinition =>
  step({
    code: CHECK_YOUR_ANSWERS_STEP_CODE,
    path: "/check-your-answers",
    title: eligibilityCopy.check_your_answers,
    onAccess: [
      access({
        effects: [EligibilityEffects.LoadAnswers(), loadSummary],
      }),
    ],
    view: { template: "main/eligibility/step.njk" },
    blocks: [
      checkYourAnswersHeadingBlock,
      checkYourAnswersSummaryBlock,
      checkYourAnswersListBlock,
      checkYourAnswersButtonBlock,
    ],
    onSubmission: [
      submit({
        validate: false,
        onValid: {
          effects: [EligibilityEffects.RunAssessment()],
        },
      }),
    ],
  });
