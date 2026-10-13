import { step, submit, access, redirect, Data, validation, Post, Condition } from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { vehiclesBlock, vehicleDetailsBlock } from "../vehicles-blocks.js";

export const VEHICLES_STEP_CODE = "vehicles";
export const VEHICLE_DETAILS_STEP_CODE = "vehicle_details";

export const vehiclesStep = step({
  code: VEHICLES_STEP_CODE,
  path: "/vehicles",
  title: "Vehicles",
  validWhen: [validation({ condition: Post("vehicles").match(Condition.IsRequired()), message: "Select whether the client owns vehicles" })],
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "eligibility/step.njk" },
  blocks: [vehiclesBlock],
  onSubmission: [submit({ validate: true, onValid: { effects: [EligibilityEffects.SaveAnswers()], next: [redirect({ goto: Data("nav.vehicles") })] } })],
});

export const vehicleDetailsStep = step({
  code: VEHICLE_DETAILS_STEP_CODE,
  path: "/vehicle-details",
  title: "Vehicle details",
  validWhen: [validation({ condition: Post("vehicle_details").match(Condition.IsRequired()), message: "Enter details of the vehicles" })],
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "eligibility/step.njk" },
  blocks: [vehicleDetailsBlock],
  onSubmission: [submit({ validate: true, onValid: { effects: [EligibilityEffects.SaveAnswers()], next: [redirect({ goto: Data("nav.vehicle_details") })] } })],
});
