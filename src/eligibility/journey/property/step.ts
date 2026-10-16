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
  reachability: {
    entryWhen: true,
  },
  path: "/property",
  title: "Property details",
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
