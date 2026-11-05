// Port of CCQ's `Cfe::DependantsPayloadService` + `CfeParamBuilders::Dependants`.
import type { Answers } from "../logic.js";
import { translateEmploymentFrequency } from "./employment-income.js";
import { yearsAgo, toIsoDate } from "./dates.js";
import { asArray, assumeType } from "./types.js";
import type { DependantIncomeItem, DependantPayload } from "./types.js";

const ADULT_AGE = 21;
const CHILD_WITH_INCOME_AGE = 17;
const CHILD_WITHOUT_INCOME_AGE = 11;
const ZERO = 0;

type PersonType = "adult" | "child";

/**
 * CFE can't take "unknown age", so these ages are deliberate stand-ins, not
 * real ages: the specific age of a child dependant does not affect the base
 * allowance, but younger children cannot have their income considered, so a
 * child with income is assumed to be 17 (so CFE does consider it) and a
 * child without income is assumed to be 11 (so their dependant allowance
 * lands in a more intuitive place on the CW form). Adults are assumed to be 21.
 * @param {PersonType} personType - whether this dependant is an adult or a child
 * @param {DependantIncomeItem | undefined} income - this dependant's income row, if any
 * @returns {number} the assumed age
 */
function assumedAge(
  personType: PersonType,
  income: DependantIncomeItem | undefined,
): number {
  if (personType === "adult") return ADULT_AGE;
  return income === undefined
    ? CHILD_WITHOUT_INCOME_AGE
    : CHILD_WITH_INCOME_AGE;
}

/**
 * Builds a dependant's income entry, if they have one.
 * @param {DependantIncomeItem} income - the dependant's income row
 * @returns {{frequency: string, amount: number}} the dependant's income entry
 */
function buildDependantIncome(income: DependantIncomeItem): {
  frequency: string;
  amount: number;
} {
  return {
    frequency: translateEmploymentFrequency(income.frequency),
    amount: income.amount,
  };
}

/** The subset of a dependant-details answers the dependants builder reads. */
export interface DependantDetailsAnswers {
  adult_dependants?: boolean;
  adult_dependants_count?: number;
  child_dependants?: boolean;
  child_dependants_count?: number;
}

/**
 * Builds the `dependants` section of a CFE payload. Each dependant is
 * paired, in order (adults first, then children), with the corresponding
 * row of `dependant_incomes` — this is positional, not a lookup by any
 * dependant identity, matching CCQ's `Array#zip`.
 * @param {DependantDetailsAnswers} form - the dependant-details answers
 * @param {DependantIncomeItem[]} dependantIncomes - the saved dependant income rows
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {DependantPayload[]} the dependants
 */
export function buildDependants(
  form: DependantDetailsAnswers,
  dependantIncomes: DependantIncomeItem[],
  today: Date,
): DependantPayload[] {
  const people: PersonType[] = [
    ...Array.from<PersonType>({
      length:
        form.adult_dependants === true
          ? (form.adult_dependants_count ?? ZERO)
          : ZERO,
    }).fill("adult"),
    ...Array.from<PersonType>({
      length:
        form.child_dependants === true
          ? (form.child_dependants_count ?? ZERO)
          : ZERO,
    }).fill("child"),
  ];

  return people.map((personType, index) => {
    const income = dependantIncomes.at(index);
    const age = assumedAge(personType, income);
    const dependant: DependantPayload = {
      date_of_birth: toIsoDate(yearsAgo(age, today)),
      in_full_time_education: personType === "child",
      relationship:
        personType === "adult" ? "adult_relative" : "child_relative",
      assets_value: ZERO,
    };
    if (income !== undefined) {
      dependant.income = buildDependantIncome(income);
    }
    return dependant;
  });
}

/**
 * Builds the `dependants` section of a CFE payload, if the client has
 * dependants. Ported from `Cfe::DependantsPayloadService`.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {DependantPayload[] | undefined} the dependants, if relevant
 */
export function buildDependantsSection(
  answers: Answers,
  relevantSteps: Set<string>,
  today: Date,
): DependantPayload[] | undefined {
  if (!relevantSteps.has("dependant_details")) return undefined;

  const dependantIncomes = relevantSteps.has("dependant_income_details")
    ? asArray<DependantIncomeItem>(answers.dependant_incomes)
    : [];

  return buildDependants(
    assumeType<DependantDetailsAnswers>(answers),
    dependantIncomes,
    today,
  );
}
