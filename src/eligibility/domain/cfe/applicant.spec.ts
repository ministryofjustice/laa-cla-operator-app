// Port of CCQ's applicant_payload_service_spec.rb. Unlike CCQ (which
// synthesises a date of birth from the `client_age` bracket via
// `n.years.ago.to_date`), buildApplicant reads a real `date_of_birth` answer
// and passes it straight through — so these cases supply an explicit date
// rather than relying on bracket synthesis, while keeping the same ages the
// original RSpec cases exercised.
import { strict as assert } from "assert";
import { buildApplicant } from "./applicant.js";
import { yearsAgo, toIsoDate } from "./dates.js";

const TODAY = new Date(Date.UTC(2024, 5, 1));

describe("domain/cfe/applicant (port of Cfe::ApplicantPayloadService)", () => {
  it("includes receives_qualifying_benefit when the applicant step is relevant (client under 60)", () => {
    const dateOfBirth = toIsoDate(yearsAgo(50, TODAY));
    assert.deepEqual(
      buildApplicant(
        { date_of_birth: dateOfBirth, passporting: false },
        new Set(["applicant"]),
      ),
      { date_of_birth: dateOfBirth, receives_qualifying_benefit: false },
    );
  });

  it("passes through the real date of birth regardless of age bracket (client over 60)", () => {
    const dateOfBirth = toIsoDate(yearsAgo(70, TODAY));
    assert.deepEqual(
      buildApplicant(
        { date_of_birth: dateOfBirth, passporting: false },
        new Set(["applicant"]),
      ),
      { date_of_birth: dateOfBirth, receives_qualifying_benefit: false },
    );
  });

  it("omits receives_qualifying_benefit when the applicant step is not relevant (client under 18)", () => {
    const dateOfBirth = toIsoDate(yearsAgo(17, TODAY));
    assert.deepEqual(
      buildApplicant({ date_of_birth: dateOfBirth }, new Set()),
      {
        date_of_birth: dateOfBirth,
      },
    );
  });

  it("includes receives_asylum_support when the asylum_support step is relevant", () => {
    const dateOfBirth = toIsoDate(yearsAgo(50, TODAY));
    assert.deepEqual(
      buildApplicant(
        {
          date_of_birth: dateOfBirth,
          immigration_or_asylum_type_upper_tribunal: "immigration_upper",
          asylum_support: true,
        },
        new Set(["asylum_support"]),
      ),
      { date_of_birth: dateOfBirth, receives_asylum_support: true },
    );
  });

  it("includes both benefit flags when applicant and asylum_support are both relevant", () => {
    const dateOfBirth = toIsoDate(yearsAgo(50, TODAY));
    assert.deepEqual(
      buildApplicant(
        {
          date_of_birth: dateOfBirth,
          immigration_or_asylum_type_upper_tribunal: "immigration_upper",
          asylum_support: false,
          passporting: false,
        },
        new Set(["applicant", "asylum_support"]),
      ),
      {
        date_of_birth: dateOfBirth,
        receives_qualifying_benefit: false,
        receives_asylum_support: false,
      },
    );
  });
});
