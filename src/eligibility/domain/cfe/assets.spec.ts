// Port of CCQ's assets_payload_service_spec.rb. CCQ builds its FactoryBot
// traits (`:with_no_main_home`, `:with_zero_capital_assets`, etc.) from
// fields not shown in the spec itself; these cases are hand-written instead,
// using only the field values the original spec states explicitly, plus
// whatever else is needed to reach the same outcome.
import { strict as assert } from "assert";
import {
  buildCapitals,
  buildCapitalsSection,
  buildProperties,
} from "./assets.js";

describe("domain/cfe/assets (port of Cfe::AssetsPayloadService)", () => {
  describe("capitals", () => {
    it("builds bank accounts and non-liquid assets, flagging disputed ones", () => {
      const answers = {
        bank_accounts: [
          { amount: 100, account_in_dispute: true },
          { amount: 200, account_in_dispute: false },
        ],
        investments: 300,
        investments_in_dispute: true,
        valuables: 400,
        valuables_in_dispute: false,
      };
      assert.deepEqual(
        buildCapitalsSection(answers, new Set(["assets"]), true),
        {
          bank_accounts: [
            {
              value: 100,
              description: "Liquid Asset",
              subject_matter_of_dispute: true,
            },
            {
              value: 200,
              description: "Liquid Asset",
              subject_matter_of_dispute: false,
            },
          ],
          non_liquid_capital: [
            {
              value: 300,
              description: "Non Liquid Asset",
              subject_matter_of_dispute: true,
            },
            {
              value: 400,
              description: "Non Liquid Asset",
              subject_matter_of_dispute: false,
            },
          ],
        },
      );
    });

    it("keeps capital amounts under a pound", () => {
      const answers = {
        bank_accounts: [{ amount: 0.5 }],
        investments: 0.25,
        valuables: 0,
      };
      const capitals = buildCapitalsSection(
        answers,
        new Set(["assets"]),
        false,
      );
      assert.equal(capitals?.bank_accounts[0]?.value, 0.5);
      assert.equal(capitals?.non_liquid_capital[0]?.value, 0.25);
      assert.equal(capitals?.non_liquid_capital.length, 1);
    });

    it("returns undefined when the assets step is not relevant (e.g. asylum supported)", () => {
      assert.equal(
        buildCapitalsSection(
          { investments: 0, valuables: 0 },
          new Set(["asylum_support"]),
          true,
        ),
        undefined,
      );
    });

    it("returns undefined when the client has no capital assets at all", () => {
      assert.equal(
        buildCapitalsSection(
          { investments: 0, valuables: 0, bank_accounts: [] },
          new Set(["assets"]),
          true,
        ),
        undefined,
      );
    });

    it("never flags a dispute when SMOD does not apply, even if the answers say so", () => {
      const capitals = buildCapitals(
        {
          investments: 100,
          investments_in_dispute: true,
          valuables: 0,
          bank_accounts: [{ amount: 50, account_in_dispute: true }],
        },
        false,
      );
      assert.equal(capitals.bank_accounts[0]?.subject_matter_of_dispute, false);
      assert.equal(
        capitals.non_liquid_capital[0]?.subject_matter_of_dispute,
        false,
      );
    });
  });

  describe("properties", () => {
    it("builds the main home and additional properties together", () => {
      const answers = {
        house_value: 100_000,
        property_owned: "with_mortgage",
        mortgage: 40_000,
        percentage_owned: 100,
        additional_property_owned: "outright",
        additional_properties: [{ house_value: 50_000, percentage_owned: 100 }],
      };
      assert.deepEqual(
        buildProperties(
          answers,
          new Set(["property_entry", "additional_property_details"]),
          true,
        ),
        {
          main_home: {
            value: 100_000,
            outstanding_mortgage: 40_000,
            percentage_owned: 100,
            subject_matter_of_dispute: false,
            shared_with_housing_assoc: false,
          },
          additional_properties: [
            {
              value: 50_000,
              outstanding_mortgage: 0,
              percentage_owned: 100,
              subject_matter_of_dispute: false,
              shared_with_housing_assoc: false,
            },
          ],
        },
      );
    });

    it("builds a standalone additional property owned with a mortgage", () => {
      const answers = {
        additional_property_owned: "with_mortgage",
        additional_properties: [
          { house_value: 80_000, mortgage: 30_000, percentage_owned: 100 },
        ],
      };
      const properties = buildProperties(
        answers,
        new Set(["additional_property_details"]),
        true,
      );
      assert.deepEqual(properties?.additional_properties?.[0], {
        value: 80_000,
        outstanding_mortgage: 30_000,
        percentage_owned: 100,
        subject_matter_of_dispute: false,
        shared_with_housing_assoc: false,
      });
    });

    it("builds a standalone additional property owned outright", () => {
      const answers = {
        additional_property_owned: "outright",
        additional_properties: [{ house_value: 80_000, percentage_owned: 100 }],
      };
      const properties = buildProperties(
        answers,
        new Set(["additional_property_details"]),
        true,
      );
      assert.equal(
        properties?.additional_properties?.[0]?.outstanding_mortgage,
        0,
      );
    });

    it("returns undefined when neither the main home nor additional properties are relevant", () => {
      assert.equal(buildProperties({}, new Set([]), true), undefined);
    });

    it("fills in an all-zero main home when only an additional property is relevant", () => {
      const answers = {
        additional_property_owned: "outright",
        additional_properties: [{ house_value: 80_000, percentage_owned: 100 }],
      };
      const properties = buildProperties(
        answers,
        new Set(["additional_property_details"]),
        true,
      );
      assert.deepEqual(properties?.main_home, {
        value: 0,
        outstanding_mortgage: 0,
        percentage_owned: 0,
        subject_matter_of_dispute: false,
        shared_with_housing_assoc: false,
      });
    });

    it("flags a disputed additional property even with no main home", () => {
      const answers = {
        additional_property_owned: "outright",
        additional_properties: [
          {
            house_value: 80_000,
            percentage_owned: 100,
            house_in_dispute: true,
          },
        ],
      };
      const properties = buildProperties(
        answers,
        new Set(["additional_property_details"]),
        true,
      );
      assert.equal(
        properties?.additional_properties?.[0]?.subject_matter_of_dispute,
        true,
      );
    });

    it("builds a main home owned outright, with no outstanding mortgage", () => {
      const answers = {
        house_value: 200_000,
        property_owned: "outright",
        percentage_owned: 100,
      };
      const properties = buildProperties(
        answers,
        new Set(["property_entry"]),
        true,
      );
      assert.deepEqual(properties?.main_home, {
        value: 200_000,
        outstanding_mortgage: 0,
        percentage_owned: 100,
        subject_matter_of_dispute: false,
        shared_with_housing_assoc: false,
      });
    });

    it("builds a shared-ownership main home, including its outstanding mortgage", () => {
      const answers = {
        house_value: 200_234,
        property_owned: "shared_ownership",
        shared_with_housing_assoc: true,
        mortgage: 123_234,
        percentage_owned: 50,
      };
      const properties = buildProperties(
        answers,
        new Set(["property_entry"]),
        true,
      );
      assert.deepEqual(properties?.main_home, {
        value: 200_234,
        outstanding_mortgage: 123_234,
        percentage_owned: 50,
        subject_matter_of_dispute: false,
        shared_with_housing_assoc: true,
      });
    });

    it("flags an outright, disputed main home", () => {
      const answers = {
        house_value: 200_000,
        property_owned: "outright",
        percentage_owned: 100,
        house_in_dispute: true,
      };
      const properties = buildProperties(
        answers,
        new Set(["property_entry"]),
        true,
      );
      assert.equal(properties?.main_home.subject_matter_of_dispute, true);
    });

    it("never flags a dispute when SMOD does not apply, even if the answers say so", () => {
      const answers = {
        house_value: 200_000,
        property_owned: "outright",
        percentage_owned: 100,
        house_in_dispute: true,
      };
      const properties = buildProperties(
        answers,
        new Set(["property_entry"]),
        false,
      );
      assert.equal(properties?.main_home.subject_matter_of_dispute, false);
    });

    it("builds an empty additional_properties list when the step is relevant but no rows were added", () => {
      const answers = {
        house_value: 200_000,
        property_owned: "outright",
        percentage_owned: 100,
      };
      const properties = buildProperties(
        answers,
        new Set(["property_entry", "additional_property_details"]),
        true,
      );
      assert.deepEqual(properties?.additional_properties, []);
    });
  });
});
