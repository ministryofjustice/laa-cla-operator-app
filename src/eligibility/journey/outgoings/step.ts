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
import { outgoingsBlock } from "./block.js";

export const OUTGOINGS_STEP_CODE = "outgoings";

export const outgoingsStep = step({
  code: OUTGOINGS_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/outgoings",
  title: "Outgoings",
  validWhen: [
    validation({
      condition: Post("outgoings").match(Condition.IsRequired()),
      message: "Enter the client's monthly outgoings",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [outgoingsBlock],
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
