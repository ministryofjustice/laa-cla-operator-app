import { strict as assert } from "assert";
import {
  DEPENDANT_INCOME_UPPER_LIMITS,
  DEPENDANT_MONTHLY_INCOME_LIMIT,
  dependantIncomeBelowLimit,
} from "./dependant-income-limits.js";

describe("domain/dependant-income-limits", () => {
  it("ports CCQ's rounded frequency-specific limits", () => {
    assert.deepEqual(DEPENDANT_INCOME_UPPER_LIMITS, {
      every_week: 88.12,
      every_two_weeks: 176.24,
      every_four_weeks: 352.49,
      monthly: 381.86,
      three_months: 1145.58,
    });
  });

  it("rejects amounts at the frequency limit and accepts amounts below it", () => {
    assert.equal(DEPENDANT_MONTHLY_INCOME_LIMIT, 381.86);
    assert.equal(dependantIncomeBelowLimit(381.85, "monthly"), true);
    assert.equal(dependantIncomeBelowLimit(381.86, "monthly"), false);
    assert.equal(dependantIncomeBelowLimit(88.12, "every_week"), false);
  });

  it("rejects unknown frequencies and non-numeric values", () => {
    assert.equal(dependantIncomeBelowLimit("10", "monthly"), true);
    assert.equal(dependantIncomeBelowLimit("not a number", "monthly"), false);
    assert.equal(dependantIncomeBelowLimit(10, "year"), false);
  });
});
