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
import { aggregatedMeansBlock } from "./block.js";

export const AGGREGATED_MEANS_STEP_CODE = "aggregated_means";

export const aggregatedMeansStep = step({
  code: AGGREGATED_MEANS_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(AGGREGATED_MEANS_STEP_CODE),
  },
  path: "/aggregated-means",
  title: "Aggregated means",
  validWhen: [
    validation({
      condition: Post("aggregated_means").match(Condition.IsRequired()),
      message: "Select whether income should be aggregated",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [aggregatedMeansBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.aggregated_means") })],
      },
    }),
  ],
});
