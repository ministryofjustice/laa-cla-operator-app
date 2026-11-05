import eligibilityCopy from "../locales/en.json" with { type: "json" };
// Who an income form is asking about. The client's and the partner's income
// steps are the same questions with different wording and a `partner_` answer
// prefix, so each form is built once from one of these.
import {
  Answer,
  Condition,
  when,
  type ChainableConditional,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { ResolvableString } from "@ministryofjustice/hmpps-forge/core/components";

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
  noun: eligibilityCopy.your_client,
  possessive: eligibilityCopy.your_client_s,
  people: eligibilityCopy.clients,
  peopleTitle: eligibilityCopy.clients_28e22fe3,
};

export const PARTNER: IncomeSubject = {
  prefix: "partner_",
  noun: eligibilityCopy.the_partner,
  possessive: eligibilityCopy.the_partner_s,
  people: eligibilityCopy.partners,
  peopleTitle: eligibilityCopy.partners_aa16f0e5,
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
  controlledText: ResolvableString,
  certificatedText: ResolvableString,
): ChainableConditional {
  return when(isControlled).then(controlledText).else(certificatedText);
}
