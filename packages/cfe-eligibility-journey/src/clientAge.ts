/**
 * The host app supplies the client's date of birth (ISO `YYYY-MM-DD`) under this Data key, and the journey
 * uses it to answer the age questions instead of asking them.
 */
export const CLIENT_DATE_OF_BIRTH_DATA_KEY = 'clientDateOfBirth'
/** Set to the client's age when it was derived from a valid date of birth; absent otherwise */
export const CLIENT_AGE_DATA_KEY = 'clientAgeFromDob'
// Steps' onAccess hooks can't read Answer(), so the derived answers are also exposed as Data flags.
// Each is set to true/false when the client's age was derived from a valid date of birth; absent otherwise.
export const CLIENT_IS_UNDER_18_DATA_KEY = 'clientIsUnder18FromDob'
export const CLIENT_IS_60_OR_OVER_DATA_KEY = 'clientIs60OrOverFromDob'

export const ADULT_AGE = 18
export const OVER_60_AGE = 60

interface CalendarDate {
  year: number
  month: number
  day: number
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Parses a strict ISO `YYYY-MM-DD` date, rejecting impossible dates such as 2023-02-29.
 * @param {unknown} value The value to parse
 * @returns {CalendarDate | null} The calendar date, or null if the value is not a valid ISO date
 */
export function parseIsoDate(value: unknown): CalendarDate | null {
  if (typeof value !== 'string') {
    return null
  }

  const match = ISO_DATE_PATTERN.exec(value.trim())
  if (!match) {
    return null
  }

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return { year, month, day }
}

/**
 * Gets today's calendar date in the UK, so ages roll over at UK midnight regardless of the server's timezone.
 * @param {Date} now The current instant
 * @returns {CalendarDate} Today's date in Europe/London
 */
export function ukCalendarDate(now: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value)

  return { year: part('year'), month: part('month'), day: part('day') }
}

/**
 * Calculates age in whole years. Someone born on 29 February has their birthday on 1 March in non-leap years.
 * @param {unknown} dateOfBirth The date of birth as an ISO `YYYY-MM-DD` string
 * @param {Date} now The current instant
 * @returns {number | null} The age, or null if the date of birth is missing, invalid or in the future
 */
export function calculateAge(dateOfBirth: unknown, now: Date): number | null {
  const dob = parseIsoDate(dateOfBirth)
  if (!dob) {
    return null
  }

  const today = ukCalendarDate(now)
  const hadBirthdayThisYear = today.month > dob.month || (today.month === dob.month && today.day >= dob.day)
  const age = today.year - dob.year - (hadBirthdayThisYear ? 0 : 1)

  return age >= 0 ? age : null
}

/**
 * Works out which age questions can be answered from the client's age.
 * The partner question is only answered when the client is 60 or over, because otherwise the partner's age decides it.
 * @param {number} age The client's age
 * @returns {Record<string, 'yes' | 'no'>} Answers keyed by answer code
 */
export function deriveAgeAnswers(age: number): Record<string, 'yes' | 'no'> {
  const is60OrOver = age >= OVER_60_AGE

  return {
    'under-18': age < ADULT_AGE ? 'yes' : 'no',
    '60-or-over': is60OrOver ? 'yes' : 'no',
    ...(is60OrOver ? { '60-or-over-with-partner': 'yes' as const } : {}),
  }
}
