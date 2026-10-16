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
import { EligibilityConditions } from "../../registries/conditions.js";
import { partnerOutgoingsBlock } from "./block.js";

export const PARTNER_OUTGOINGS_STEP_CODE = "partner_outgoings";

export const partnerOutgoingsStep = step({
  code: PARTNER_OUTGOINGS_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(PARTNER_OUTGOINGS_STEP_CODE),
  },
  path: "/partner-outgoings",
  title: "Partner outgoings",
  validWhen: [
    validation({
      condition: Post("partner_outgoings").match(Condition.IsRequired()),
      message: "Enter the partner's monthly outgoings",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerOutgoingsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_outgoings") })],
      },
    }),
  ],
});
