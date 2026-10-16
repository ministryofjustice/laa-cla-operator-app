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
import { housingCostsBlock } from "./block.js";

export const HOUSING_COSTS_STEP_CODE = "housing_costs";

export const housingCostsStep = step({
  code: HOUSING_COSTS_STEP_CODE,
  reachability: { entryWhen: true },
  path: "/housing-costs",
  title: "Housing costs",
  validWhen: [
    validation({
      condition: Post("housing_costs").match(Condition.IsRequired()),
      message: "Enter the monthly housing cost",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [housingCostsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.housing_costs") })],
      },
    }),
  ],
});
