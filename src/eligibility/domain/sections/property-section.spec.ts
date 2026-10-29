import { strict as assert } from "assert";
import { stepsFor } from "../navigation.js";

const OWNERSHIP_OPTIONS = [
  "none",
  "with_mortgage",
  "shared_ownership",
  "outright",
] as const;

const PROPERTY_STEPS = new Set([
  "property",
  "property_landlord",
  "property_entry",
  "additional_property",
  "additional_property_details",
  "partner_additional_property",
  "partner_additional_property_details",
]);

describe("property section routing matrix", () => {
  for (const propertyOwned of OWNERSHIP_OPTIONS) {
    for (const additionalPropertyOwned of OWNERSHIP_OPTIONS) {
      for (const partner of [false, true]) {
        for (const passporting of [false, true]) {
          it(`${propertyOwned}, additional ${additionalPropertyOwned}, ${partner ? "partner" : "no partner"}, ${passporting ? "passported" : "not passported"}`, () => {
            const answers = {
              level_of_help: "controlled",
              client_age: "standard",
              immigration_or_asylum: false,
              partner,
              passporting,
              employment_status: "unemployed",
              property_owned: propertyOwned,
              property_landlord: true,
              additional_property_owned: additionalPropertyOwned,
              ...(partner
                ? { partner_additional_property_owned: additionalPropertyOwned }
                : {}),
            };
            const actual = stepsFor(answers).filter((step) =>
              PROPERTY_STEPS.has(step),
            );
            const ownsMainProperty = propertyOwned !== "none";
            const ownsAdditionalProperty = additionalPropertyOwned !== "none";
            const expected = [
              "property",
              ...(propertyOwned === "shared_ownership"
                ? ["property_landlord"]
                : []),
              ...(ownsMainProperty ? ["property_entry"] : []),
              "additional_property",
              ...(ownsAdditionalProperty
                ? ["additional_property_details"]
                : []),
              ...(partner
                ? [
                    "partner_additional_property",
                    ...(ownsAdditionalProperty
                      ? ["partner_additional_property_details"]
                      : []),
                  ]
                : []),
            ];

            assert.deepEqual(actual, expected);
          });
        }
      }
    }
  }
});
