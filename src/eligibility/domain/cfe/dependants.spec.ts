// Port of CCQ's dependants_payload_service_spec.rb.
import { strict as assert } from "assert";
import { buildDependantsSection } from "./dependants.js";
import { yearsAgo, toIsoDate } from "./dates.js";

const TODAY = new Date(Date.UTC(2022, 9, 17));

describe("domain/cfe/dependants (port of Cfe::DependantsPayloadService)", () => {
  it("builds one adult and four children, with assumed ages that make CFE treat them correctly", () => {
    const dependants = buildDependantsSection(
      {
        adult_dependants: true,
        adult_dependants_count: 1,
        child_dependants: true,
        child_dependants_count: 4,
      },
      new Set(["dependant_details"]),
      TODAY,
    );
    assert.equal(dependants?.length, 5);

    const children = dependants?.filter(
      (item) => item.relationship === "child_relative",
    );
    const adults = dependants?.filter(
      (item) => item.relationship === "adult_relative",
    );
    assert.equal(children?.length, 4);
    assert.equal(adults?.length, 1);

    for (const child of children ?? []) {
      assert.equal(child.date_of_birth, toIsoDate(yearsAgo(11, TODAY)));
      assert.equal(child.in_full_time_education, true);
      assert.equal(child.income, undefined);
      assert.equal(child.assets_value, 0);
    }
    for (const adult of adults ?? []) {
      assert.equal(adult.date_of_birth, toIsoDate(yearsAgo(21, TODAY)));
      assert.equal(adult.in_full_time_education, false);
      assert.equal(adult.income, undefined);
      assert.equal(adult.assets_value, 0);
    }
  });

  it("builds an empty list when there are no dependants", () => {
    assert.deepEqual(
      buildDependantsSection(
        { adult_dependants: false, child_dependants: false },
        new Set(["dependant_details"]),
        TODAY,
      ),
      [],
    );
  });

  it("returns undefined when the client is passported and never saw the form", () => {
    assert.equal(
      buildDependantsSection({ passporting: true }, new Set(), TODAY),
      undefined,
    );
  });

  it("pairs each dependant with its income row, positionally (adults first, then children)", () => {
    const dependants = buildDependantsSection(
      {
        adult_dependants: true,
        adult_dependants_count: 1,
        child_dependants: true,
        child_dependants_count: 2,
        dependant_incomes: [
          { amount: 1, frequency: "every_week" },
          { amount: 2, frequency: "every_two_weeks" },
        ],
      },
      new Set(["dependant_details", "dependant_income_details"]),
      TODAY,
    );
    assert.equal(dependants?.length, 3);

    const [adult, childWithIncome, childWithoutIncome] = dependants ?? [];
    assert.deepEqual(adult?.income, { frequency: "weekly", amount: 1 });
    assert.equal(adult?.date_of_birth, toIsoDate(yearsAgo(21, TODAY)));

    assert.deepEqual(childWithIncome?.income, {
      frequency: "two_weekly",
      amount: 2,
    });
    assert.equal(
      childWithIncome?.date_of_birth,
      toIsoDate(yearsAgo(17, TODAY)),
    );

    assert.equal(childWithoutIncome?.income, undefined);
    assert.equal(
      childWithoutIncome?.date_of_birth,
      toIsoDate(yearsAgo(11, TODAY)),
    );
  });
});
