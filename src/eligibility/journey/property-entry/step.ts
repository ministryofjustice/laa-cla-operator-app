import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { propertyEntryHeadingBlock, propertyEntryBlock } from "./block.js";

export const PROPERTY_ENTRY_STEP_CODE = "property_entry";

export const propertyEntryStep = step({
  code: PROPERTY_ENTRY_STEP_CODE,
  path: "/property-entry",
  title: "Property details",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [propertyEntryHeadingBlock, propertyEntryBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.property_entry") })],
      },
    }),
  ],
});
