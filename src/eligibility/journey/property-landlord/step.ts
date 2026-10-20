import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import {
  propertyLandlordBackLinkBlock,
  propertyLandlordBlock,
} from "./block.js";

export const PROPERTY_LANDLORD_STEP_CODE = "property_landlord";

export const propertyLandlordStep = step({
  code: PROPERTY_LANDLORD_STEP_CODE,
  path: "/property-landlord",
  title: "Property landlord",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [propertyLandlordBackLinkBlock, propertyLandlordBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.property_landlord") })],
      },
    }),
  ],
});
