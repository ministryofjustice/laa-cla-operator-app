// Port of CCQ's `CfeService.call`'s payload-construction steps. Sending the
// payload to CFE and interpreting its response (`CfeConnection.assess`,
// `CfeResult`) is out of scope for this module — see the CFE payload
// builders plan.
import type { Answers } from "../logic.js";
import { smodApplicable } from "../logic.js";
import { stepsFor } from "../navigation.js";
import { buildApplicant } from "./applicant.js";
import { buildAssessmentSection } from "./assessment-section.js";
import { buildCapitalsSection, buildProperties } from "./assets.js";
import { buildDependantsSection } from "./dependants.js";
import { buildEmploymentIncomeSections } from "./employment-income.js";
import { buildIrregularIncomeSection } from "./irregular-income.js";
import { buildPartnerSection } from "./partner.js";
import { buildProceedingTypes } from "./proceedings.js";
import { buildRegularTransactionsSection } from "./regular-transactions.js";
import type { CfePayload } from "./types.js";
import { buildVehiclesSection } from "./vehicles.js";

/**
 * Sets a payload key only when its built value is defined, mirroring CCQ's
 * pattern of only ever assigning `payload[:key]` from inside a guarded
 * branch (an unset key, not a `null`/`undefined` one, means "not relevant").
 * @param {CfePayload} payload - the payload being built
 * @param {K} key - the key to set
 * @param {CfePayload[K] | undefined} value - the built value, if relevant
 * @template K
 */
function assignIfDefined<K extends keyof CfePayload>(
  payload: CfePayload,
  key: K,
  value: CfePayload[K] | undefined,
): void {
  if (value !== undefined) payload[key] = value;
}

/**
 * Builds the full CFE assessment payload for one check. Ported from
 * `CfeService.call`, in its exact order: assessment, dependants,
 * proceedings, employment income, irregular income, vehicles, assets
 * (capitals then properties), regular transactions, applicant, partner.
 * @param {Answers} answers - the saved answers
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {CfePayload} the CFE assessment payload
 */
export function buildAssessment(answers: Answers, today: Date): CfePayload {
  const relevantSteps = new Set(stepsFor(answers));
  const smod = smodApplicable(answers);

  const payload: CfePayload = {
    assessment: buildAssessmentSection(answers, relevantSteps, today),
  };

  assignIfDefined(
    payload,
    "dependants",
    buildDependantsSection(answers, relevantSteps, today),
  );
  assignIfDefined(
    payload,
    "proceeding_types",
    buildProceedingTypes(answers, relevantSteps),
  );

  const { employment_details: employmentDetails, self_employment_details: selfEmploymentDetails } =
    buildEmploymentIncomeSections(answers, relevantSteps);
  assignIfDefined(payload, "employment_details", employmentDetails);
  assignIfDefined(payload, "self_employment_details", selfEmploymentDetails);

  assignIfDefined(
    payload,
    "irregular_incomes",
    buildIrregularIncomeSection(answers, relevantSteps),
  );
  assignIfDefined(
    payload,
    "vehicles",
    buildVehiclesSection(answers, relevantSteps, smod, today),
  );
  assignIfDefined(
    payload,
    "capitals",
    buildCapitalsSection(answers, relevantSteps, smod),
  );
  assignIfDefined(
    payload,
    "properties",
    buildProperties(answers, relevantSteps, smod),
  );
  assignIfDefined(
    payload,
    "regular_transactions",
    buildRegularTransactionsSection(answers, relevantSteps),
  );

  payload.applicant = buildApplicant(answers, relevantSteps);

  assignIfDefined(payload, "partner", buildPartnerSection(answers, relevantSteps));

  return payload;
}
