/**
 * API Types
 *
 * This file contains all TypeScript interfaces and types related to API requests and responses.
 * These types are used across different services and components for consistent API interactions.
 */

export interface CaseDetails {
  reference: string;
  created: string;
  modified: string;
  full_name: string;
  laa_reference: number;
  eligibility_state: string | null;
  personal_details: string;
  requires_action_by: string | null;
  postcode: string;
  mobile_phone: string;
  rejected: boolean;
  date_of_birth: string;
  category: string | null;
  outcome_code: string;
  outcome_description: string;
  case_count: number;
  source: string;
  requires_action_at: string | null;
  callback_time_string: string | null;
  flagged_with_eod: boolean;
  is_urgent: boolean;
  organisation_name: string | null;
  adaptation_details?: string | null;
  eligibility_check?: string | null;
}

export interface GetAllCasesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CaseDetails[];
}

export interface SearchCasesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CaseDetails[];
}

export interface SearchCasesParams {
  query: string;
  pageSize?: number;
  pageNumber?: number;
}

export interface saveAdaptationDetailsParams {
  bsl_webcam?: boolean;
  minicom?: boolean;
  text_relay?: boolean;
  skype_webcam?: boolean;

  language?: string | null;
  notes?: string;
  callback_preference?: boolean;
  no_adaptations_required?: boolean | null;
}

export interface saveAdaptationDetailsResponse {
  bsl_webcam: boolean;
  minicom: boolean;
  text_relay: boolean;
  skype_webcam: boolean;
  language: string | null;
  notes: string;
  reference: string;
  callback_preference: boolean;
  no_adaptations_required: boolean | null;
}

/**
 * API response wrapper for a single case (client details)
 */
export interface ClientDetailsApiResponse {
  data: CaseDetails | null;
  status: "success" | "error";
  message?: string;
}

/**
 * Interface for money per interval object
 */
export interface MoneyPerInterval {
  amount: number | null;
  time:
    "per_month" | "per_year" | "per_week" | "per_4week" | "per_2week" | null;
}

/**
 * Interface for savings data
 */
export interface SavingsData {
  bankBalance: number;
  investmentBalance: number;
  assetBalance: number;
  creditBalance: number;
  total: number;
}

/**
 * Interface for disputed savings data, where each field stays null until answered
 */
export interface DisputedSavingsData {
  bankBalance: number | null;
  investmentBalance: number | null;
  assetBalance: number | null;
  creditBalance: number | null;
  total: number | null;
}

/**
 * Interface for deduction data
 */
export interface DeductionData {
  incomeTax: MoneyPerInterval;
  nationalInsurance: MoneyPerInterval;
  maintenance: MoneyPerInterval;
  childcare: MoneyPerInterval;
  mortgage: MoneyPerInterval;
  rent: MoneyPerInterval;
  criminalContributions: MoneyPerInterval;
  total: number;
}

/**
 * Interface for income data
 */
export interface IncomeData {
  earnings: MoneyPerInterval;
  selfEmploymentDrawings: MoneyPerInterval;
  benefits: MoneyPerInterval;
  taxCredits: MoneyPerInterval;
  childBenefit: MoneyPerInterval;
  maintenanceReceived: MoneyPerInterval;
  pension: MoneyPerInterval;
  otherIncome: MoneyPerInterval;
  selfEmployed: boolean;
  total: number;
}

/**
 * Interface for property data
 */
export interface PropertySetData {
  value: number;
  mortgageLeft: number;
  share: number;
  disputed: boolean;
  main: boolean;
}

/**
 * Interface for financial eligibility data
 */
export interface FinancialEligibilityData {
  hasPartner: boolean | null;
  isUnder17: boolean | null;
  isOver60: boolean | null;

  specificBenefits: {
    pensionCredit: boolean | null;
    jobSeekers: boolean | null;
    employmentSupport: boolean | null;
    universalCredit: boolean | null;
    incomeSupport: boolean | null;
  };
  propertySet: PropertySetData[];
  clientData: {
    income: IncomeData;
    savings: SavingsData | null;
    deductions: DeductionData;
  };
  partnerData: {
    partnerIncome: IncomeData;
    partnerSavings: SavingsData | null;
    partnerDeductions: DeductionData;
  };
  disputedSavings: DisputedSavingsData | null;
  disregards: string[];
  dependantsYoung: number;
  dependantsOld: number;
  under18RegularPayment?: boolean | null;
  under18HasValuables?: boolean | null;
  state: string;
  hasPassportedProceedingsLetter: boolean | null;
  passportedBenefits: boolean | null;
  under18passportedBenefits: boolean | null;
  category: string;
  nationalInsurance?: string;
}

/**
 * Response type for financial eligibility data
 */
export interface GetFinancialEligibilityApiResponse {
  data: FinancialEligibilityData | null;
  status: "success" | "error";
  message?: string;
}
