// Loads the benefit types the benefit-details steps offer, from CFE.
//
// CFE's list rarely changes, so a successful, non-empty response is kept in
// memory for a short time. A failure or an empty list is never kept, so a CFE
// outage is not remembered once CFE recovers. Unlike CCQ, which falls back to
// an empty list, a failure is reported to the caller so the operator can be
// told rather than shown a form with nothing to pick.
import type { Assessor } from "../ports/index.js";
import type { BenefitTypeOption } from "../domain/benefit-types.js";
import { benefitTypeOptions } from "../domain/benefit-types.js";

const CACHE_MINUTES = 10;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const CACHE_MILLISECONDS =
  CACHE_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const NONE = 0;

interface CachedOptions {
  options: BenefitTypeOption[];
  fetchedAt: number;
}

const cache = new WeakMap<Assessor, CachedOptions>();

/**
 * Fetches the selectable benefit types, using a recent successful response
 * when there is one.
 * @param {Assessor} assessor - the CFE client
 * @param {number} now - the current time in milliseconds
 * @returns {Promise<BenefitTypeOption[]>} the benefit types to offer
 * @throws {Error} when the call fails, or CFE returns no benefit types to offer
 */
export async function loadBenefitTypeOptions(
  assessor: Assessor,
  now: number = Date.now(),
): Promise<BenefitTypeOption[]> {
  const cached = cache.get(assessor);
  if (cached !== undefined && now - cached.fetchedAt < CACHE_MILLISECONDS) {
    return cached.options;
  }

  const options = benefitTypeOptions(await assessor.stateBenefitTypes());
  if (options.length === NONE) {
    throw new Error("CFE returned no state benefit types to choose from");
  }

  cache.set(assessor, { options, fetchedAt: now });
  return options;
}
