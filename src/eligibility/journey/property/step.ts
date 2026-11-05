import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { propertyBlock } from "./block.js";

export const PROPERTY_STEP_CODE = "property";

export const propertyStep = step({
  code: PROPERTY_STEP_CODE,
  path: "/property",
  title: eligibilityCopy.property_details,
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [propertyBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.property") })],
      },
    }),
  ],
});
