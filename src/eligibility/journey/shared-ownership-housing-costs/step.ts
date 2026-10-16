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
import { EligibilityConditions } from "../../registries/conditions.js";
import { sharedOwnershipHousingCostsBlock } from "./block.js";

export const SHARED_OWNERSHIP_HOUSING_COSTS_STEP_CODE =
  "shared_ownership_housing_costs";

export const sharedOwnershipHousingCostsStep = step({
  code: SHARED_OWNERSHIP_HOUSING_COSTS_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(
      SHARED_OWNERSHIP_HOUSING_COSTS_STEP_CODE,
    ),
  },
  path: "/shared-ownership-housing-costs",
  title: "Shared ownership housing costs",
  validWhen: [
    validation({
      condition: Post("shared_ownership_housing_costs").match(
        Condition.IsRequired(),
      ),
      message: "Enter the monthly housing costs",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [sharedOwnershipHousingCostsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.shared_ownership_housing_costs") })],
      },
    }),
  ],
});
