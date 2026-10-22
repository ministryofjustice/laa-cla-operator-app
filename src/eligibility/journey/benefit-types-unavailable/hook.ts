import {
  access,
  redirect,
  Condition,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";

/**
 * Loads CFE's benefit types before a benefit details step, and sends the
 * operator to the error page when they cannot be loaded.
 * @param {string} stepCode - the benefit details step being loaded
 * @returns {ReturnType<typeof access>} the access hook
 */
export function loadBenefitTypesHook(
  stepCode: string,
): ReturnType<typeof access> {
  return access({
    effects: [EligibilityEffects.LoadBenefitTypes(stepCode)],
    next: [
      redirect({
        when: Data("benefitTypesUnavailable").match(Condition.Equals(true)),
        goto: `benefit-types-unavailable?from=${stepCode}`,
      }),
    ],
  });
}
