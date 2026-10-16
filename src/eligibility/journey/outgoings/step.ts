import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { outgoingsHeadingBlock, outgoingsBlock } from "./block.js";

export const OUTGOINGS_STEP_CODE = "outgoings";

export const outgoingsStep = step({
  code: OUTGOINGS_STEP_CODE,
  path: "/outgoings",
  title: "Outgoings",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [outgoingsHeadingBlock, outgoingsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.outgoings") })],
      },
    }),
  ],
});
