// Port of CCQ's Steps::NonFinancialSection (app/lib/steps/non_financial_section.rb).
import type { Answers } from "../logic.js";
import {
  aggregatedMeans,
  clientUnderEighteen,
  controlled,
  controlledClr,
  dependants,
  dependantsGetIncome,
  domesticAbuseApplicant,
  immigrationOrAsylum,
  nonMeansTested,
  passported,
  underEighteenNoMeansTestRequired,
  underEighteenRegularIncome,
} from "../logic.js";
import type { Group, Section } from "./shared.js";
import { compactGroups } from "./shared.js";

const UNDER_18_STEPS = [
  "under_18_clr",
  "aggregated_means",
  "how_to_aggregate",
  "regular_income",
  "under_eighteen_assets",
];
const CASE_TYPE_STEPS = [
  "domestic_abuse_applicant",
  "immigration_or_asylum",
  "immigration_or_asylum_type",
  "immigration_or_asylum_type_upper_tribunal",
  "asylum_support",
];
const CASE_DETAILS_STEPS = [
  "level_of_help",
  ...UNDER_18_STEPS,
  ...CASE_TYPE_STEPS,
];
const APPLICANT_DETAILS_STEPS = [
  "applicant",
  "dependant_details",
  "dependant_income",
  "dependant_income_details",
];

/** Every step code this section can ever produce, used only in tests. */
export const ALL_STEPS: readonly string[] = [
  ...CASE_DETAILS_STEPS,
  ...APPLICANT_DETAILS_STEPS,
];

/**
 * The under-18-only steps: controlled legal representation, then (unless the
 * client has it) the aggregated-means / regular-income / assets chain, each
 * question only asked once the one before it has ruled out an earlier route
 * to "no means test required".
 * @param {Answers} answers - the saved answers
 * @returns {string[]} the applicable under-18 step codes, in order
 */
function underEighteenSteps(answers: Answers): string[] {
  if (!clientUnderEighteen(answers)) return [];
  const isClr = controlledClr(answers);
  const isAggregated = aggregatedMeans(answers) === true;
  const isRegularIncome = underEighteenRegularIncome(answers) === true;
  const steps: Array<string | undefined> = [
    "under_18_clr",
    isClr ? undefined : "aggregated_means",
    isAggregated && !isClr ? "how_to_aggregate" : undefined,
    isClr || isAggregated ? undefined : "regular_income",
    isClr || isAggregated || isRegularIncome
      ? undefined
      : "under_eighteen_assets",
  ];
  return steps.filter((step): step is string => step !== undefined);
}

/**
 * The matter-type steps for controlled work, skipped entirely once an
 * under-18 client needs no means test at all.
 * @param {Answers} answers - the saved answers
 * @returns {Group | undefined} the matter-type group, if relevant
 */
function controlledMatterTypeGroup(answers: Answers): Group | undefined {
  if (underEighteenNoMeansTestRequired(answers)) return undefined;
  if (immigrationOrAsylum(answers)) {
    return [
      "immigration_or_asylum",
      "immigration_or_asylum_type",
      "asylum_support",
    ];
  }
  return ["immigration_or_asylum"];
}

/**
 * The matter-type steps for non-controlled work, which ask about the upper
 * tribunal route instead, unless the client is a domestic abuse applicant.
 * @param {Answers} answers - the saved answers
 * @returns {Group} the upper-tribunal matter-type group
 */
function upperTribunalTypeGroup(answers: Answers): Group {
  if (domesticAbuseApplicant(answers)) return [];
  if (immigrationOrAsylum(answers)) {
    return ["immigration_or_asylum_type_upper_tribunal", "asylum_support"];
  }
  return ["immigration_or_asylum_type_upper_tribunal"];
}

/**
 * The steps that come after level of help: the under-18 chain and matter
 * type for controlled work, nothing once no means test is required, or
 * domestic abuse and upper-tribunal matter type otherwise.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups, in order
 */
function postLevelOfHelpSteps(answers: Answers): Group[] {
  if (controlled(answers)) {
    return compactGroups([
      underEighteenSteps(answers),
      controlledMatterTypeGroup(answers),
    ]);
  }
  if (underEighteenNoMeansTestRequired(answers)) return [];
  return compactGroups([
    ["domestic_abuse_applicant"],
    upperTribunalTypeGroup(answers),
  ]);
}

/**
 * Whether, and in how much detail, the dependants' own income is asked
 * about.
 * @param {Answers} answers - the saved answers
 * @returns {string | undefined} the dependant-income-details step, if relevant
 */
function dependantIncomeDetails(answers: Answers): string | undefined {
  return dependantsGetIncome(answers) ? "dependant_income_details" : undefined;
}

/**
 * The dependant-income steps, asked only once the client has said they have
 * dependants.
 * @param {Answers} answers - the saved answers
 * @returns {string[]} the applicable dependant-income step codes
 */
function dependantIncome(answers: Answers): string[] {
  if (!dependants(answers)) return [];
  const details = dependantIncomeDetails(answers);
  return details === undefined
    ? ["dependant_income"]
    : ["dependant_income", details];
}

/**
 * The dependant-details steps, skipped entirely for a passported client.
 * @param {Answers} answers - the saved answers
 * @returns {Group | undefined} the dependant-details group, if relevant
 */
function dependantDetails(answers: Answers): Group | undefined {
  if (passported(answers)) return undefined;
  return ["dependant_details", ...dependantIncome(answers)];
}

/**
 * The applicant-details groups: the applicant step itself, plus dependant
 * details unless the client is passported.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicant-details groups
 */
function applicantGroups(answers: Answers): Group[] {
  return compactGroups([["applicant"], dependantDetails(answers)]);
}

/**
 * The applicant-details groups, skipped entirely once no means test is
 * required at all.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups
 */
function applicantGroupedStepsFor(answers: Answers): Group[] {
  if (nonMeansTested(answers)) return [];
  return applicantGroups(answers);
}

/**
 * The level-of-help group, asked first. Client age is calculated from DOB
 * provided by the earlier journey, so the client_age step is skipped.
 * @returns {Group[]} the initial groups
 */
function initialSteps(): Group[] {
  return [["level_of_help"]];
}

/**
 * The step groups this section contributes, in order.
 * @param {Answers} answers - the saved answers
 * @returns {Group[]} the applicable groups, in order
 */
function groupedStepsFor(answers: Answers): Group[] {
  return [
    ...initialSteps(),
    ...postLevelOfHelpSteps(answers),
    ...applicantGroupedStepsFor(answers),
  ];
}

/** Port of CCQ's `Steps::NonFinancialSection`. */
export const nonFinancialSection: Section = {
  allSteps: ALL_STEPS,
  groupedStepsFor,
};
