import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { benefitDetailsBlock } from "./block.js";

export const BENEFIT_DETAILS_STEP_CODE = "benefit_details";

export const benefitDetailsStep = step({
  code: BENEFIT_DETAILS_STEP_CODE,
  path: "/benefit-details",
  title: "Benefit details",
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
