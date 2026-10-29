import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { partnerBenefitsBlock } from "../partner-blocks.js";

export const PARTNER_BENEFITS_STEP_CODE = "partner_benefits";

export const partnerBenefitsStep = step({
  code: PARTNER_BENEFITS_STEP_CODE,
  path: "/partner-benefits",
  title: eligibilityCopy.partner_benefits,
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerBenefitsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_benefits") })],
      },
    }),
  ],
});
