import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../registries/effects.js";
import { createAddAnotherStep } from "./add-another-step.js";
import {
  additionalPropertyBlock,
  additionalPropertyDetailsBlock,
  partnerAdditionalPropertyBlock,
  partnerAdditionalPropertyDetailsBlock,
} from "./additional-property-blocks.js";

export const ADDITIONAL_PROPERTY_STEP_CODE = "additional_property";
export const ADDITIONAL_PROPERTY_DETAILS_STEP_CODE =
  "additional_property_details";
export const PARTNER_ADDITIONAL_PROPERTY_STEP_CODE =
  "partner_additional_property";
export const PARTNER_ADDITIONAL_PROPERTY_DETAILS_STEP_CODE =
  "partner_additional_property_details";

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

export const additionalPropertyDetailsStep = createAddAnotherStep({
  code: ADDITIONAL_PROPERTY_DETAILS_STEP_CODE,
  title: "Additional property details",
  listKey: "additional_properties",
  blocks: [additionalPropertyDetailsBlock],
});

export const partnerAdditionalPropertyStep = step({
  code: PARTNER_ADDITIONAL_PROPERTY_STEP_CODE,
  path: "/partner-additional-property",
  title: "Partner's additional properties",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerAdditionalPropertyBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_additional_property") })],
      },
    }),
  ],
});

export const partnerAdditionalPropertyDetailsStep = createAddAnotherStep({
  code: PARTNER_ADDITIONAL_PROPERTY_DETAILS_STEP_CODE,
  title: "Partner's additional property details",
  listKey: "partner_additional_properties",
  blocks: [partnerAdditionalPropertyDetailsBlock],
});
