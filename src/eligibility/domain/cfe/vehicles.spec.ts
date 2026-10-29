// Port of CCQ's vehicle_payload_service_spec.rb.
import { strict as assert } from "assert";
import { buildVehiclesSection } from "./vehicles.js";
import { yearsAgo, toIsoDate } from "./dates.js";

const TODAY = new Date(Date.UTC(2024, 5, 1));

describe("domain/cfe/vehicles (port of Cfe::VehiclePayloadService)", () => {
  it("builds each vehicle's date of purchase, loan amount and dispute flag", () => {
    const answers = {
      vehicle_owned: true,
      vehicles: [
        {
          vehicle_value: 5556,
          vehicle_pcp: true,
          vehicle_finance: 4445,
          vehicle_over_3_years_ago: true,
          vehicle_in_regular_use: false,
          vehicle_in_dispute: true,
        },
        {
          vehicle_value: 1112,
          vehicle_pcp: false,
          vehicle_finance: 888,
          vehicle_over_3_years_ago: false,
          vehicle_in_regular_use: true,
          vehicle_in_dispute: false,
        },
      ],
    };

    assert.deepEqual(
      buildVehiclesSection(answers, new Set(["vehicles_details"]), true, TODAY),
      [
        {
          value: 5556,
          loan_amount_outstanding: 4445,
          date_of_purchase: toIsoDate(yearsAgo(4, TODAY)),
          in_regular_use: false,
          subject_matter_of_dispute: true,
        },
        {
          value: 1112,
          loan_amount_outstanding: 0,
          date_of_purchase: toIsoDate(yearsAgo(2, TODAY)),
          in_regular_use: true,
          subject_matter_of_dispute: false,
        },
      ],
    );
  });

  it("returns undefined when the vehicles_details step is not relevant (e.g. asylum supported)", () => {
    assert.equal(
      buildVehiclesSection(
        {
          immigration_or_asylum_type_upper_tribunal: "immigration_upper",
          asylum_support: true,
        },
        new Set(["asylum_support"]),
        true,
        TODAY,
      ),
      undefined,
    );
  });

  it("does not flag a disputed vehicle when SMOD does not apply", () => {
    const answers = {
      vehicle_owned: true,
      vehicles: [
        {
          vehicle_value: 5556,
          vehicle_pcp: true,
          vehicle_finance: 4445,
          vehicle_over_3_years_ago: true,
          vehicle_in_regular_use: false,
          vehicle_in_dispute: true,
        },
      ],
    };

    const vehicles = buildVehiclesSection(
      answers,
      new Set(["vehicles_details"]),
      false,
      TODAY,
    );
    assert.equal(vehicles?.[0]?.subject_matter_of_dispute, false);
  });
});
