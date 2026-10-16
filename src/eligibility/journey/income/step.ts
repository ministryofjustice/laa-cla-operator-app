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
import { incomeBlock } from "./block.js";

export const INCOME_STEP_CODE = "income";

export const incomeStep = step({
  code: INCOME_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/income",
  title: "Income",
  validWhen: [
    validation({
      condition: Post("income").match(Condition.IsRequired()),
      message: "Enter the client's monthly income",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [incomeBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.income") })],
      },
    }),
  ],
});
