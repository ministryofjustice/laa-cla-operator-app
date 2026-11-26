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
}

export interface ThirdPartyDetails {
  reference: string;
  personal_details: {
    reference: string;
    title: string | null;
    full_name: string | null;
    postcode: string | null;
    street: string | null;
    mobile_phone: string | null;
    home_phone: string;
    email: string;
    safe_to_contact: string | null;
    contact_for_research: boolean | null;
  };
  pass_phrase: string | null;
  reason: string | null;
  personal_relationship: string;
  personal_relationship_note: string;
  spoke_to: boolean | null;
  no_contact_reason: string | null;
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

export interface SaveAdaptationDetailsParams {
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
