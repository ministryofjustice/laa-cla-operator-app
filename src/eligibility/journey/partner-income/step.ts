import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { partnerIncomeBlock } from "../partner-blocks.js";

export const PARTNER_INCOME_STEP_CODE = "partner_income";

export const partnerIncomeStep = step({
  code: PARTNER_INCOME_STEP_CODE,
  path: "/partner-income",
  title: "Partner income",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerIncomeBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_income") })],
      },
    }),
  ],
});
