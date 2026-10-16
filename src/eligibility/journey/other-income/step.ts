import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { otherIncomeBlock } from "./block.js";

export const OTHER_INCOME_STEP_CODE = "other_income";

export const otherIncomeStep = step({
  code: OTHER_INCOME_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/other-income",
  title: "Other income",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [otherIncomeBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.other_income") })],
      },
    }),
  ],
});
