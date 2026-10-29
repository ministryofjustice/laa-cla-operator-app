// Port of CCQ's `Cfe::ApplicantPayloadService`. `date_of_birth` is read
// directly from a real `date_of_birth` answer rather than synthesised from
// an age bracket — see the "Dates" note in the CFE payload builders plan.
import type { Answers } from "../logic.js";
import { assumeType } from "./types.js";
import type { ApplicantPayload } from "./types.js";

/**
 * Builds the `applicant` section of a CFE payload.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {ApplicantPayload} the applicant section
 */
export function buildApplicant(
  answers: Answers,
  relevantSteps: Set<string>,
): ApplicantPayload {
  const applicant: ApplicantPayload = {
    date_of_birth: assumeType<string>(answers.date_of_birth),
  };

  if (relevantSteps.has("applicant")) {
    applicant.receives_qualifying_benefit = assumeType<boolean>(
      answers.passporting,
    );
  }

  if (relevantSteps.has("asylum_support")) {
    applicant.receives_asylum_support = assumeType<boolean>(
      answers.asylum_support,
    );
  }

  return applicant;
}
