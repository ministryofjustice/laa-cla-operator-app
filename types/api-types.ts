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