import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { partnerBenefitDetailsBlock } from "../partner-blocks.js";

export const PARTNER_BENEFIT_DETAILS_STEP_CODE = "partner_benefit_details";

export const partnerBenefitDetailsStep = step({
  code: PARTNER_BENEFIT_DETAILS_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/partner-benefit-details",
  title: "Partner benefit details",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerBenefitDetailsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_benefit_details") })],
      },
    }),
  ],
});
