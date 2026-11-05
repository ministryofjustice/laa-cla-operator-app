import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { partnerOtherIncomeBlock } from "../partner-blocks.js";

export const PARTNER_OTHER_INCOME_STEP_CODE = "partner_other_income";

export const partnerOtherIncomeStep = step({
  code: PARTNER_OTHER_INCOME_STEP_CODE,
  path: "/partner-other-income",
  title: eligibilityCopy.partner_other_income,
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerOtherIncomeBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_other_income") })],
      },
    }),
  ],
});
