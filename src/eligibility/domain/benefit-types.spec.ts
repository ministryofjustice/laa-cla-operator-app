import { strict as assert } from "assert";
import type { StateBenefitType } from "../ports/assessor.js";
import { benefitTypeOptions } from "./benefit-types.js";

const benefitType = (
  overrides: Partial<StateBenefitType> & Pick<StateBenefitType, "name">,
): StateBenefitType => ({
  label: overrides.name.toLowerCase().replace(/ /gu, "_"),
  exclude_from_gross_income: false,
  ...overrides,
});

describe("domain/benefit-types (port of BenefitDetailsForm#benefit_list)", () => {
  it("offers each benefit's name as both value and text", () => {
    assert.deepEqual(
      benefitTypeOptions([benefitType({ name: "Carer's Allowance" })]),
      [{ value: "Carer's Allowance", text: "Carer's Allowance" }],
    );
  });

  it("omits benefits CFE excludes from gross income", () => {
    const options = benefitTypeOptions([
      benefitType({ name: "Housing Benefit", exclude_from_gross_income: true }),
      benefitType({ name: "Carer's Allowance" }),
    ]);

    assert.deepEqual(
      options.map((option) => option.value),
      ["Carer's Allowance"],
    );
  });

  it("omits the passporting and pension benefits on CCQ's omit list", () => {
    const omitted = [
      "age_related_payment",
      "universal_credit",
      "income_support",
      "jobseekers_allowance",
      "employment_support_allowance",
      "pension_credit",
      "guaranteed_min_pension",
      "state_pension",
      "state_second_pension",
    ];

    const options = benefitTypeOptions([
      ...omitted.map((label) =>
        benefitType({ name: `Name of ${label}`, label }),
      ),
      benefitType({ name: "Child Benefit" }),
    ]);

    assert.deepEqual(
      options.map((option) => option.value),
      ["Child Benefit"],
    );
  });

  it("lists a name once even when several types share it", () => {
    const options = benefitTypeOptions([
      benefitType({ name: "Child Benefit", label: "child_benefit" }),
      benefitType({ name: "Child Benefit", label: "child_benefit_scotland" }),
    ]);

    assert.deepEqual(options, [
      { value: "Child Benefit", text: "Child Benefit" },
    ]);
  });

  it("returns an empty list for no benefit types", () => {
    assert.deepEqual(benefitTypeOptions([]), []);
  });
});
