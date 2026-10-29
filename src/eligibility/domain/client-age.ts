// CCQ asks for the client's age bracket (`ClientAgeForm`). Here the earlier
// call-intake journey has already collected their date of birth, so the
// bracket is derived from it instead of asked.
import { yearsAgo } from "./cfe/dates.js";
import type { Answers } from "./logic.js";
import { CLIENT_AGE } from "./logic.js";

const ADULT_AGE = 18;
const OVER_60_AGE = 60;

/**
 * The CCQ `client_age` bracket for a date of birth.
 * @param {string} dateOfBirth - `YYYY-MM-DD`
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {string} one of `CLIENT_AGE`
 */
export function clientAge(dateOfBirth: string, today: Date): string {
  // A `YYYY-MM-DD` string parses as UTC midnight, comparable with `yearsAgo`
  const born = new Date(dateOfBirth);
  if (born > yearsAgo(ADULT_AGE, today)) return CLIENT_AGE.UNDER_18;
  if (born <= yearsAgo(OVER_60_AGE, today)) return CLIENT_AGE.OVER_60;
  return CLIENT_AGE.STANDARD;
}

/**
 * Adds the derived `client_age` to answers that hold a date of birth.
 * @param {Answers} answers - the saved answers
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {Answers} the answers, with `client_age` if derivable
 */
export function withClientAge(answers: Answers, today: Date): Answers {
  if (typeof answers.date_of_birth !== "string") return answers;
  return { ...answers, client_age: clientAge(answers.date_of_birth, today) };
}
