// Parity test: verify buildAssessment and stepsFor match the fixtures.
// Every fixture is raw output from CCQ's payload services
// (generate-ccq-fixtures.rb at CCQ 1a30ea3f, time frozen at 2024-06-01), and
// is compared after normaliseCcqPayload. The generator rejects any session
// whose relevant CCQ forms are invalid.
import { strict as assert } from "assert";
import { buildAssessment } from "./payload.js";
import { stepsFor } from "../navigation.js";
import controlledWorkFixture from "./fixtures/controlled-work.json" with { type: "json" };
import certificatedFixture from "./fixtures/certificated.json" with { type: "json" };
import passportedFixture from "./fixtures/passported.json" with { type: "json" };
import partnerWithAssetsFixture from "./fixtures/partner-with-assets.json" with { type: "json" };
import outgoingsSharedOwnershipFixture from "./fixtures/outgoings-shared-ownership.json" with { type: "json" };
import outgoingsMortgageChildcareFixture from "./fixtures/outgoings-mortgage-childcare.json" with { type: "json" };
import dependantsNoneFixture from "./fixtures/dependants-none.json" with { type: "json" };
import dependantsWithIncomeFixture from "./fixtures/dependants-with-income.json" with { type: "json" };
import assetsVehiclesDisputedFixture from "./fixtures/assets-vehicles-disputed.json" with { type: "json" };
import assetsVehiclesPartnerFixture from "./fixtures/assets-vehicles-partner.json" with { type: "json" };
import assetsNoCapitalNoVehicleFixture from "./fixtures/assets-no-capital-no-vehicle.json" with { type: "json" };

const FIXED_TODAY = new Date(Date.UTC(2024, 5, 1));

// CCQ asks for the client's age; this journey derives it from the date of
// birth instead (see client-age.ts), so has no client_age step.
const DERIVED_STEPS = new Set(["client_age"]);

const DECIMAL_STRING = /^-?\d+(\.\d+)?$/;

/**
 * Converts Ruby's BigDecimal JSON strings ("30.0") back to numbers.
 * @param {unknown} value - a CCQ payload (or part of one)
 * @returns {unknown} the same value with decimal strings as numbers
 */
function decimalsAsNumbers(value: unknown): unknown {
  if (typeof value === "string" && DECIMAL_STRING.test(value)) {
    return Number(value);
  }
  if (Array.isArray(value)) return value.map(decimalsAsNumbers);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        decimalsAsNumbers(item),
      ]),
    );
  }
  return value;
}

/**
 * Removes the representational differences between CCQ's payload and the TS
 * port: Ruby serialises BigDecimal amounts as strings, and CCQ fakes the
 * applicant's and partner's dates of birth from the client_age and
 * partner_over_60 brackets where this journey asks for the real ones.
 * @param {Record<string, unknown>} payload - a CCQ-generated payload
 * @param {Record<string, unknown>} input - the fixture's session answers
 * @returns {unknown} the normalised payload
 */
function normaliseCcqPayload(
  payload: Record<string, unknown>,
  input: Record<string, unknown>,
): unknown {
  const normalised = decimalsAsNumbers(payload) as Record<string, unknown>;
  const withApplicant = {
    ...normalised,
    applicant: {
      ...(normalised.applicant as Record<string, unknown>),
      date_of_birth: input.date_of_birth,
    },
  };
  const partner = normalised.partner as Record<string, unknown> | undefined;
  if (partner === undefined) return withApplicant;
  return {
    ...withApplicant,
    partner: {
      ...partner,
      partner: {
        ...(partner.partner as Record<string, unknown>),
        date_of_birth: input.partner_date_of_birth,
      },
    },
  };
}

describe("domain/cfe/parity (comparing TS port to fixture expectations)", () => {
  const fixtures = [
    { name: "controlled-work case", fixture: controlledWorkFixture },
    { name: "certificated case", fixture: certificatedFixture },
    { name: "passported case", fixture: passportedFixture },
    { name: "partner with assets case", fixture: partnerWithAssetsFixture },
    {
      name: "disputed assets and two vehicles case",
      fixture: assetsVehiclesDisputedFixture,
    },
    {
      name: "partner assets and financed vehicle case",
      fixture: assetsVehiclesPartnerFixture,
    },
    {
      name: "asylum case with no capital or vehicle",
      fixture: assetsNoCapitalNoVehicleFixture,
    },
    {
      name: "outgoings and shared ownership case",
      fixture: outgoingsSharedOwnershipFixture,
    },
    {
      name: "mortgage and childcare case",
      fixture: outgoingsMortgageChildcareFixture,
    },
    {
      name: "no dependants case",
      fixture: dependantsNoneFixture,
    },
    {
      name: "adult and child dependants with income case",
      fixture: dependantsWithIncomeFixture,
    },
  ];

  for (const { name, fixture } of fixtures) {
    describe(name, () => {
      it("computes the same relevant steps as the fixture", () => {
        const computed = Array.from(stepsFor(fixture.input));
        assert.deepEqual(
          computed.sort(),
          fixture.relevant_steps
            .filter((step) => !DERIVED_STEPS.has(step))
            .sort(),
          `step mismatch for ${name}`,
        );
      });

      it("produces the same CFE payload as the fixture", () => {
        const payload = buildAssessment(fixture.input, FIXED_TODAY);
        const expected = normaliseCcqPayload(fixture.payload, fixture.input);
        assert.deepEqual(payload, expected, `payload mismatch for ${name}`);
      });
    });
  }
});
