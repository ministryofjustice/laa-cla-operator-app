// Port of CCQ's `Cfe::AssessmentPayloadService`.
import type { Answers } from "../logic.js";
import { notAggregatedNoIncomeLowCapital } from "../logic.js";
import { toIsoDate } from "./dates.js";
import { assumeType } from "./types.js";
import type { AssessmentPayload } from "./types.js";

/**
 * Builds the `assessment` section of a CFE payload.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {AssessmentPayload} the assessment section
 */
export function buildAssessmentSection(
  answers: Answers,
  relevantSteps: Set<string>,
  today: Date,
): AssessmentPayload {
  const assessment: AssessmentPayload = {
    submission_date: toIsoDate(today),
    level_of_help: assumeType<string>(answers.level_of_help),
  };

  if (relevantSteps.has("under_18_clr")) {
    assessment.controlled_legal_representation = assumeType<boolean>(
      answers.controlled_legal_representation,
    );
  }

  if (relevantSteps.has("aggregated_means")) {
    assessment.not_aggregated_no_income_low_capital =
      notAggregatedNoIncomeLowCapital(answers);
  }

  return assessment;
}
