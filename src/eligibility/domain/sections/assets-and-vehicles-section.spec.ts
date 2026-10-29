import { strict as assert } from "assert";
import type { Answers } from "../logic.js";
import { stepsFor } from "../navigation.js";
import { ALL_STEPS } from "./assets-and-vehicles-section.js";

const SECTION_STEPS = new Set(ALL_STEPS);

const sectionSteps = (answers: Answers): string[] =>
  stepsFor(answers).filter((step) => SECTION_STEPS.has(step));

const base = (overrides: Answers = {}): Answers => ({
  level_of_help: "certificated",
  client_age: "standard",
  domestic_abuse_applicant: false,
  immigration_or_asylum_type_upper_tribunal: "no_upper_tribunal",
  partner: false,
  passporting: false,
  employment_status: "unemployed",
  receives_benefits: false,
  property_owned: "none",
  additional_property_owned: "none",
  ...overrides,
});

describe("assets and vehicles section routing", () => {
  for (const level of ["certificated", "controlled"] as const) {
    for (const partner of [false, true]) {
      for (const passporting of [false, true]) {
        for (const vehicleOwned of [undefined, false, true]) {
          it(`${level}, ${partner ? "partner" : "no partner"}, ${passporting ? "passported" : "not passported"}, vehicle ${String(vehicleOwned)}`, () => {
            const answers = base({
              level_of_help: level,
              immigration_or_asylum: false,
              partner,
              passporting,
              ...(vehicleOwned === undefined
                ? {}
                : { vehicle_owned: vehicleOwned }),
            });
            const expected = [
              "assets",
              ...(partner ? ["partner_assets"] : []),
              ...(level === "controlled"
                ? []
                : [
                    "vehicle",
                    ...(vehicleOwned === true ? ["vehicles_details"] : []),
                  ]),
            ];

            assert.deepEqual(sectionSteps(answers), expected);
          });
        }
      }
    }
  }

  it("orders assets, partner assets, then vehicles, after the property steps", () => {
    const steps = stepsFor(base({ partner: true, vehicle_owned: true }));
    const at = (step: string): number => steps.indexOf(step);

    assert.ok(at("additional_property") < at("assets"));
    assert.ok(at("assets") < at("partner_assets"));
    assert.ok(at("partner_assets") < at("vehicle"));
    assert.ok(at("vehicle") < at("vehicles_details"));
  });

  it("skips the whole section for an asylum-supported client", () => {
    for (const level of ["certificated", "controlled"]) {
      const answers =
        level === "controlled"
          ? base({
              level_of_help: level,
              immigration_or_asylum: true,
              asylum_support: true,
              vehicle_owned: true,
            })
          : base({
              level_of_help: level,
              immigration_or_asylum_type_upper_tribunal: "asylum_upper",
              asylum_support: true,
              vehicle_owned: true,
            });
      assert.deepEqual(sectionSteps(answers), [], level);
    }
  });

  it("skips the whole section for an under-18 client needing no means test", () => {
    assert.deepEqual(
      sectionSteps(base({ client_age: "under_18", vehicle_owned: true })),
      [],
    );
  });

  it("drops vehicle details when the vehicle answer changes to no", () => {
    const owned = base({
      vehicle_owned: true,
      vehicles: [{ vehicle_value: 1 }],
    });
    assert.deepEqual(sectionSteps(owned), [
      "assets",
      "vehicle",
      "vehicles_details",
    ]);
    assert.deepEqual(sectionSteps({ ...owned, vehicle_owned: false }), [
      "assets",
      "vehicle",
    ]);
  });
});
