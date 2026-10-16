import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../registries/effects.js";
import {
  dependantDetailsBlock,
  dependantIncomeBlock,
  dependantIncomeDetailsBlock,
} from "./dependant-blocks.js";

export const DEPENDANT_DETAILS_STEP_CODE = "dependant_details";
export const DEPENDANT_INCOME_STEP_CODE = "dependant_income";
export const DEPENDANT_INCOME_DETAILS_STEP_CODE = "dependant_income_details";

export const dependantDetailsStep = step({
  code: DEPENDANT_DETAILS_STEP_CODE,
  path: "/dependant-details",
  title: "Dependant details",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [dependantDetailsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.dependant_details") })],
      },
    }),
  ],
});

export const dependantIncomeStep = step({
  code: DEPENDANT_INCOME_STEP_CODE,
  path: "/dependant-income",
  title: "Dependant income",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [dependantIncomeBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.dependant_income") })],
      },
    }),
  ],
});

export const dependantIncomeDetailsStep = step({
  code: DEPENDANT_INCOME_DETAILS_STEP_CODE,
  path: "/dependant-income-details",
  title: "Dependant income details",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [dependantIncomeDetailsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.dependant_income_details") })],
      },
    }),
  ],
});
