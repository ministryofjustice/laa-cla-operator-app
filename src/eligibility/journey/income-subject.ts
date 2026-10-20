// Who an income form is asking about. The client's and the partner's income
// steps are the same questions with different wording and a `partner_` answer
// prefix, so each form is built once from one of these.
import {
  Answer,
  Condition,
  when,
  type ChainableConditional,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export interface IncomeSubject {
  /** Prefix on the answer keys: empty for the client, `partner_` for the partner. */
  prefix: "" | "partner_";
  /** The subject as a noun phrase, as in "Does your client ...". */
  noun: string;
  /** The subject as a possessive, as in "your client's ...". */
  possessive: string;
  /** The plural CCQ uses in hints, as in "retired clients". */
  people: string;
  /** The plural starting a sentence or heading, as in "Clients in prison". */
  peopleTitle: string;
}

export const CLIENT: IncomeSubject = {
  prefix: "",
  noun: "your client",
  possessive: "your client's",
  people: "clients",
  peopleTitle: "Clients",
};

export const PARTNER: IncomeSubject = {
  prefix: "partner_",
  noun: "the partner",
  possessive: "the partner's",
  people: "partners",
  peopleTitle: "Partners",
};

/** True when the check is for controlled work, the other level being certificated. */
export const isControlled = Answer("level_of_help").match(
  Condition.Equals("controlled"),
);

/**
 * Picks wording by level of help.
 * @param {string} controlledText - the controlled work wording
 * @param {string} certificatedText - the certificated work wording
 * @returns {ChainableConditional} text resolved when the page renders
 */
export function byLevelOfHelp(
  controlledText: string,
  certificatedText: string,
): ChainableConditional {
  return when(isControlled).then(controlledText).else(certificatedText);
}
