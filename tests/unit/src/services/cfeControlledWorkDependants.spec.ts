import { expect } from "chai";
import { buildControlledWorkDependants } from "#src/services/cfeControlledWorkDependants.js";
import type { ControlledWorkAnswers } from "#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js";

const ADULT_CONTEXT = { isUnder18: false };
const REFERENCE_DATE = new Date("2026-11-13T00:00:00.000Z");
const BASE_ANSWERS: ControlledWorkAnswers = {
  "immigration-or-asylum": "no",
  partner: "no",
  passporting: "no",
};

function answersWithDependants(
  overrides: ControlledWorkAnswers,
): ControlledWorkAnswers {
  return { ...BASE_ANSWERS, ...overrides };
}

describe("controlled-work CFE dependant mapping", () => {
  it("maps each child dependant to the CCQ child record shape", () => {
    expect(
      buildControlledWorkDependants(
        answersWithDependants({
          "child-dependants": "yes",
          "child-dependants-count": "2",
          "adult-dependants": "no",
        }),
        ADULT_CONTEXT,
        REFERENCE_DATE,
      ),
    ).to.deep.equal([
      {
        date_of_birth: "2015-11-13",
        in_full_time_education: true,
        relationship: "child_relative",
        assets_value: 0,
      },
      {
        date_of_birth: "2015-11-13",
        in_full_time_education: true,
        relationship: "child_relative",
        assets_value: 0,
      },
    ]);
  });

  it("maps child and adult records in page order", () => {
    expect(
      buildControlledWorkDependants(
        answersWithDependants({
          "child-dependants": "yes",
          "child-dependants-count": 1,
          "adult-dependants": "yes",
          "adult-dependants-count": "2",
        }),
        ADULT_CONTEXT,
        REFERENCE_DATE,
      ),
    ).to.deep.equal([
      {
        date_of_birth: "2015-11-13",
        in_full_time_education: true,
        relationship: "child_relative",
        assets_value: 0,
      },
      {
        date_of_birth: "2005-11-13",
        in_full_time_education: false,
        relationship: "adult_relative",
        assets_value: 0,
      },
      {
        date_of_birth: "2005-11-13",
        in_full_time_education: false,
        relationship: "adult_relative",
        assets_value: 0,
      },
    ]);
  });

  it("returns an empty array when the applicable page records no dependants", () => {
    expect(
      buildControlledWorkDependants(
        answersWithDependants({
          "child-dependants": "no",
          "adult-dependants": "no",
        }),
        ADULT_CONTEXT,
        REFERENCE_DATE,
      ),
    ).to.deep.equal([]);
  });

  it("omits dependants when the page is not applicable", () => {
    expect(
      buildControlledWorkDependants(
        answersWithDependants({
          "child-dependants": "yes",
          "child-dependants-count": 1,
          "adult-dependants": "no",
          passporting: "yes",
        }),
        ADULT_CONTEXT,
        REFERENCE_DATE,
      ),
    ).to.equal(undefined);
  });

  it("ignores a count made irrelevant by changing its answer to No", () => {
    expect(
      buildControlledWorkDependants(
        answersWithDependants({
          "child-dependants": "no",
          "child-dependants-count": 3,
          "adult-dependants": "no",
        }),
        ADULT_CONTEXT,
        REFERENCE_DATE,
      ),
    ).to.deep.equal([]);
  });

  it("does not map an unanswered count as zero", () => {
    expect(() =>
      buildControlledWorkDependants(
        answersWithDependants({
          "child-dependants": "yes",
          "adult-dependants": "no",
        }),
        ADULT_CONTEXT,
        REFERENCE_DATE,
      ),
    ).to.throw("Cannot map child dependants without a count");
  });

  it("clamps leap-day dates when applying the CCQ synthetic ages", () => {
    expect(
      buildControlledWorkDependants(
        answersWithDependants({
          "child-dependants": "yes",
          "child-dependants-count": 1,
          "adult-dependants": "yes",
          "adult-dependants-count": 1,
        }),
        ADULT_CONTEXT,
        new Date("2024-02-29T00:00:00.000Z"),
      ),
    ).to.deep.equal([
      {
        date_of_birth: "2013-02-28",
        in_full_time_education: true,
        relationship: "child_relative",
        assets_value: 0,
      },
      {
        date_of_birth: "2003-02-28",
        in_full_time_education: false,
        relationship: "adult_relative",
        assets_value: 0,
      },
    ]);
  });
});
