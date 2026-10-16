// Parity test: verify buildAssessment produces the same output as the
// fixtures (which were generated from buildAssessment at a fixed date).
// This validates that the CFE payload builders work correctly across
// different client scenarios.
import { strict as assert } from "assert";
import { buildAssessment } from "./payload.js";
import { stepsFor } from "../navigation.js";
import controlledWorkFixture from "./fixtures/controlled-work.json" with { type: "json" };
import certificatedFixture from "./fixtures/certificated.json" with { type: "json" };
import passportedFixture from "./fixtures/passported.json" with { type: "json" };
import partnerWithAssetsFixture from "./fixtures/partner-with-assets.json" with { type: "json" };

const FIXED_TODAY = new Date(Date.UTC(2024, 5, 1));

// CCQ asks for the client's age; this journey derives it from the date of
// birth instead (see client-age.ts), so has no client_age step.
const DERIVED_STEPS = new Set(["client_age"]);

describe("domain/cfe/parity (comparing TS port to fixture expectations)", () => {
  const fixtures = [
    { name: "controlled-work case", fixture: controlledWorkFixture },
    { name: "certificated case", fixture: certificatedFixture },
    { name: "passported case", fixture: passportedFixture },
    { name: "partner with assets case", fixture: partnerWithAssetsFixture },
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
        assert.deepEqual(
          payload,
          fixture.payload,
          `payload mismatch for ${name}`,
        );
      });
    });
  }
});
