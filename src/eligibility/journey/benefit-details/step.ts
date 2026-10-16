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
import { benefitDetailsBlock } from "./block.js";

export const BENEFIT_DETAILS_STEP_CODE = "benefit_details";

export const benefitDetailsStep = step({
  code: BENEFIT_DETAILS_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(BENEFIT_DETAILS_STEP_CODE),
  },
  path: "/benefit-details",
  title: "Benefit details",
  validWhen: [
    validation({
      condition: Post("benefit_details").match(Condition.IsRequired()),
      message: "Enter which benefits the client receives",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [benefitDetailsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.benefit_details") })],
      },
    }),
  ],
});
