import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { regularIncomeBlock } from "./block.js";

export const REGULAR_INCOME_STEP_CODE = "regular_income";

export const regularIncomeStep = step({
  code: REGULAR_INCOME_STEP_CODE,
  path: "/regular-income",
  title: "Regular income",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [regularIncomeBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.regular_income") })],
      },
    }),
  ],
});
