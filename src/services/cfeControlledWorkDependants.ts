import {
  CONTROLLED_WORK_STEP_CODES,
  NO,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
  type ControlledWorkCountAnswer,
} from "#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js";
import { resolveControlledWorkJourney } from "#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js";

const CHILD_DEPENDANT_AGE = 11;
const ADULT_DEPENDANT_AGE = 21;
const ZERO_ASSETS_VALUE = 0;
const MONTH_INDEX_OFFSET = 1;
const LAST_DAY_OF_MONTH = 0;
const ISO_DATE_START_INDEX = 0;
const ISO_DATE_END_INDEX = 10;

export interface ControlledWorkCfeDependant {
  date_of_birth: string;
  in_full_time_education: boolean;
  relationship: "adult_relative" | "child_relative";
  assets_value: number;
}

interface DependantRecordOptions {
  age: number;
  category: "child" | "adult";
  inFullTimeEducation: boolean;
  referenceDate: Date;
  relationship: ControlledWorkCfeDependant["relationship"];
}

/**
 * Subtracts full calendar years and clamps leap days to the end of February.
 * @param {Date} date The reference date
 * @param {number} years The number of years to subtract
 * @returns {string} The resulting ISO date
 */
function dateYearsBefore(date: Date, years: number): string {
  const year = date.getUTCFullYear() - years;
  const month = date.getUTCMonth();
  const day = Math.min(
    date.getUTCDate(),
    new Date(
      Date.UTC(year, month + MONTH_INDEX_OFFSET, LAST_DAY_OF_MONTH),
    ).getUTCDate(),
  );
  return new Date(Date.UTC(year, month, day))
    .toISOString()
    .slice(ISO_DATE_START_INDEX, ISO_DATE_END_INDEX);
}

/**
 * Creates the repeated records for one dependant category.
 * @param {"yes" | "no"} answer Whether any dependants are present
 * @param {ControlledWorkCountAnswer | undefined} countAnswer The selected dependant count
 * @param {DependantRecordOptions} options The CCQ record conventions for this category
 * @returns {ControlledWorkCfeDependant[]} The generated records
 */
function dependantRecords(
  answer: "yes" | "no",
  countAnswer: ControlledWorkCountAnswer | undefined,
  options: DependantRecordOptions,
): ControlledWorkCfeDependant[] {
  if (answer === NO) return [];
  if (countAnswer === undefined) {
    throw new Error(
      `Cannot map ${options.category} dependants without a count`,
    );
  }

  const count = Number(countAnswer);
  const dateOfBirth = dateYearsBefore(options.referenceDate, options.age);

  return Array.from({ length: count }, () => ({
    date_of_birth: dateOfBirth,
    in_full_time_education: options.inFullTimeEducation,
    relationship: options.relationship,
    assets_value: ZERO_ASSETS_VALUE,
  }));
}

/**
 * Maps the active dependant-details answers to the CCQ CFE dependant records.
 * @param {ControlledWorkAnswers} answers The saved controlled-work answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @param {Date} referenceDate The date used for CCQ's synthetic dependant dates of birth
 * @returns {ControlledWorkCfeDependant[] | undefined} Dependants when the page applies; undefined otherwise
 */
export function buildControlledWorkDependants(
  answers: ControlledWorkAnswers,
  context: ControlledWorkContext,
  referenceDate = new Date(),
): ControlledWorkCfeDependant[] | undefined {
  const { answers: activeAnswers, steps } = resolveControlledWorkJourney(
    answers,
    context,
  );
  if (!steps.includes(CONTROLLED_WORK_STEP_CODES.dependantDetails)) {
    return undefined;
  }

  const {
    "child-dependants": childAnswer,
    "child-dependants-count": childCount,
    "adult-dependants": adultAnswer,
    "adult-dependants-count": adultCount,
  } = activeAnswers;
  if (childAnswer === undefined || adultAnswer === undefined) {
    throw new Error(
      "Cannot map dependants before both dependant questions are answered",
    );
  }

  return [
    ...dependantRecords(childAnswer, childCount, {
      age: CHILD_DEPENDANT_AGE,
      category: "child",
      inFullTimeEducation: true,
      referenceDate,
      relationship: "child_relative",
    }),
    ...dependantRecords(adultAnswer, adultCount, {
      age: ADULT_DEPENDANT_AGE,
      category: "adult",
      inFullTimeEducation: false,
      referenceDate,
      relationship: "adult_relative",
    }),
  ];
}
