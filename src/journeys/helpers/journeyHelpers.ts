import {
  type ChainableMatch,
  type ChainableRef,
  Condition,
  match,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { CallerType } from "#src/journeys/types.js";

/**
 * Returns the appropriate text based on the caller type.
 * @param {string} myself - Text to display if the caller is referring to themselves.
 * @param {string} thirdParty - Text to display if the caller is referring to a third party.
 * @param {ChainableRef} callerType - The type of caller.
 * @returns {ChainableMatch} The appropriate text based on the caller type.
 */
export const displayTextByCallerType = (
  myself: string,
  thirdParty: string,
  callerType: ChainableRef,
): ChainableMatch =>
  match(callerType)
    .branch(Condition.Equals(CallerType.client), myself)
    .branch(Condition.Equals(CallerType.thirdParty), thirdParty)
    .otherwise(myself);
