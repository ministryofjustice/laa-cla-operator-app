import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { partnerEmploymentStatusBlock } from "../partner-blocks.js";

export const PARTNER_EMPLOYMENT_STATUS_STEP_CODE = "partner_employment_status";

export const partnerEmploymentStatusStep = step({
  code: PARTNER_EMPLOYMENT_STATUS_STEP_CODE,
  path: "/partner-employment-status",
  title: eligibilityCopy.partner_employment_status,
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerEmploymentStatusBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_employment_status") })],
      },
    }),
  ],
});
