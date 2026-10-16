import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { howToAggregateBlock } from "./block.js";

export const HOW_TO_AGGREGATE_STEP_CODE = "how_to_aggregate";

export const howToAggregateStep = step({
  code: HOW_TO_AGGREGATE_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/how-to-aggregate",
  title: "How to aggregate income",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [howToAggregateBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.how_to_aggregate") })],
      },
    }),
  ],
});
