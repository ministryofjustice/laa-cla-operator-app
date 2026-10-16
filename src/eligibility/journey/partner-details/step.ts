import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { partnerDetailsBlock } from "./block.js";

export const PARTNER_DETAILS_STEP_CODE = "partner_details";

export const partnerDetailsStep = step({
  code: PARTNER_DETAILS_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/partner-details",
  title: "Partner details",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerDetailsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_details") })],
      },
    }),
  ],
});
