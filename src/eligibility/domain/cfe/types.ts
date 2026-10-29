// Shared types for the CFE payload builders (domain/cfe/). These describe
// the add-another list items CCQ's forms save to the session (ported from
// each model's `ATTRIBUTES`, see the individual builder files for which
// Ruby model each one mirrors), and the shape of the payload sent to CFE.
//
// `Answers` values are read defensively (an in-progress check may not have
// answered every question), so these item types describe what a *complete*
// row looks like; callers narrow with `asArray`.

/** Ported from CCQ's `BankAccountModel`. */
export interface BankAccount {
  amount: number;
  account_in_dispute?: boolean;
}

/** Ported from CCQ's `AdditionalPropertyModel`. */
export interface AdditionalPropertyItem {
  house_value: number;
  inline_owned_with_mortgage?: boolean;
  mortgage?: number;
  percentage_owned: number;
  house_in_dispute?: boolean;
}

/** Ported from CCQ's `IncomeModel`. */
export interface IncomeItem {
  income_type: "employment" | "statutory_pay" | "self_employment";
  income_frequency: string;
  gross_income: number;
  income_tax: number;
  national_insurance: number;
}

/** Ported from CCQ's `BenefitModel`. */
export interface BenefitItem {
  benefit_type: string;
  benefit_amount: number;
  benefit_frequency: string;
}

/** Ported from CCQ's `VehicleModel`. */
export interface VehicleItem {
  vehicle_value: number;
  vehicle_pcp: boolean;
  vehicle_finance?: number;
  vehicle_over_3_years_ago: boolean;
  vehicle_in_regular_use: boolean;
  vehicle_in_dispute?: boolean;
}

/** Ported from CCQ's `DependantIncomeModel`. */
export interface DependantIncomeItem {
  amount: number;
  frequency: string;
}

/**
 * Views a raw answer as an assumed type, trusting that the caller has
 * already confirmed (via `relevantSteps`) that the answer is present and
 * correctly typed. This is the single type-assertion boundary for this
 * module — every other read narrows safely via `typeof`/`Array.isArray`.
 * @param {unknown} value - a raw answer value
 * @returns {T} the value, viewed as `T`
 * @template T
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is intentionally caller-specified, not inferred
export function assumeType<T>(value: unknown): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- trust boundary, see function doc
  return value as T;
}

/**
 * Reads an answer that is expected to be a list of rows, defaulting to
 * empty.
 * @param {unknown} value - a raw answer value
 * @returns {T[]} the rows, or an empty array if unset
 * @template T
 */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? assumeType<T[]>(value) : [];
}

/**
 * Reads an answer that is expected to be a string, if it is one.
 * @param {unknown} value - a raw answer value
 * @returns {string | undefined} the string, or undefined
 */
export function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Reads an answer that is expected to be a number, if it is one.
 * @param {unknown} value - a raw answer value
 * @returns {number | undefined} the number, or undefined
 */
export function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/**
 * Reads an answer that is expected to be a boolean, if it is one.
 * @param {unknown} value - a raw answer value
 * @returns {boolean | undefined} the boolean, or undefined
 */
export function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** A single property entry in a CFE assessment payload. */
export interface PropertyPayload {
  value: number;
  outstanding_mortgage: number;
  percentage_owned: number;
  subject_matter_of_dispute: boolean;
  shared_with_housing_assoc: boolean;
}

/** A partner's additional property entry (no dispute fields — see assets.ts). */
export interface PartnerPropertyPayload {
  value: number;
  outstanding_mortgage: number;
  percentage_owned: number;
  shared_with_housing_assoc: boolean;
}

/** A single capital (bank account or non-liquid asset) entry. */
export interface CapitalPayload {
  value: number;
  description: string;
  subject_matter_of_dispute: boolean;
}

/** The client's or partner's capitals section. */
export interface CapitalsPayload {
  bank_accounts: CapitalPayload[];
  non_liquid_capital: CapitalPayload[];
}

/** A single employment or self-employment income entry. */
export interface EmploymentDetail {
  income: {
    frequency: string;
    gross: number;
    benefits_in_kind?: number;
    tax: number;
    national_insurance: number;
    receiving_only_statutory_sick_or_maternity_pay?: boolean;
  };
}

/** A single irregular income payment. */
export interface IrregularIncomePayment {
  income_type: "student_loan" | "unspecified_source";
  frequency: string;
  amount: number;
}

/** A single regular transaction (income, outgoing, housing or benefit). */
export interface RegularTransactionPayload {
  operation: "credit" | "debit";
  category: string;
  frequency: string;
  amount: number;
}

/** A single dependant entry. */
export interface DependantPayload {
  date_of_birth: string;
  in_full_time_education: boolean;
  relationship: "adult_relative" | "child_relative";
  assets_value: number;
  income?: { frequency: string; amount: number };
}

/** A single vehicle entry. */
export interface VehiclePayload {
  value: number;
  loan_amount_outstanding: number;
  date_of_purchase: string;
  in_regular_use: boolean;
  subject_matter_of_dispute: boolean;
}

/** A single proceeding type entry. */
export interface ProceedingTypePayload {
  ccms_code: string;
  client_involvement_type: "A";
}

/** The assessment section of a CFE payload. */
export interface AssessmentPayload {
  submission_date: string;
  level_of_help: string;
  controlled_legal_representation?: boolean;
  not_aggregated_no_income_low_capital?: boolean;
}

/** The applicant section of a CFE payload. */
export interface ApplicantPayload {
  date_of_birth: string;
  receives_qualifying_benefit?: boolean;
  receives_asylum_support?: boolean;
}

/** The properties section of a CFE payload. */
export interface PropertiesPayload {
  main_home: PropertyPayload;
  additional_properties?: PropertyPayload[];
}

/** The partner section of a CFE payload. */
export interface PartnerPayload {
  partner: { date_of_birth: string; employed: boolean };
  irregular_incomes: IrregularIncomePayment[];
  employment_details: EmploymentDetail[];
  self_employment_details: EmploymentDetail[];
  regular_transactions: RegularTransactionPayload[];
  additional_properties: PartnerPropertyPayload[];
  dependants: never[];
  vehicles: never[];
  capitals?: CapitalsPayload;
}

/** The full CFE assessment payload `buildAssessment` produces. */
export interface CfePayload {
  assessment?: AssessmentPayload;
  dependants?: DependantPayload[];
  proceeding_types?: ProceedingTypePayload[];
  employment_details?: EmploymentDetail[];
  self_employment_details?: EmploymentDetail[];
  irregular_incomes?: { payments: IrregularIncomePayment[] };
  vehicles?: VehiclePayload[];
  capitals?: CapitalsPayload;
  properties?: PropertiesPayload;
  regular_transactions?: RegularTransactionPayload[];
  applicant?: ApplicantPayload;
  partner?: PartnerPayload;
}
