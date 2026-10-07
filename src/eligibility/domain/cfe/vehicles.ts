// Port of CCQ's `Cfe::VehiclePayloadService` + `CfeParamBuilders::Vehicles`.
import type { Answers } from "../logic.js";
import { yearsAgo, toIsoDate } from "./dates.js";
import { asArray } from "./types.js";
import type { VehicleItem, VehiclePayload } from "./types.js";

const ZERO = 0;
const OVER_3_YEARS_AGO = 4;
const RECENTLY_PURCHASED = 2;

/**
 * Builds the vehicles section of a CFE payload. Ported from
 * `CfeParamBuilders::Vehicles.call`.
 * @param {VehicleItem[]} vehicles - the saved vehicle rows
 * @param {boolean} smodApplicable - whether disputed assets can be flagged
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {VehiclePayload[]} the vehicles section
 */
export function buildVehicles(
  vehicles: VehicleItem[],
  smodApplicable: boolean,
  today: Date,
): VehiclePayload[] {
  return vehicles.map((vehicle) => ({
    value: vehicle.vehicle_value,
    loan_amount_outstanding: vehicle.vehicle_pcp
      ? (vehicle.vehicle_finance ?? ZERO)
      : ZERO,
    date_of_purchase: toIsoDate(
      yearsAgo(
        vehicle.vehicle_over_3_years_ago ? OVER_3_YEARS_AGO : RECENTLY_PURCHASED,
        today,
      ),
    ),
    in_regular_use: vehicle.vehicle_in_regular_use,
    subject_matter_of_dispute: vehicle.vehicle_in_dispute === true && smodApplicable,
  }));
}

/**
 * Builds the `vehicles` section of a CFE payload, if the client has any
 * vehicles. Ported from `Cfe::VehiclePayloadService`.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @param {boolean} smodApplicable - whether disputed assets can be flagged
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {VehiclePayload[] | undefined} the vehicles, if relevant
 */
export function buildVehiclesSection(
  answers: Answers,
  relevantSteps: Set<string>,
  smodApplicable: boolean,
  today: Date,
): VehiclePayload[] | undefined {
  if (!relevantSteps.has("vehicles_details")) return undefined;
  return buildVehicles(asArray<VehicleItem>(answers.vehicles), smodApplicable, today);
}
