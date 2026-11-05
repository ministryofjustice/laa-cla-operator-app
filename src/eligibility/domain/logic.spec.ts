// Port of CCQ's spec/models/steps/logic_spec.rb, plus cases for the
// tri-state behaviour CCQ's thin spec does not exercise directly. Case
// names and session data are taken from CCQ where it has an equivalent.
import { strict as assert } from "assert";
import {
  aggregatedMeans,
  benefits,
  dependants,
  dependantsGetIncome,
  employed,
  partnerBenefits,
  partnerEmployed,
  partnerOwnsAdditionalProperty,
  underEighteenAssets,
  underEighteenNoMeansTestRequired,
  underEighteenRegularIncome,
} from "./logic.js";

describe("domain/logic (port of Steps::Logic)", () => {
  // Ported from logic_spec.rb's five describe blocks.
  it("employed? returns false if the client is asylum supported", () => {
    assert.equal(
      employed({
        employment_status: "in_work",
        asylum_support: true,
        immigration_or_asylum_type_upper_tribunal: "immigration_upper",
      }),
      false,
    );
  });

  it("benefits? returns false if the client is passported", () => {
    assert.equal(
      benefits({ passporting: true, receives_benefits: true }),
      false,
    );
  });

  it("partner_owns_additional_property? returns false if the client has no partner", () => {
    assert.equal(partnerOwnsAdditionalProperty({ partner: false }), false);
  });

  it("partner_employed? returns false if the client has no partner", () => {
    assert.equal(
      partnerEmployed({ partner: false, partner_employment_status: "in_work" }),
      false,
    );
  });

  it("partner_benefits? returns false if the client is passported", () => {
    assert.equal(
      partnerBenefits({ passporting: true, partner_receives_benefits: true }),
      false,
    );
  });

  it("dependants? returns false if the client is passported", () => {
    assert.equal(
      dependants({ passporting: true, partner_receives_benefits: true }),
      false,
    );
  });

  it("dependants_get_income? returns false if the client is passported", () => {
    assert.equal(
      dependantsGetIncome({
        passporting: true,
        partner_receives_benefits: true,
      }),
      false,
    );
  });

  // Not in CCQ's spec file, but central to this port: the tri-state
  // behaviour that makes under_eighteen_no_means_test_required? wait for an
  // answer rather than treating "not yet answered" as "no".
  describe("under-18 tri-state means questions", () => {
    it("is undefined (not yet answered) before the client has said", () => {
      const answers = { client_age: "under_18" };
      assert.equal(aggregatedMeans(answers), undefined);
      assert.equal(underEighteenRegularIncome(answers), undefined);
      assert.equal(underEighteenAssets(answers), undefined);
    });

    it("does not require a means test once all three are confirmed no", () => {
      assert.equal(
        underEighteenNoMeansTestRequired({
          client_age: "under_18",
          level_of_help: "controlled",
          aggregated_means: false,
          regular_income: false,
          under_eighteen_assets: false,
        }),
        true,
      );
    });

    it("still requires a means test while any of the three is unanswered", () => {
      assert.equal(
        underEighteenNoMeansTestRequired({
          client_age: "under_18",
          level_of_help: "controlled",
          aggregated_means: false,
          regular_income: false,
          // under_eighteen_assets not yet answered
        }),
        false,
      );
    });

    it("requires a means test once aggregated means is confirmed yes", () => {
      assert.equal(
        underEighteenNoMeansTestRequired({
          client_age: "under_18",
          level_of_help: "controlled",
          aggregated_means: true,
        }),
        false,
      );
    });

    it("needs no means test for certificated under-18 clients regardless", () => {
      assert.equal(
        underEighteenNoMeansTestRequired({
          client_age: "under_18",
          level_of_help: "certificated",
        }),
        true,
      );
    });

    it("needs no means test when the client has controlled legal representation", () => {
      assert.equal(
        underEighteenNoMeansTestRequired({
          client_age: "under_18",
          level_of_help: "controlled",
          controlled_legal_representation: true,
        }),
        true,
      );
    });
  });
});
