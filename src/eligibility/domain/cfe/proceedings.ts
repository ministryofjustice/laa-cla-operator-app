// Port of CCQ's `Cfe::ProceedingsPayloadService`.
import type { Answers } from "../logic.js";
import type { ProceedingTypePayload } from "./types.js";

const CLIENT_INVOLVEMENT_TYPE = "A";

const PROCEEDING_TYPES = {
  immigration: "IM030",
  asylum: "IA031",
  other: "SE003",
  domestic_abuse: "DA001",
} as const;

/**
 * The proceeding type for a certificated-journey client, who answers a
 * domestic-abuse question before (if not a domestic-abuse case) an
 * upper-tribunal immigration/asylum question.
 * @param {Answers} answers - the saved answers
 * @returns {string} the CCMS proceeding type code
 */
function ccmsCodeFromCertificatedJourney(answers: Answers): string {
  if (answers.domestic_abuse_applicant === true) {
    return PROCEEDING_TYPES.domestic_abuse;
  }
  if (answers.immigration_or_asylum_type_upper_tribunal === "immigration_upper") {
    return PROCEEDING_TYPES.immigration;
  }
  if (answers.immigration_or_asylum_type_upper_tribunal === "asylum_upper") {
    return PROCEEDING_TYPES.asylum;
  }
  return PROCEEDING_TYPES.other;
}

/**
 * The proceeding type for a controlled-work client, who answers a simple
 * immigration-or-asylum question before (if yes) a type question.
 * @param {Answers} answers - the saved answers
 * @returns {string} the CCMS proceeding type code
 */
function ccmsCodeFromImmigrationAndAsylumChoices(answers: Answers): string {
  if (answers.immigration_or_asylum !== true) return PROCEEDING_TYPES.other;
  return answers.immigration_or_asylum_type === "immigration_clr"
    ? PROCEEDING_TYPES.immigration
    : PROCEEDING_TYPES.asylum;
}

/**
 * Resolves this check's CCMS proceeding type code, if it asks an
 * immigration/asylum or domestic-abuse question at all.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {string | undefined} the CCMS proceeding type code, if relevant
 */
function resolveCcmsCode(
  answers: Answers,
  relevantSteps: Set<string>,
): string | undefined {
  if (relevantSteps.has("domestic_abuse_applicant")) {
    return ccmsCodeFromCertificatedJourney(answers);
  }
  if (relevantSteps.has("immigration_or_asylum")) {
    return ccmsCodeFromImmigrationAndAsylumChoices(answers);
  }
  return undefined;
}

/**
 * Builds the `proceeding_types` section of a CFE payload, if this check asks
 * an immigration/asylum or domestic-abuse question at all.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {ProceedingTypePayload[] | undefined} the proceeding types, if relevant
 */
export function buildProceedingTypes(
  answers: Answers,
  relevantSteps: Set<string>,
): ProceedingTypePayload[] | undefined {
  const ccmsCode = resolveCcmsCode(answers, relevantSteps);
  if (ccmsCode === undefined) return undefined;
  return [{ ccms_code: ccmsCode, client_involvement_type: CLIENT_INVOLVEMENT_TYPE }];
}
