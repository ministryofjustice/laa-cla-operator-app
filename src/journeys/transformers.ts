import type { Deps } from "#src/journeys/api.js";
import { TransformerRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";

export const transformers = new TransformerRegistry<Deps>();

export const Transformers = {
  /**
   * Converts a date of birth object into a JavaScript Date object.
   * @param {Record<string, number> | null} value - The date of birth object containing day, month, and year.
   * @returns {Date | null} - The corresponding Date object, or null if the input is null.
   */
  dobToDate: transformers.register(
    "dobToDate",
    (deps) =>
      (value: Record<string, number> | null): Date | null => {
        if (value === null) {
          return null;
        }
        const { day, month, year } = value;
        //eslint-disable-next-line @typescript-eslint/no-magic-numbers -- month is zero-indexed in JavaScript Date constructor
        const date = new Date(year, month - 1, day);
        return date;
      },
  ),
  /**
   * Converts a "safe to call" value into a human-readable "Yes" or "No".
   * @param {string} value - The input string indicating if it is safe to call.
   * @returns {string} - "Yes" if safe to call, otherwise a red badge indicating not safe to call.
   */
  SafeToCall: transformers.register("SafeToCall", (deps) => (value: string) => {
    if (value.toLowerCase() === "safe") {
      return "Yes";
    }
    return 'No <span class="moj-badge moj-badge--red">not safe to call</span>';
  }),

  /**
   * Parses a boolean value to yes and no, indicating if withheld numbers are accepted.
   * @param {boolean | null} value - The input boolean or null.
   * @returns {string | null} - "yes" if true, "no" if false, and null if the value is null.
   */
  WithheldNumbersAcceptedParser: transformers.register(
    "WithheldNumbersAcceptedParser",
    (deps) => (value: boolean | null) => {
      if (value === null) {
        return null;
      }
      return value ? "yes" : "no";
    },
  ),

  /**
   * Converts a boolean value indicating if withheld numbers are accepted into a yes or no with a red badge for no.
   * @param {boolean | null} value - The input boolean or null.
   * @returns {string} - "Yes" if true, and a red badge with "No" if false.
   */
  WithheldNumbersAccepted: transformers.register(
    "WithheldNumbersAccepted",
    (deps) => (value: boolean | null) => {
      if (value !== true) {
        return 'No <span class="moj-badge moj-badge--red">withheld numbers screened</span>';
      }
      return "Yes";
    },
  ),

  /**
   * Concatenates multiple Answer strings with a specified separator.
   * @param {string} value - The first string to concatenate.
   * @param {string} separator - The separator to use between strings.
   * @param {string[]} args - Additional strings to concatenate.
   * @returns {string} - The concatenated string.
   */
  Concat: transformers.register(
    "Concat",
    (deps) =>
      (value: string, separator: string, ...args: string[]) =>
        [value, ...args].join(separator),
  ),
};
