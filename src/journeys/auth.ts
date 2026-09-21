import {
  ConditionRegistry,
  access,
  Session,
  redirect,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { Deps } from "./api.js";
import { hasValidSilasToken } from "#src/middleware/apiMiddleware.js";
import type { SilasSessionAuth } from "#types/auth-types.js";

export const conditionRegistry = new ConditionRegistry<Deps>();

export const AuthConditionsImplementation = {
  /**
   * Creates the SILAS token condition evaluator.
   * @param _deps - Journey dependencies.
   * @returns The token validation function.
   */
  HasValidSilasToken:
    (_deps: Deps) => (silasAuth: SilasSessionAuth | undefined) =>
      hasValidSilasToken(silasAuth),
};

export const AuthConditions = {
  /**
   * Checks that a numeric value meets the minimum score threshold.
   * @param minScore {number} - The minimum value required for eligibility.
   * @param silasAuth {string} - The Silas authentication token to validate.
   * @returns {boolean} A boolean indicating whether the Silas authentication token is valid.
   */
  HasValidSilasToken: conditionRegistry.register(
    "HasValidSilasToken",
    AuthConditionsImplementation.HasValidSilasToken,
  ),
};

export const requireSilasAuth = access({
  when: Session("silasAuth").not.match(AuthConditions.HasValidSilasToken()),
  next: [
    redirect({
      goto: "/login",
    }),
  ],
});
