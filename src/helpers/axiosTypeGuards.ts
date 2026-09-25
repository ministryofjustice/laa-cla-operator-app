import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";

/**
 * Check whether a value matches the Axios middleware wrapper shape used by this app.
 * @param {unknown} value The unknown value to validate.
 * @returns {boolean} True when the value can be treated as an AxiosInstanceWrapper.
 */
export function isAxiosInstanceWrapper(
  value: unknown,
): value is AxiosInstanceWrapper {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "axiosInstance" in value &&
    "get" in value
  );
}
