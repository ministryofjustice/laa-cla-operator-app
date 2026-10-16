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
import { partnerOtherIncomeBlock } from "../partner-blocks.js";

export const PARTNER_OTHER_INCOME_STEP_CODE = "partner_other_income";

export const partnerOtherIncomeStep = step({
  code: PARTNER_OTHER_INCOME_STEP_CODE,
  reachability: { entryWhen: true },
  path: "/partner-other-income",
  title: "Partner other income",
  validWhen: [
    validation({
      condition: Post("partner_other_income").match(Condition.IsRequired()),
      message: "Select whether the partner has other income",
    }),
  ],
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
