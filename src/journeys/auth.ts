import { hasValidSilasToken } from "#src/middleware/apiMiddleware.js";
import {
  access,
  Session,
  ConditionRegistry,
  redirect
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { Deps } from "./api.js";

export const myConditions = new ConditionRegistry<Deps>()

export const MyConditions = {
  /**
   * Checks that a numeric value meets the minimum score threshold.
   * @param minScore - The minimum value required for eligibility.
   */
  HasValidSilasToken: myConditions.register(
    'HasValidSilasToken',
    (_deps) => (silasAuth) => hasValidSilasToken(silasAuth)
  )
}

export const requireSilasAuth = access({
  when: Session("silasAuth")
    .not
    .match(MyConditions.HasValidSilasToken()),
  next: [
    redirect({
      goto: "/login",
    }),
  ],
});