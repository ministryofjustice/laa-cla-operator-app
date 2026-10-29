import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { partnerOutgoingsBlock } from "../partner-blocks.js";

export const PARTNER_OUTGOINGS_STEP_CODE = "partner_outgoings";

export const partnerOutgoingsStep = step({
  code: PARTNER_OUTGOINGS_STEP_CODE,
  path: "/partner-outgoings",
  title: eligibilityCopy.partner_outgoings,
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
