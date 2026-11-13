export type CfeOverallResult =
  "eligible" | "ineligible" | "contribution_required" | "partially_eligible";

export type CfePartialResult =
  CfeOverallResult | "not_yet_known" | "not_calculated";

export interface CfeAssessmentRequest {
  assessment: {
    submission_date: string;
    level_of_help: "controlled";
    controlled_legal_representation: boolean;
    section_gross_income: "complete";
    section_disposable_income: "complete";
    section_capital: "complete";
  };
  applicant: {
    date_of_birth: string;
    receives_qualifying_benefit: boolean;
    receives_asylum_support: boolean;
  };
  proceeding_types: Array<{
    ccms_code: string;
    client_involvement_type: string;
  }>;
  capitals: {
    bank_accounts: Array<{
      value: number;
      description: string;
      subject_matter_of_dispute: boolean;
    }>;
  };
  cash_transactions: {
    income: Array<{
      category:
        | "benefits"
        | "friends_or_family"
        | "maintenance_in"
        | "property_or_lodger"
        | "pension";
      payments: Array<{
        date: string;
        amount: number;
        client_id: string;
      }>;
    }>;
    outgoings: Array<{
      category:
        | "child_care"
        | "rent_or_mortgage"
        | "maintenance_out"
        | "legal_aid"
        | "pension_contribution"
        | "council_tax"
        | "priority_debt_repayment";
      payments: Array<{
        date: string;
        amount: number;
        client_id: string;
      }>;
    }>;
  };
}

export interface CfeProceedingResult {
  ccms_code: string;
  client_involvement_type: string;
  upper_threshold: number;
  lower_threshold: number;
  result: CfePartialResult;
}

export interface CfeIncomeBreakdown {
  total_gross_income: number;
  combined_total_gross_income: number;
  proceeding_types: CfeProceedingResult[];
}

export interface CfeDisposableIncomeBreakdown {
  total_disposable_income?: number;
  total_outgoings_and_allowances?: number;
  income_contribution?: number;
  combined_total_disposable_income?: number;
  combined_total_outgoings_and_allowances?: number;
  proceeding_types?: CfeProceedingResult[];
  [key: string]: unknown;
}

export interface CfeCapitalBreakdown {
  total_liquid?: number;
  total_non_liquid?: number;
  total_vehicle?: number;
  total_property?: number;
  total_capital?: number;
  total_capital_with_smod?: number;
  assessed_capital?: number;
  capital_contribution?: number;
  combined_assessed_capital?: number;
  proceeding_types?: CfeProceedingResult[];
  [key: string]: unknown;
}

export interface CfeAssessmentResponse {
  timestamp: string;
  version: "7";
  success: true;
  result_summary: {
    overall_result: {
      result: CfeOverallResult;
      capital_contribution: number;
      income_contribution: number;
      proceeding_types: CfeProceedingResult[];
    };
    gross_income: CfeIncomeBreakdown;
    disposable_income: CfeDisposableIncomeBreakdown;
    capital: CfeCapitalBreakdown;
    partner_gross_income?: {
      total_gross_income: number;
    };
    partner_disposable_income?: CfeDisposableIncomeBreakdown;
    partner_capital?: CfeCapitalBreakdown;
  };
  assessment: {
    id?: string;
    level_of_help?: "controlled" | "certificated";
    remarks?: Record<string, unknown>;
  };
}

export type CfeClientErrorCode =
  "configuration" | "timeout" | "network" | "http" | "invalid-response";

/**
 * Represents a safe, classified failure from a CFE assessment request.
 */
export class CfeClientError extends Error {
  /**
   * Creates a typed client error for configuration, transport, or response failures.
   * @param {CfeClientErrorCode} code Failure category.
   * @param {string} message Safe diagnostic message.
   * @param {number | undefined} status HTTP status when CFE returned a non-success response.
   * @param {ErrorOptions | undefined} options Underlying failure cause.
   */
  constructor(
    public readonly code: CfeClientErrorCode,
    message: string,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CfeClientError";
  }
}

const STAGING_ORIGIN =
  "https://cfe-civil-staging.cloud-platform.service.justice.gov.uk";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1;
const SUCCESS_STATUS = 200;
const MIN_PROCEEDING_RESULTS = 1;
const OPTIONAL_NUMERIC_RESULT_FIELDS = [
  "total_disposable_income",
  "total_outgoings_and_allowances",
  "income_contribution",
  "combined_total_disposable_income",
  "combined_total_outgoings_and_allowances",
];
const OPTIONAL_CAPITAL_RESULT_FIELDS = [
  "total_liquid",
  "total_non_liquid",
  "total_vehicle",
  "total_property",
  "total_capital",
  "total_capital_with_smod",
  "assessed_capital",
  "capital_contribution",
  "combined_assessed_capital",
];
const OVERALL_RESULTS = [
  "eligible",
  "ineligible",
  "contribution_required",
  "partially_eligible",
] as const;
const PARTIAL_RESULTS = [
  ...OVERALL_RESULTS,
  "not_yet_known",
  "not_calculated",
] as const;

export interface CfeClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Checks whether a value is a non-array object.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True for a non-null object.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Checks that a value is a finite numeric result.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True for a finite number.
 */
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Checks that a value is a string.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True for a string.
 */
const isString = (value: unknown): value is string => typeof value === "string";

/**
 * Checks a CFE partial-result value against the v7 enum.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True for a documented partial-result value.
 */
const isPartialResult = (value: unknown): value is CfePartialResult =>
  typeof value === "string" &&
  PARTIAL_RESULTS.some((candidate) => candidate === value);

/**
 * Checks whether a value contains only JSON-compatible data.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True for JSON-compatible data.
 */
const isJsonValue = (value: unknown): boolean => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    isNumber(value)
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isRecord(value) && Object.values(value).every(isJsonValue);
};

/**
 * Validates one CFE result for a requested proceeding.
 * @param {unknown} value Candidate result.
 * @returns {boolean} True for a valid proceeding result.
 */
const isProceedingResult = (value: unknown): value is CfeProceedingResult =>
  isRecord(value) &&
  isString(value.ccms_code) &&
  isString(value.client_involvement_type) &&
  isNumber(value.upper_threshold) &&
  isNumber(value.lower_threshold) &&
  isPartialResult(value.result);

/**
 * Validates the non-empty proceeding result arrays returned by CFE.
 * @param {unknown} value Candidate result list.
 * @returns {boolean} True for a non-empty list of valid results.
 */
const isProceedingResults = (value: unknown): value is CfeProceedingResult[] =>
  Array.isArray(value) &&
  value.length >= MIN_PROCEEDING_RESULTS &&
  value.every(isProceedingResult);

/**
 * Validates an optional numeric field in a response section.
 * @param {Record<string, unknown>} record Response section.
 * @param {string} key Field name to validate.
 * @returns {boolean} True when the field is absent or numeric.
 */
const isNumberIfPresent = (
  record: Record<string, unknown>,
  key: string,
): boolean => record[key] === undefined || isNumber(record[key]);

/**
 * Validates the required gross-income summary fields.
 * @param {unknown} value Candidate section.
 * @returns {boolean} True for a valid gross-income section.
 */
const isIncomeBreakdown = (value: unknown): value is CfeIncomeBreakdown =>
  isRecord(value) &&
  isNumber(value.total_gross_income) &&
  isNumber(value.combined_total_gross_income) &&
  isProceedingResults(value.proceeding_types);

/**
 * Validates the typed disposable-income fields returned when available.
 * @param {unknown} value Candidate section.
 * @returns {boolean} True when its documented numeric fields are valid.
 */
const isDisposableIncomeBreakdown = (
  value: unknown,
): value is CfeDisposableIncomeBreakdown =>
  isRecord(value) &&
  OPTIONAL_NUMERIC_RESULT_FIELDS.every((key) =>
    isNumberIfPresent(value, key),
  ) &&
  (value.proceeding_types === undefined ||
    isProceedingResults(value.proceeding_types));

/**
 * Validates the typed capital fields returned when available.
 * @param {unknown} value Candidate section.
 * @returns {boolean} True when its documented numeric fields are valid.
 */
const isCapitalBreakdown = (value: unknown): value is CfeCapitalBreakdown =>
  isRecord(value) &&
  OPTIONAL_CAPITAL_RESULT_FIELDS.every((key) =>
    isNumberIfPresent(value, key),
  ) &&
  (value.proceeding_types === undefined ||
    isProceedingResults(value.proceeding_types));

/**
 * Validates the overall-result summary against the documented v7 response.
 * @param {unknown} value Candidate result summary.
 * @returns {boolean} True for a valid overall-result section.
 */
const isOverallResultSummary = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.result === "string" &&
    OVERALL_RESULTS.some((candidate) => candidate === value.result) &&
    isNumber(value.capital_contribution) &&
    isNumber(value.income_contribution) &&
    isProceedingResults(value.proceeding_types)
  );
};

/**
 * Validates assessment metadata used by the synthetic result page.
 * @param {unknown} value Candidate assessment metadata.
 * @returns {boolean} True when metadata and optional remarks are valid.
 */
const isAssessmentMetadata = (value: unknown): boolean =>
  isRecord(value) &&
  (value.level_of_help === undefined || value.level_of_help === "controlled") &&
  (value.id === undefined || isString(value.id)) &&
  (value.remarks === undefined ||
    (isRecord(value.remarks) && isJsonValue(value.remarks)));

/**
 * Validates all required and optional financial summary sections.
 * @param {unknown} value Candidate summary.
 * @returns {boolean} True when all present sections match their response contracts.
 */
const isFinancialSummary = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  const {
    overall_result: overallResult,
    gross_income: grossIncome,
    disposable_income: disposableIncome,
    capital,
  } = value;

  return (
    isOverallResultSummary(overallResult) &&
    isIncomeBreakdown(grossIncome) &&
    isDisposableIncomeBreakdown(disposableIncome) &&
    isCapitalBreakdown(capital) &&
    isPartnerSummary(value)
  );
};

/**
 * Validates optional partner sections when CFE includes them.
 * @param {Record<string, unknown>} summary Validated result-summary object.
 * @returns {boolean} True when every present partner section is valid.
 */
const isPartnerSummary = (summary: Record<string, unknown>): boolean => {
  const {
    partner_gross_income: partnerGrossIncome,
    partner_disposable_income: partnerDisposableIncome,
    partner_capital: partnerCapital,
  } = summary;
  const validGrossIncome =
    partnerGrossIncome === undefined ||
    (isRecord(partnerGrossIncome) &&
      isNumber(partnerGrossIncome.total_gross_income));
  const validDisposableIncome =
    partnerDisposableIncome === undefined ||
    isDisposableIncomeBreakdown(partnerDisposableIncome);
  const validCapital =
    partnerCapital === undefined || isCapitalBreakdown(partnerCapital);

  return validGrossIncome && validDisposableIncome && validCapital;
};

/**
 * Validates the complete subset of the v7 response consumed by the application.
 * @param {unknown} value Candidate response.
 * @returns {boolean} True when all displayed result fields are valid.
 */
const isCfeAssessmentResponse = (
  value: unknown,
): value is CfeAssessmentResponse => {
  if (!isRecord(value) || value.success !== true || value.version !== "7") {
    return false;
  }

  const { timestamp, assessment, result_summary: resultSummary } = value;
  return (
    isString(timestamp) &&
    isAssessmentMetadata(assessment) &&
    isFinancialSummary(resultSummary)
  );
};

/**
 * Parses the configured URL and returns a safe staging origin.
 * @param {string} baseUrl Configured origin.
 * @returns {URL} Parsed staging URL.
 */
const parseStagingUrl = (baseUrl: string): URL => {
  try {
    return new URL(baseUrl);
  } catch (error) {
    throw new CfeClientError(
      "configuration",
      "CFE base URL must be the CFE staging origin.",
      undefined,
      { cause: error },
    );
  }
};

/**
 * Creates the only assessment URL accepted by this staging-only client.
 * @param {string} baseUrl Configured origin.
 * @returns {string} The fixed v7 assessment endpoint.
 */
const getAssessmentUrl = (baseUrl: string): string => {
  const url = parseStagingUrl(baseUrl);

  if (
    url.origin !== STAGING_ORIGIN ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new CfeClientError(
      "configuration",
      "Synthetic CFE assessments are restricted to the CFE staging origin.",
    );
  }

  return `${STAGING_ORIGIN}/v7/assessments`;
};

/**
 * A typed HTTP client for controlled-work submissions to CFE staging.
 */
export class CfeClient {
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  /**
   * Creates a CFE client restricted to the documented staging origin.
   * @param options Optional endpoint, timeout, and fetch implementation.
   */
  /**
   * Creates a CFE client restricted to the documented staging origin.
   * @param {CfeClientOptions} options Optional endpoint, timeout, and fetch implementation.
   */
  constructor(options: CfeClientOptions = {}) {
    this.url = getAssessmentUrl(options.baseUrl ?? STAGING_ORIGIN);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;

    if (
      !Number.isSafeInteger(this.timeoutMs) ||
      this.timeoutMs < MIN_TIMEOUT_MS ||
      this.timeoutMs > MAX_TIMEOUT_MS
    ) {
      throw new CfeClientError(
        "configuration",
        `CFE timeout must be between 1 and ${MAX_TIMEOUT_MS} milliseconds.`,
      );
    }
  }

  /**
   * Submits one assessment and validates CFE's v7 response without retrying.
   * @param {CfeAssessmentRequest} assessment Assessment request body.
   * @returns {Promise<CfeAssessmentResponse>} The validated CFE v7 response.
   */
  async submitAssessment(
    assessment: CfeAssessmentRequest,
  ): Promise<CfeAssessmentResponse> {
    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assessment),
      signal: AbortSignal.timeout(this.timeoutMs),
    }).catch((error: unknown): never => {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new CfeClientError(
          "timeout",
          "The CFE staging request timed out. No assessment result was returned.",
          undefined,
          { cause: error },
        );
      }

      throw new CfeClientError(
        "network",
        "The CFE staging service could not be reached. No assessment result was returned.",
        undefined,
        { cause: error },
      );
    });

    if (response.status !== SUCCESS_STATUS) {
      throw new CfeClientError(
        "http",
        `CFE staging returned HTTP ${response.status}. No assessment result was returned.`,
        response.status,
      );
    }

    const responseBody = await parseJsonResponse(response);

    if (!isCfeAssessmentResponse(responseBody)) {
      throw new CfeClientError(
        "invalid-response",
        "CFE staging returned a response that does not match the v7 contract.",
        response.status,
      );
    }

    return responseBody;
  }
}

/**
 * Parses a successful response body and maps JSON parsing failures explicitly.
 * @param {Response} response Successful CFE response.
 * @returns {Promise<unknown>} Parsed response body.
 */
const parseJsonResponse = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    throw new CfeClientError(
      "invalid-response",
      "CFE staging returned invalid JSON. No assessment result was returned.",
      response.status,
      { cause: error },
    );
  }
};

export const DEFAULT_CFE_STAGING_ORIGIN = STAGING_ORIGIN;
