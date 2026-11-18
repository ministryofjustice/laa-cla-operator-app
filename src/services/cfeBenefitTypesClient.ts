import {
  CfeClientError,
  DEFAULT_CFE_STAGING_ORIGIN,
} from "#src/services/cfeClient.js";

interface CfeStateBenefitType {
  name: string;
  label: string;
  exclude_from_gross_income?: boolean;
}

interface CfeBenefitTypesClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface CfeStateBenefitTypesResponse {
  responseBody: unknown;
  status: number;
}

const STATE_BENEFIT_TYPES_PATH = "/state_benefit_type";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1;
const SUCCESS_STATUS = 200;
const BENEFITS_TO_OMIT = new Set([
  "age_related_payment",
  "universal_credit",
  "income_support",
  "jobseekers_allowance",
  "employment_support_allowance",
  "pension_credit",
  "guaranteed_min_pension",
  "state_pension",
  "state_second_pension",
]);

/**
 * Checks that a value is a non-array object.
 * @param {unknown} value Candidate response value.
 * @returns {boolean} True for a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks that a CFE benefit reference record has the fields used by CCQ.
 * @param {unknown} value Candidate response record.
 * @returns {boolean} True for a valid benefit reference record.
 */
function isCfeStateBenefitType(value: unknown): value is CfeStateBenefitType {
  if (!isRecord(value)) return false;

  const { name, label, exclude_from_gross_income: excluded } = value;
  return (
    typeof name === "string" &&
    typeof label === "string" &&
    (excluded === undefined || typeof excluded === "boolean")
  );
}

/**
 * Parses the configured staging URL.
 * @param {string} baseUrl Configured CFE origin.
 * @returns {URL} Parsed staging URL.
 */
function parseStagingUrl(baseUrl: string): URL {
  try {
    return new URL(baseUrl);
  } catch (error) {
    throw new CfeClientError(
      "configuration",
      "CFE benefit reference data is restricted to the CFE staging origin.",
      undefined,
      { cause: error },
    );
  }
}

/**
 * Validates the configured staging URL and returns the fixed CFE reference endpoint.
 * @param {string} baseUrl Configured origin.
 * @returns {string} The validated state-benefit endpoint.
 */
function getStateBenefitTypesUrl(baseUrl: string): string {
  const url = parseStagingUrl(baseUrl);

  if (
    url.origin !== DEFAULT_CFE_STAGING_ORIGIN ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new CfeClientError(
      "configuration",
      "CFE benefit reference data is restricted to the CFE staging origin.",
    );
  }

  return `${DEFAULT_CFE_STAGING_ORIGIN}${STATE_BENEFIT_TYPES_PATH}`;
}

/**
 * Gets and validates the configured request timeout.
 * @param {number | undefined} configuredTimeout Optional timeout override.
 * @returns {number} Valid request timeout in milliseconds.
 */
function getTimeoutMs(configuredTimeout: number | undefined): number {
  const timeoutMs =
    configuredTimeout ??
    Number(process.env.CFE_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < MIN_TIMEOUT_MS ||
    timeoutMs > MAX_TIMEOUT_MS
  ) {
    throw new CfeClientError(
      "configuration",
      `CFE timeout must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS} milliseconds.`,
    );
  }
  return timeoutMs;
}

/**
 * Converts fetch failures into explicitly classified CFE client errors.
 * @param {unknown} error Original fetch error.
 * @returns {never} Always throws a classified error.
 */
function throwFetchError(error: unknown): never {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    throw new CfeClientError(
      "timeout",
      "The CFE staging benefit-reference request timed out. No benefit suggestions were returned.",
      undefined,
      { cause: error },
    );
  }

  throw new CfeClientError(
    "network",
    "The CFE staging service could not be reached for benefit suggestions.",
    undefined,
    { cause: error },
  );
}

/**
 * Parses JSON from a successful CFE reference-data response.
 * @param {Response} response Successful CFE response.
 * @returns {Promise<unknown>} Parsed response body.
 */
async function parseResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new CfeClientError(
      "invalid-response",
      "CFE staging returned invalid JSON for benefit reference data.",
      response.status,
      { cause: error },
    );
  }
}

/**
 * Requests the CFE state-benefit reference list.
 * @param {string} url Validated CFE reference endpoint.
 * @param {number} timeoutMs Request timeout in milliseconds.
 * @param {typeof fetch} fetchImpl Fetch implementation.
 * @returns {Promise<unknown>} Unvalidated response body.
 */
async function requestStateBenefitTypes(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<CfeStateBenefitTypesResponse> {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(throwFetchError);

  if (response.status !== SUCCESS_STATUS) {
    throw new CfeClientError(
      "http",
      `CFE staging returned HTTP ${response.status} for benefit reference data.`,
      response.status,
    );
  }

  return {
    responseBody: await parseResponseBody(response),
    status: response.status,
  };
}

/**
 * Validates the response and returns unique benefit names used by CCQ.
 * @param {unknown} responseBody Unvalidated CFE response body.
 * @param {number} status HTTP status for the successful response.
 * @returns {string[]} Names excluding CCQ's disregarded values.
 */
function getBenefitNames(responseBody: unknown, status: number): string[] {
  if (
    !Array.isArray(responseBody) ||
    !responseBody.every(isCfeStateBenefitType)
  ) {
    throw new CfeClientError(
      "invalid-response",
      "CFE staging returned invalid state-benefit reference data.",
      status,
    );
  }

  return [
    ...new Set(
      responseBody
        .filter(
          ({ exclude_from_gross_income: excluded, label }) =>
            excluded !== true && !BENEFITS_TO_OMIT.has(label),
        )
        .map(({ name }) => name),
    ),
  ];
}

/**
 * Retrieves unique, applicable benefit names for the controlled-work type-ahead field.
 * @param {CfeBenefitTypesClientOptions} options Optional endpoint, timeout, and fetch implementation.
 * @returns {Promise<string[]>} Benefit names excluding CCQ's disregarded values.
 */
export async function getBenefitTypeSuggestions(
  options: CfeBenefitTypesClientOptions = {},
): Promise<string[]> {
  const timeoutMs = getTimeoutMs(options.timeoutMs);
  const url = getStateBenefitTypesUrl(
    options.baseUrl ??
      process.env.CFE_API_BASE_URL ??
      DEFAULT_CFE_STAGING_ORIGIN,
  );
  const { responseBody, status } = await requestStateBenefitTypes(
    url,
    timeoutMs,
    options.fetchImpl ?? fetch,
  );

  return getBenefitNames(responseBody, status);
}
