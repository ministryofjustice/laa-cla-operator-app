import {
  type ChainableMatch,
  type ChainableRef,
  Condition,
  match,
} from "@ministryofjustice/hmpps-forge/core/authoring";

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
    .branch(Condition.Equals("myself"), myself)
    .branch(Condition.Equals("thirdParty"), thirdParty)
    .otherwise(myself);
