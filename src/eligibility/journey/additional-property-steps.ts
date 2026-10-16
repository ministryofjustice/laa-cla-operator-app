import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../registries/effects.js";
import {
  additionalPropertyBlock,
  additionalPropertyDetailsBlock,
} from "./additional-property-blocks.js";

export const ADDITIONAL_PROPERTY_STEP_CODE = "additional_property";
export const ADDITIONAL_PROPERTY_DETAILS_STEP_CODE =
  "additional_property_details";

export const additionalPropertyStep = step({
  code: ADDITIONAL_PROPERTY_STEP_CODE,
  path: "/additional-property",
  title: "Additional properties",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [additionalPropertyBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.additional_property") })],
      },
    }),
  ],
});

export const additionalPropertyDetailsStep = step({
  code: ADDITIONAL_PROPERTY_DETAILS_STEP_CODE,
  path: "/additional-property-details",
  title: "Additional property details",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [additionalPropertyDetailsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.additional_property_details") })],
      },
    }),
  ],
});
