// Date helpers for the CFE payload builders.
//
// `today` is always passed in explicitly (never read from `new Date()`), so
// that CCQ's `n.years.ago.to_date` arithmetic (used for vehicles' assumed
// purchase dates and dependants' assumed ages — real dates of birth are used
// for the applicant and partner, see applicant.ts/partner.ts) stays
// deterministic for callers and for the parity test.
//
// `today` must be a UTC midnight instant (e.g. `new Date(Date.UTC(2024, 5, 1))`
// for 2024-06-01), so that `toIsoDate` reads back the intended calendar date
// regardless of the host machine's local timezone.

const ZERO = 0;
const ISO_DATE_LENGTH = 10;
const FEBRUARY = 1;
const LEAP_DAY = 29;
const LAST_DAY_OF_FEBRUARY_IN_COMMON_YEAR = 28;
const QUADRENNIAL = 4;
const CENTENNIAL = 100;
const QUATERCENTENNIAL = 400;

/**
 * Whether a year is a leap year (Gregorian calendar rules).
 * @param {number} year - the year to check
 * @returns {boolean} whether the year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (
    (year % QUADRENNIAL === ZERO && year % CENTENNIAL !== ZERO) ||
    year % QUATERCENTENNIAL === ZERO
  );
}

/**
 * Ported from Ruby's `n.years.ago.to_date`: the same calendar day and month,
 * `years` years earlier. 29 February clamps to 28 February in a year that is
 * not a leap year, matching ActiveSupport's behaviour.
 * @param {number} years - how many years to go back
 * @param {Date} today - the current date, as a UTC midnight instant
 * @returns {Date} the date `years` years before `today`, as a UTC midnight instant
 */
export function yearsAgo(years: number, today: Date): Date {
  const targetYear = today.getUTCFullYear() - years;
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  const clampedDay =
    month === FEBRUARY && day === LEAP_DAY && !isLeapYear(targetYear)
      ? LAST_DAY_OF_FEBRUARY_IN_COMMON_YEAR
      : day;
  return new Date(Date.UTC(targetYear, month, clampedDay));
}

/**
 * Formats a date as `YYYY-MM-DD`, matching how CCQ sends dates to CFE.
 * @param {Date} date - a UTC midnight instant
 * @returns {string} the date formatted as `YYYY-MM-DD`
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(ZERO, ISO_DATE_LENGTH);
}
