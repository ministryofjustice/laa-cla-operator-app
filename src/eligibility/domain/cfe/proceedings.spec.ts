// Port of CCQ's proceedings_payload_service_spec.rb.
import { strict as assert } from "assert";
import { buildProceedingTypes } from "./proceedings.js";

describe("domain/cfe/proceedings (port of Cfe::ProceedingsPayloadService)", () => {
  it("uses SE003 for a certificated, non-A&I, non-domestic-abuse case", () => {
    assert.deepEqual(
      buildProceedingTypes(
        {
          level_of_help: "certificated",
          domestic_abuse_applicant: false,
          immigration_or_asylum_type_upper_tribunal: "none",
        },
        new Set(["level_of_help", "domestic_abuse_applicant"]),
      ),
      [{ ccms_code: "SE003", client_involvement_type: "A" }],
    );
  });

  it("uses IA031 for a certificated asylum case", () => {
    assert.deepEqual(
      buildProceedingTypes(
        {
          level_of_help: "certificated",
          domestic_abuse_applicant: false,
          immigration_or_asylum_type_upper_tribunal: "asylum_upper",
        },
        new Set([
          "level_of_help",
          "domestic_abuse_applicant",
          "immigration_or_asylum",
        ]),
      ),
      [{ ccms_code: "IA031", client_involvement_type: "A" }],
    );
  });

  it("uses IM030 for a certificated immigration case", () => {
    assert.deepEqual(
      buildProceedingTypes(
        {
          level_of_help: "certificated",
          domestic_abuse_applicant: false,
          immigration_or_asylum_type_upper_tribunal: "immigration_upper",
        },
        new Set([
          "level_of_help",
          "domestic_abuse_applicant",
          "immigration_or_asylum",
        ]),
      ),
      [{ ccms_code: "IM030", client_involvement_type: "A" }],
    );
  });

  it("uses DA001 for a certificated domestic abuse case", () => {
    assert.deepEqual(
      buildProceedingTypes(
        { level_of_help: "certificated", domestic_abuse_applicant: true },
        new Set(["level_of_help", "domestic_abuse_applicant"]),
      ),
      [{ ccms_code: "DA001", client_involvement_type: "A" }],
    );
  });

  it("uses SE003 for a controlled, non-immigration/asylum case", () => {
    assert.deepEqual(
      buildProceedingTypes(
        { level_of_help: "controlled", immigration_or_asylum: false },
        new Set(["level_of_help", "immigration_or_asylum"]),
      ),
      [{ ccms_code: "SE003", client_involvement_type: "A" }],
    );
  });

  it("uses IM030 for a controlled immigration CLR case", () => {
    assert.deepEqual(
      buildProceedingTypes(
        {
          level_of_help: "controlled",
          immigration_or_asylum: true,
          immigration_or_asylum_type: "immigration_clr",
        },
        new Set(["level_of_help", "immigration_or_asylum"]),
      ),
      [{ ccms_code: "IM030", client_involvement_type: "A" }],
    );
  });

  it("uses IA031 for a controlled immigration legal-help case", () => {
    assert.deepEqual(
      buildProceedingTypes(
        {
          level_of_help: "controlled",
          immigration_or_asylum: true,
          immigration_or_asylum_type: "immigration_legal_help",
        },
        new Set(["level_of_help", "immigration_or_asylum"]),
      ),
      [{ ccms_code: "IA031", client_involvement_type: "A" }],
    );
  });

  it("uses IA031 for a controlled asylum case", () => {
    assert.deepEqual(
      buildProceedingTypes(
        {
          level_of_help: "controlled",
          immigration_or_asylum: true,
          immigration_or_asylum_type: "asylum",
        },
        new Set(["level_of_help", "immigration_or_asylum"]),
      ),
      [{ ccms_code: "IA031", client_involvement_type: "A" }],
    );
  });

  it("returns undefined when this check never asks an immigration/asylum or domestic-abuse question", () => {
    assert.equal(
      buildProceedingTypes({}, new Set(["level_of_help"])),
      undefined,
    );
  });
});
