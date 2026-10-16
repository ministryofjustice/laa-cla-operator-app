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
import { partnerEmploymentStatusBlock } from "../partner-blocks.js";

export const PARTNER_EMPLOYMENT_STATUS_STEP_CODE = "partner_employment_status";

export const partnerEmploymentStatusStep = step({
  code: PARTNER_EMPLOYMENT_STATUS_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/partner-employment-status",
  title: "Partner employment status",
  validWhen: [
    validation({
      condition: Post("partner_employment_status").match(
        Condition.IsRequired(),
      ),
      message: "Select the partner's employment status",
    }),
  ],
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
