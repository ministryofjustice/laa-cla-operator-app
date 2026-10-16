// Port of CCQ's spec/flows/steps/helper_spec.rb, plus additional coverage
// for nextStep/previousStep/cannotUseService that CCQ's thin spec does not
// exercise directly.
import { strict as assert } from "assert";
import {
  cannotUseService,
  firstStep,
  lastStep,
  nextStep,
  previousStep,
  relevantAnswers,
  stepsFor,
} from "./navigation.js";

describe("domain/navigation (port of Steps::Helper)", () => {
  // Ported from helper_spec.rb's two "relevant_step?" cases.
  it("includes asylum support and upper-tribunal steps alongside income steps", () => {
    const answers = {
      immigration_or_asylum_type_upper_tribunal: "immigration_upper",
      asylum_support: true,
      employment_status: "in_work",
    };
    assert.deepEqual(stepsFor(answers), [
      "level_of_help",
      "domestic_abuse_applicant",
      "immigration_or_asylum_type_upper_tribunal",
      "asylum_support",
    ]);
  });

  it("includes property and asset steps for a passported client with no partner", () => {
    const answers = {
      partner: false,
      passporting: true,
      employment_status: "in_work",
    };
    assert.deepEqual(stepsFor(answers), [
      "level_of_help",
      "domestic_abuse_applicant",
      "immigration_or_asylum_type_upper_tribunal",
      "applicant",
      "property",
      "additional_property",
      "assets",
      "vehicle",
    ]);
  });

  describe("nextStep / previousStep", () => {
    const answers = { partner: false, passporting: true };

    it("moves forward through the relevant steps", () => {
      assert.equal(
        nextStep(answers, "level_of_help"),
        "domestic_abuse_applicant",
      );
      assert.equal(
        nextStep(answers, "domestic_abuse_applicant"),
        "immigration_or_asylum_type_upper_tribunal",
      );
    });

    it("moves backward through the relevant steps", () => {
      assert.equal(
        previousStep(answers, "immigration_or_asylum_type_upper_tribunal"),
        "domestic_abuse_applicant",
      );
      assert.equal(
        previousStep(answers, "domestic_abuse_applicant"),
        "level_of_help",
      );
    });

    it("has no next step after the last relevant step", () => {
      const last = lastStep(answers);
      assert.equal(last, "vehicle");
      assert.equal(nextStep(answers, "vehicle"), undefined);
    });

    it("has no previous step before the first relevant step", () => {
      const first = firstStep(answers);
      assert.equal(first, "level_of_help");
      assert.equal(previousStep(answers, "level_of_help"), undefined);
    });

    it("returns nothing either side of a step that is not relevant", () => {
      assert.equal(nextStep(answers, "not_a_real_step"), undefined);
      assert.equal(previousStep(answers, "not_a_real_step"), undefined);
    });
  });

  describe("cannotUseService", () => {
    it("blocks the client when they do not own their main property", () => {
      assert.equal(
        cannotUseService({ property_landlord: false }, "property_landlord"),
        true,
      );
    });

    it("blocks the client when their additional property is shared ownership", () => {
      assert.equal(
        cannotUseService(
          { additional_property_owned: "shared_ownership" },
          "additional_property",
        ),
        true,
      );
    });

    it("blocks the client when their partner's additional property is shared ownership", () => {
      assert.equal(
        cannotUseService(
          { partner_additional_property_owned: "shared_ownership" },
          "partner_additional_property",
        ),
        true,
      );
    });

    it("does not block the client on an unrelated step", () => {
      assert.equal(
        cannotUseService({ property_landlord: false }, "client_age"),
        false,
      );
    });

    it("does not block the client when they own property outright", () => {
      assert.equal(
        cannotUseService({ property_landlord: true }, "property_landlord"),
        false,
      );
    });
  });

  describe("relevantAnswers", () => {
    it("keeps every answer for a passported client with no partner", () => {
      // Regression test: relevantAnswers used to compare answer keys
      // against step codes directly, so it dropped every answer whose key
      // did not happen to match a step code (e.g. the 'applicant' step
      // saves 'partner' and 'passporting', not 'applicant'). For answers
      // like these it returned {} instead of the input unchanged.
      // passporting: true skips the income questions (per the existing
      // stepsFor test above), so this does not include employment_status.
      const answers = {
        partner: false,
        passporting: true,
        property_owned: "outright",
        additional_property_owned: "none",
        vehicle_owned: false,
      };
      assert.deepEqual(relevantAnswers(answers), answers);
    });

    it("keeps the date of birth and age supplied by the earlier journey", () => {
      const answers = {
        date_of_birth: "1990-01-01",
        client_age: "standard",
        partner: false,
        passporting: true,
      };
      assert.deepEqual(relevantAnswers(answers), answers);
    });

    it("drops answers left over from an abandoned branch", () => {
      // The client said they had a partner, answered
      // partner_employment_status, then went back and said they have no
      // partner after all. The partner answer is still in the session (as
      // in CCQ) but is no longer relevant.
      const answers = {
        partner: false,
        passporting: true,
        partner_employment_status: "in_work",
      };
      assert.deepEqual(relevantAnswers(answers), {
        partner: false,
        passporting: true,
      });
    });

    it("keeps dependant answers until passporting makes them irrelevant", () => {
      const notPassported = {
        partner: false,
        passporting: false,
        child_dependants: true,
        child_dependants_count: 2,
      };
      assert.deepEqual(relevantAnswers(notPassported), notPassported);

      const passported = { ...notPassported, passporting: true };
      assert.deepEqual(relevantAnswers(passported), {
        partner: false,
        passporting: true,
      });
    });
  });
});
