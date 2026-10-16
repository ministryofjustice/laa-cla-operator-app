import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../registries/effects.js";
import { vehiclesBlock, vehicleDetailsBlock } from "./vehicles-blocks.js";

export const VEHICLE_STEP_CODE = "vehicle";
export const VEHICLES_DETAILS_STEP_CODE = "vehicles_details";

export const vehiclesStep = step({
  code: VEHICLE_STEP_CODE,
  path: "/vehicle",
  title: "Vehicles",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [vehiclesBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.vehicle") })],
      },
    }),
  ],
});

export const vehicleDetailsStep = step({
  code: VEHICLES_DETAILS_STEP_CODE,
  path: "/vehicles-details",
  title: "Vehicle details",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [vehicleDetailsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.vehicles_details") })],
      },
    }),
  ],
});
