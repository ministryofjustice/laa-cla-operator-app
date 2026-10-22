// Port of CCQ's `Steps::Logic` (app/lib/steps/logic.rb), pinned at commit 1a30ea3f.
//
// Each function mirrors one CCQ predicate. Three functions preserve CCQ's
// tri-state nil/true/false, because `not_aggregated_no_income_low_capital?`
// checks `== false` rather than truthiness: an unanswered question and an
// answer of "no" are not the same thing. Everything else collapses to a
// plain boolean, because nothing else in CCQ compares these predicates
// against `false` (only against truthiness, via `&&`/`!`/ternaries).

/**
 * The saved answers for one check, keyed by CCQ's own answer names (D5).
 * Values are read defensively, since an in-progress check may not have
 * answered every question yet.
 */
export type Answers = Record<string, unknown>;

/** Ported from CCQ's `ClientAgeForm`. */
export const CLIENT_AGE = {
  UNDER_18: "under_18",
  OVER_60: "over_60",
  STANDARD: "standard",
} as const;

/** Ported from CCQ's `LevelOfHelpForm`. */
export const LEVEL_OF_HELP = {
  CONTROLLED: "controlled",
  CERTIFICATED: "certificated",
} as const;

/** Ported from CCQ's `PropertyForm::OWNED_OPTIONS` (also used by `AdditionalPropertyForm`). */
export const PROPERTY_OWNED_OPTIONS = [
  "outright",
  "with_mortgage",
  "shared_ownership",
] as const;

/** Ported from CCQ's `EmploymentStatusForm::EMPLOYED_STATUSES`. */
export const EMPLOYED_STATUSES = ["in_work"] as const;

/**
 * Ruby truthiness for an answer: everything except `false` and unset counts
 * as true. CCQ's session values are never `null`, but a plain object built
 * by hand (as in tests) might hold one, so both are treated as unset.
 * @param {unknown} value - a raw answer value
 * @returns {boolean} whether the value is truthy
 */
function truthy(value: unknown): boolean {
  return value !== false && value !== undefined && value !== null;
}

/**
 * Reads an answer that is expected to be a yes/no question, keeping CCQ's
 * tri-state: `true`, `false`, or `undefined` if not yet answered.
 * @param {unknown} value - a raw answer value
 * @returns {boolean | undefined} true, false, or undefined
 */
function triState(value: unknown): boolean | undefined {
  if (value === true) return true;
  if (value === false) return false;
  return undefined;
}

/**
 * Ported from Ruby's `value.in?(options)`: whether an answer equals one of a
 * fixed set of option strings.
 * @param {unknown} value - a raw answer value
 * @param {readonly string[]} options - the allowed option strings
 * @returns {boolean} whether the value is one of the options
 */
function isOneOf(value: unknown, options: readonly string[]): boolean {
  return options.some((option) => option === value);
}

/**
 * Whether the client has said they are under 18.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client is under 18
 */
export const clientUnderEighteen = (answers: Answers): boolean =>
  answers.client_age === CLIENT_AGE.UNDER_18;

/**
 * Whether this check is for controlled work legal help, as opposed to
 * certificated.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether this is controlled work
 */
export const controlled = (answers: Answers): boolean =>
  answers.level_of_help === LEVEL_OF_HELP.CONTROLLED;

/**
 * Whether an under-18 client has controlled legal representation, which
 * means their own means are not assessed.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client has controlled legal representation
 */
export const controlledClr = (answers: Answers): boolean =>
  clientUnderEighteen(answers) &&
  controlled(answers) &&
  truthy(answers.controlled_legal_representation);

/**
 * Whether an under-18 client's means are aggregated with a parent or
 * guardian's. Tri-state: `undefined` until the client has answered.
 * @param {Answers} answers - the saved answers
 * @returns {boolean | undefined} true, false, or undefined if not yet answered
 */
export const aggregatedMeans = (answers: Answers): boolean | undefined => {
  if (!clientUnderEighteen(answers)) return false;
  return triState(answers.aggregated_means);
};

/**
 * Whether an under-18 client (whose means are not aggregated) has a regular
 * income of their own. Tri-state: `undefined` until the client has answered.
 * @param {Answers} answers - the saved answers
 * @returns {boolean | undefined} true, false, or undefined if not yet answered
 */
export const underEighteenRegularIncome = (
  answers: Answers,
): boolean | undefined => {
  if (!clientUnderEighteen(answers)) return false;
  if (truthy(aggregatedMeans(answers))) return false;
  return triState(answers.regular_income);
};

/**
 * Whether an under-18 client (with no aggregated means or regular income of
 * their own) has assets of their own. Tri-state: `undefined` until the
 * client has answered.
 * @param {Answers} answers - the saved answers
 * @returns {boolean | undefined} true, false, or undefined if not yet answered
 */
export const underEighteenAssets = (answers: Answers): boolean | undefined => {
  if (!clientUnderEighteen(answers)) return false;
  if (truthy(aggregatedMeans(answers))) return false;
  if (truthy(underEighteenRegularIncome(answers))) return false;
  return triState(answers.under_eighteen_assets);
};

/**
 * Whether an under-18 client, with no aggregated means and no income or
 * assets of their own, has been confirmed to need no means test at all.
 * This only returns true once all three questions have been answered "no".
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether no means test is required, having confirmed each part
 */
export function notAggregatedNoIncomeLowCapital(answers: Answers): boolean {
  return (
    aggregatedMeans(answers) === false &&
    underEighteenRegularIncome(answers) === false &&
    underEighteenAssets(answers) === false
  );
}

/**
 * Whether an under-18 client needs no means test at all: because they are
 * not controlled work, because they have controlled legal representation,
 * or because they have confirmed no aggregated means, income or assets.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether no means test is required for this under-18 client
 */
export const underEighteenNoMeansTestRequired = (answers: Answers): boolean => {
  if (!clientUnderEighteen(answers)) return false;
  if (!controlled(answers)) return true;
  if (controlledClr(answers)) return true;
  return notAggregatedNoIncomeLowCapital(answers);
};

/**
 * Whether the client is claiming on an immigration or asylum matter. The
 * question asked, and so the field read, differs by level of help.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether this is an immigration or asylum matter
 */
export const immigrationOrAsylum = (answers: Answers): boolean => {
  if (controlled(answers)) return truthy(answers.immigration_or_asylum);
  return (
    isOneOf(answers.immigration_or_asylum_type_upper_tribunal, [
      "immigration_upper",
      "asylum_upper",
    ]) && !domesticAbuseApplicant(answers)
  );
};

/**
 * Whether disputed assets (subject matter of dispute) can be flagged in the
 * CFE payload at all. Immigration/asylum matters never ask the dispute
 * questions, so nothing can be flagged for them.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether disputed-asset flags apply to this check
 */
export const smodApplicable = (answers: Answers): boolean =>
  !immigrationOrAsylum(answers);

/**
 * Whether the client is a domestic abuse applicant. Only asked outside
 * controlled work.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client is a domestic abuse applicant
 */
export const domesticAbuseApplicant = (answers: Answers): boolean =>
  truthy(answers.domestic_abuse_applicant) && !controlled(answers);

/**
 * Whether an immigration or asylum client is asylum supported (receiving
 * section 4 or 95 support).
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client is asylum supported
 */
export const asylumSupported = (answers: Answers): boolean =>
  immigrationOrAsylum(answers) && truthy(answers.asylum_support);

/**
 * Whether the client needs no means test at all, either because they are an
 * under-18 client who needs none, or because they are asylum supported.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether no means test is required
 */
export const nonMeansTested = (answers: Answers): boolean =>
  underEighteenNoMeansTestRequired(answers) || asylumSupported(answers);

/**
 * Whether the client is passported (on a qualifying benefit, so income and
 * capital questions are skipped).
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client is passported
 */
export const passported = (answers: Answers): boolean =>
  !nonMeansTested(answers) && truthy(answers.passporting);

/**
 * Whether income questions should be skipped, because the client needs no
 * means test or is passported.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether income questions should be skipped
 */
export const skipIncomeQuestions = (answers: Answers): boolean =>
  nonMeansTested(answers) || passported(answers);

/**
 * Whether capital questions should be skipped, because the client needs no
 * means test. Passporting does not skip capital questions.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether capital questions should be skipped
 */
export const skipCapitalQuestions = (answers: Answers): boolean =>
  nonMeansTested(answers);

/**
 * Whether the client owns property, in any of the ways CCQ recognises.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client owns property
 */
export const ownsProperty = (answers: Answers): boolean =>
  !skipCapitalQuestions(answers) &&
  isOneOf(answers.property_owned, PROPERTY_OWNED_OPTIONS);

/**
 * Whether the client owns their property outright.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client owns their property outright
 */
export const ownsPropertyOutright = (answers: Answers): boolean =>
  !skipCapitalQuestions(answers) && answers.property_owned === "outright";

/**
 * Whether the client owns their property with a mortgage or loan.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client owns their property with a mortgage or loan
 */
export const ownsPropertyWithMortgageOrLoan = (answers: Answers): boolean =>
  !skipCapitalQuestions(answers) && answers.property_owned === "with_mortgage";

/**
 * Whether the client owns their property as a shared ownership.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client's property is a shared ownership
 */
export const ownsPropertySharedOwnership = (answers: Answers): boolean =>
  !skipCapitalQuestions(answers) &&
  answers.property_owned === "shared_ownership";

/**
 * Whether the client owns an additional property, in any of the ways CCQ
 * recognises.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client owns an additional property
 */
export const ownsAdditionalProperty = (answers: Answers): boolean =>
  !skipCapitalQuestions(answers) &&
  isOneOf(answers.additional_property_owned, PROPERTY_OWNED_OPTIONS);

/**
 * Whether the client owns a vehicle.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client owns a vehicle
 */
export const ownsVehicle = (answers: Answers): boolean =>
  !skipCapitalQuestions(answers) && truthy(answers.vehicle_owned);

/**
 * Whether the client is employed, unless income questions are skipped.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client is employed
 */
export const employed = (answers: Answers): boolean => {
  if (skipIncomeQuestions(answers)) return false;
  return isOneOf(answers.employment_status, EMPLOYED_STATUSES);
};

/**
 * Whether the client receives benefits, unless income questions are skipped.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client receives benefits
 */
export const benefits = (answers: Answers): boolean => {
  if (skipIncomeQuestions(answers)) return false;
  return truthy(answers.receives_benefits);
};

/**
 * Whether the client has a partner, unless no means test is required.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client has a partner
 */
export const partner = (answers: Answers): boolean =>
  !nonMeansTested(answers) && truthy(answers.partner);

/**
 * Whether the client's partner owns an additional property, in any of the
 * ways CCQ recognises.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the partner owns an additional property
 */
export const partnerOwnsAdditionalProperty = (answers: Answers): boolean => {
  if (!partner(answers)) return false;
  return isOneOf(
    answers.partner_additional_property_owned,
    PROPERTY_OWNED_OPTIONS,
  );
};

/**
 * Whether the client's partner is employed, unless income questions are
 * skipped or there is no partner.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the partner is employed
 */
export const partnerEmployed = (answers: Answers): boolean => {
  if (skipIncomeQuestions(answers) || !partner(answers)) return false;
  return isOneOf(answers.partner_employment_status, EMPLOYED_STATUSES);
};

/**
 * Whether the client's partner receives benefits, unless income questions
 * are skipped or there is no partner.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the partner receives benefits
 */
export const partnerBenefits = (answers: Answers): boolean => {
  if (skipIncomeQuestions(answers) || !partner(answers)) return false;
  return truthy(answers.partner_receives_benefits);
};

/**
 * Whether the client has child or adult dependants, unless income questions
 * are skipped.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the client has dependants
 */
export const dependants = (answers: Answers): boolean => {
  if (skipIncomeQuestions(answers)) return false;
  return truthy(answers.child_dependants) || truthy(answers.adult_dependants);
};

/**
 * Whether the client's dependants get their own income, unless income
 * questions are skipped or there are no dependants.
 * @param {Answers} answers - the saved answers
 * @returns {boolean} whether the dependants get their own income
 */
export const dependantsGetIncome = (answers: Answers): boolean => {
  if (skipIncomeQuestions(answers) || !dependants(answers)) return false;
  return truthy(answers.dependants_get_income);
};
