import { strict as assert } from "assert";
import {
  annualHousingPayments,
  annualMultiplier,
  annualSharedOwnershipPayments,
  combinedPaymentNeedsFrequency,
  combinedRentAndMortgage,
  housingBenefitWithinCosts,
} from "./housing-benefit.js";

describe("domain/housing-benefit", () => {
  it("annualises each frequency as CCQ does", () => {
    assert.equal(annualMultiplier("every_week"), 52);
    assert.equal(annualMultiplier("every_two_weeks"), 26);
    assert.equal(annualMultiplier("every_four_weeks"), 13);
    assert.equal(annualMultiplier("monthly"), 12);
    assert.equal(annualMultiplier("total"), 4);
  });

  it("counts housing payments only once they have an amount and frequency", () => {
    assert.equal(annualHousingPayments("100", "monthly"), 1200);
    assert.equal(annualHousingPayments(100, "every_week"), 5200);
    assert.equal(annualHousingPayments("", "monthly"), 0);
    assert.equal(annualHousingPayments("100", undefined), 0);
    assert.equal(annualHousingPayments("abc", "monthly"), 0);
  });

  it("combines shared ownership rent and mortgage to the penny", () => {
    assert.equal(combinedRentAndMortgage("0.1", "0.2"), 0.3);
    assert.equal(combinedRentAndMortgage("300", ""), 300);
    assert.equal(annualSharedOwnershipPayments("300", "200", "monthly"), 6000);
    assert.equal(annualSharedOwnershipPayments("300", "200", ""), 0);
  });

  it("asks for a shared ownership frequency whenever there is a payment", () => {
    assert.equal(combinedPaymentNeedsFrequency("0", "0"), false);
    assert.equal(combinedPaymentNeedsFrequency("", ""), false);
    assert.equal(combinedPaymentNeedsFrequency("0.5", "0"), true);
    assert.equal(combinedPaymentNeedsFrequency("300", "0"), true);
  });

  it("allows Housing Benefit up to the annual housing costs", () => {
    assert.equal(housingBenefitWithinCosts("1200", "monthly", 14400), true);
    assert.equal(housingBenefitWithinCosts("277", "every_week", 14404), true);
    assert.equal(housingBenefitWithinCosts("277.01", "every_week", 14404.52), true);
  });

  it("rejects Housing Benefit above the annual housing costs", () => {
    assert.equal(housingBenefitWithinCosts("1200.01", "monthly", 14400), false);
    assert.equal(housingBenefitWithinCosts("300", "every_week", 14400), false);
    assert.equal(housingBenefitWithinCosts("277", "every_week", 14403), false);
  });

  it("has nothing to compare until both sides are known", () => {
    assert.equal(housingBenefitWithinCosts("5000", "monthly", 0), true);
    assert.equal(housingBenefitWithinCosts("5000", "", 1200), true);
    assert.equal(housingBenefitWithinCosts("", "monthly", 1200), true);
    assert.equal(housingBenefitWithinCosts("0", "monthly", 1200), true);
    assert.equal(housingBenefitWithinCosts("abc", "monthly", 1200), true);
  });
});
