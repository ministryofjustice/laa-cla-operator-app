import { strict as assert } from "assert";
import {
  FORM_FIELD_ALIASES,
  withFormAliases,
  withoutFormAliases,
} from "./field-aliases.js";

describe("form field aliases", () => {
  it("aliases the shared ownership step's Housing Benefit fields", () => {
    assert.deepEqual(FORM_FIELD_ALIASES, {
      shared_ownership_housing_benefit_relevant: "housing_benefit_relevant",
      shared_ownership_housing_benefit_value: "housing_benefit_value",
      shared_ownership_housing_benefit_frequency: "housing_benefit_frequency",
    });
  });

  it("gives each aliased field the saved answer", () => {
    assert.deepEqual(
      withFormAliases({ housing_benefit_relevant: false, rent: 400 }),
      {
        housing_benefit_relevant: false,
        rent: 400,
        shared_ownership_housing_benefit_relevant: false,
      },
    );
  });

  it("saves an aliased field under its answer key", () => {
    assert.deepEqual(
      withoutFormAliases({
        housing_benefit_relevant: undefined,
        shared_ownership_housing_benefit_relevant: "true",
        shared_ownership_housing_benefit_value: "100",
        rent: "400",
      }),
      {
        housing_benefit_relevant: "true",
        housing_benefit_value: "100",
        rent: "400",
      },
    );
  });

  it("keeps the housing costs step's answers when the aliases were cleared", () => {
    assert.deepEqual(
      withoutFormAliases({
        housing_benefit_relevant: "false",
        shared_ownership_housing_benefit_relevant: undefined,
      }),
      { housing_benefit_relevant: "false" },
    );
  });

  it("clears the answer when its aliased field was cleared", () => {
    assert.deepEqual(
      withoutFormAliases({ shared_ownership_housing_benefit_value: undefined }),
      { housing_benefit_value: undefined },
    );
  });
});
