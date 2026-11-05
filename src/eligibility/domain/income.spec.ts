import { strict as assert } from "assert";
import { netIncomeIsPositive } from "./income.js";

describe("domain/income", () => {
  it("is positive when deductions leave something", () => {
    assert.equal(netIncomeIsPositive("1000", "200", "100"), true);
  });

  it("is not positive when deductions equal or exceed the gross income", () => {
    assert.equal(netIncomeIsPositive("300", "200", "100"), false);
    assert.equal(netIncomeIsPositive("300", "250", "100"), false);
  });

  it("reads numbers as well as typed strings", () => {
    assert.equal(netIncomeIsPositive(300, 200, 100), false);
  });

  it("leaves unusable gross incomes to their own checks", () => {
    assert.equal(netIncomeIsPositive("", "5", "5"), true);
    assert.equal(netIncomeIsPositive("abc", "5", "5"), true);
    assert.equal(netIncomeIsPositive("0", "5", "5"), true);
  });

  it("counts a missing or non-numeric deduction as nothing", () => {
    assert.equal(netIncomeIsPositive("100", "", "abc"), true);
  });
});
