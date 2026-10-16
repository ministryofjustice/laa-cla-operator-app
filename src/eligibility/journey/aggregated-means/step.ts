import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { aggregatedMeansBlock } from "./block.js";

export const AGGREGATED_MEANS_STEP_CODE = "aggregated_means";

export const aggregatedMeansStep = step({
  code: AGGREGATED_MEANS_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/aggregated-means",
  title: "Aggregated means",
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
