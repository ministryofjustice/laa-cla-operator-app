import { strict as assert } from "assert";
import {
  benefitFrequencyOptions,
  dependantIncomeFrequencyOptions,
  frequencyOptionsFor,
  incomeFrequencyOptions,
  otherIncomeFrequencyOptions,
  outgoingsFrequencyOptions,
} from "./frequency-options.js";

const values = (options: { value: string }[]): string[] =>
  options.map((option) => option.value);

describe("domain/frequency-options", () => {
  it("income frequencies include the yearly total only for certificated work", () => {
    assert.deepEqual(values(incomeFrequencyOptions(false)), [
      "every_week",
      "every_two_weeks",
      "every_four_weeks",
      "monthly",
      "three_months",
      "year",
    ]);
    assert.deepEqual(values(incomeFrequencyOptions(true)), [
      "every_week",
      "every_two_weeks",
      "every_four_weeks",
      "monthly",
      "three_months",
    ]);
  });

  it("other income frequencies include the 3-month total only for certificated work", () => {
    assert.deepEqual(values(otherIncomeFrequencyOptions(false)), [
      "every_week",
      "every_two_weeks",
      "every_four_weeks",
      "monthly",
      "total",
    ]);
    assert.deepEqual(values(otherIncomeFrequencyOptions(true)), [
      "every_week",
      "every_two_weeks",
      "every_four_weeks",
      "monthly",
    ]);
  });

  it("outgoings frequencies include the 3-month total only for certificated work", () => {
    assert.deepEqual(values(outgoingsFrequencyOptions(false)), [
      "every_week",
      "every_two_weeks",
      "every_four_weeks",
      "monthly",
      "total",
    ]);
    assert.deepEqual(values(outgoingsFrequencyOptions(true)), [
      "every_week",
      "every_two_weeks",
      "every_four_weeks",
      "monthly",
    ]);
    assert.equal(
      "text" in (outgoingsFrequencyOptions(false).at(-1) ?? {}),
      false,
    );
  });

  it("benefit frequencies are the four regular ones", () => {
    assert.deepEqual(values(benefitFrequencyOptions()), [
      "every_week",
      "every_two_weeks",
      "every_four_weeks",
      "monthly",
    ]);
  });

  it("dependant income frequencies include three months but not year", () => {
    assert.deepEqual(values(dependantIncomeFrequencyOptions()), [
      "every_week",
      "every_two_weeks",
      "every_four_weeks",
      "monthly",
      "three_months",
    ]);
  });

  it("builds the sets from the saved level of help", () => {
    assert.equal(
      values(
        frequencyOptionsFor({ level_of_help: "controlled" }).income,
      ).includes("year"),
      false,
    );
    assert.equal(
      values(
        frequencyOptionsFor({ level_of_help: "certificated" }).otherIncome,
      ).includes("total"),
      true,
    );
    assert.equal(
      values(
        frequencyOptionsFor({ level_of_help: "controlled" }).outgoings,
      ).includes("total"),
      false,
    );
    assert.equal(
      values(
        frequencyOptionsFor({ level_of_help: "certificated" }).outgoings,
      ).includes("total"),
      true,
    );
  });
});
