import {
  step,
  submit,
  access,
  redirect,
  Data,
  validation,
  Post,
  Condition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { EligibilityConditions } from "../../registries/effects.js";
import { benefitsBlock } from "./block.js";

export const BENEFITS_STEP_CODE = "benefits";

export const benefitsStep = step({
  code: BENEFITS_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(BENEFITS_STEP_CODE),
  },
  path: "/benefits",
  title: "Benefits",
  validWhen: [
    validation({
      condition: Post("benefits").match(Condition.IsRequired()),
      message: "Select whether the client receives benefits",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [benefitsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.benefits") })],
      },
    }),
  ],
});
