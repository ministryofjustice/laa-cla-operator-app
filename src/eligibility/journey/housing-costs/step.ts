import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { housingCostsBlock } from "./block.js";

export const HOUSING_COSTS_STEP_CODE = "housing_costs";

export const housingCostsStep = step({
  code: HOUSING_COSTS_STEP_CODE,
  path: "/housing-costs",
  title: "Housing costs",
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
