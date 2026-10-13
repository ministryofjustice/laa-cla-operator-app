// Port of CCQ's Steps::AssetsAndVehiclesSection (app/lib/steps/assets_and_vehicles_section.rb).
import type { Answers } from "../logic.js";
import {
  controlled,
  ownsVehicle,
  partner,
  skipCapitalQuestions,
} from "../logic.js";
import type { Group, Section } from "./shared.js";
import { compactGroups } from "./shared.js";

/** Vehicle-related step codes. */
export const VEHICLE_STEPS: readonly string[] = ["vehicles", "vehicle_details"];
/** Asset-related step codes. */
export const ASSET_STEPS: readonly string[] = ["assets", "partner_assets"];

/** Every step code this section can ever produce. */
export const ALL_STEPS: readonly string[] = [...ASSET_STEPS, ...VEHICLE_STEPS];

/**
 * The vehicle steps, not asked at all for controlled work.
 * @param {Answers} answers - the saved answers
 * @returns {Group | undefined} the vehicle group, if relevant
 */
function vehicleSteps(answers: Answers): Group | undefined {
  if (controlled(answers)) return undefined;
  return ownsVehicle(answers) ? ["vehicles", "vehicle_details"] : ["vehicles"];
}

/**
 * The step groups this section contributes, skipped entirely when capital
 * questions are not relevant.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups, in order
 */
function groupedStepsFor(answers: Answers): Group[] {
  if (skipCapitalQuestions(answers)) return [];
  if (partner(answers)) {
    return compactGroups([
      ["assets"],
      ["partner_assets"],
      vehicleSteps(answers),
    ]);
  }
  return compactGroups([["assets"], vehicleSteps(answers)]);
}

/** Port of CCQ's `Steps::AssetsAndVehiclesSection`. */
export const assetsAndVehiclesSection: Section = {
  allSteps: ALL_STEPS,
  groupedStepsFor,
};
