import eligibilityCopy from "../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../registries/effects.js";
import { createAddAnotherStep } from "./add-another-step.js";
import { VEHICLES_LIST } from "../lists/index.js";
import { vehiclesBlock, vehicleDetailsBlocks } from "./vehicles-blocks.js";

export const VEHICLE_STEP_CODE = "vehicle";
export const VEHICLES_DETAILS_STEP_CODE = "vehicles_details";

export const vehiclesStep = step({
  code: VEHICLE_STEP_CODE,
  path: "/vehicle",
  title: eligibilityCopy.vehicles,
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

export const vehicleDetailsStep = createAddAnotherStep({
  code: VEHICLES_DETAILS_STEP_CODE,
  title: eligibilityCopy.dynamic.vehicles.heading,
  listKey: VEHICLES_LIST.key,
  blocks: vehicleDetailsBlocks,
});
