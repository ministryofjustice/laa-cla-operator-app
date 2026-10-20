import { strict as assert } from "assert";
import { stepsFor } from "../navigation.js";

// The housing cost step for each main home answer, from CCQ's
// `OutgoingsSection.housing_costs_group`: an outright owner has none.
const HOUSING_STEP: Readonly<Record<string, string | undefined>> = {
  shared_ownership: "shared_ownership_housing_costs",
  with_mortgage: "mortgage_or_loan_payment",
  outright: undefined,
  none: "housing_costs",
  unanswered: "housing_costs",
};

const OUTGOINGS_SECTION_STEPS = new Set([
  "outgoings",
  "partner_outgoings",
  "property",
  "property_landlord",
  "shared_ownership_housing_costs",
  "mortgage_or_loan_payment",
  "housing_costs",
  "property_entry",
]);

describe("outgoings section routing matrix", () => {
  for (const [propertyOwned, housingStep] of Object.entries(HOUSING_STEP)) {
    for (const partner of [false, true]) {
      for (const passporting of [false, true]) {
        it(`${propertyOwned}, ${partner ? "partner" : "no partner"}, ${passporting ? "passported" : "not passported"}`, () => {
          const answers = {
            level_of_help: "controlled",
            client_age: "standard",
            immigration_or_asylum: false,
            partner,
            passporting,
            employment_status: "unemployed",
            ...(propertyOwned === "unanswered"
              ? {}
              : { property_owned: propertyOwned }),
            property_landlord: true,
          };
          const actual = stepsFor(answers).filter((step) =>
            OUTGOINGS_SECTION_STEPS.has(step),
          );
          const ownsMainProperty = !["none", "unanswered"].includes(
            propertyOwned,
          );
          const expected = [
            ...(passporting ? [] : ["outgoings"]),
            ...(passporting || !partner ? [] : ["partner_outgoings"]),
            "property",
            ...(propertyOwned === "shared_ownership"
              ? ["property_landlord"]
              : []),
            ...(passporting || housingStep === undefined ? [] : [housingStep]),
            ...(ownsMainProperty ? ["property_entry"] : []),
          ];

          assert.deepEqual(actual, expected);
        });
      }
    }
  }
});
