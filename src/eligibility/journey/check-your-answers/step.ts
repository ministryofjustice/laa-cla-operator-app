import {
  step,
  submit,
  access,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { EligibilityConditions } from "../../registries/conditions.js";
import {
  checkYourAnswersHeadingBlock,
  checkYourAnswersSummaryBlock,
  checkYourAnswersButtonBlock,
} from "./block.js";

export const CHECK_YOUR_ANSWERS_STEP_CODE = "check_your_answers";

export const checkYourAnswersStep = step({
  code: CHECK_YOUR_ANSWERS_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(CHECK_YOUR_ANSWERS_STEP_CODE),
  },
  path: "/check-your-answers",
  title: "Check your answers",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [
    checkYourAnswersHeadingBlock,
    checkYourAnswersSummaryBlock,
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
