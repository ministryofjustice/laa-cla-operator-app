/**
 * API Types
 * 
 * This file contains all TypeScript interfaces and types related to API requests and responses.
 * These types are used across different services and components for consistent API interactions.
 */

/**
 * State note (transformed from state_note)
 */
export interface StateNote {
  code: string;
  created_by: string;
  created: string;
  notes: string;
  type: string;
}

/**
 * Client support needs (transformed from adaptation_details)
 */
export interface ClientSupportNeeds {
  bslWebcam: string;
  textRelay: string;
  callbackPreference: string;
  languageSupportNeeds: string;
  notes: string;
  no_adaptations_required: boolean;
}

/**
 * Third party contact (transformed from thirdparty_details)
 */
export interface ThirdPartyContact {
  fullName: string;
  contactNumber: string;
  safeToCall: boolean;
  emailAddress: string;
  address: string;
  postcode: string;
  relationshipToClient: string;
  noContactReason: string;
  passphrase: string;
  isSoftDeleted: boolean;
}

/**
 * Scope Traversal (transformed from scope_traversal)
 */
export interface ScopeTraversal {
  category: string;
  subCategory: string;
  onwardQuestion: Array<{
    question: string;
    answer: string;
  }>;
  financialAssessmentStatus: string;
  created: string;
}

/**
 * Diagnosis (transformed from diagnosis)
 */
export interface Diagnosis {
  category: string;
  diagnosisNode: Array<{ node: string; }>;
}

/**
 * Notes history (transformed from notes_history)
 */
export interface NotesHistory {
  createdBy: string;
  created: string;
  providerNotes: string;
}

/**
 * Client details API response interface
 */
export interface ClientDetailsResponse {
  //About the client
  caseReference: string;
  providerId: string;
  laaReference: string;
  fullName: string;
  dateOfBirth: string;
  caseStatus: string;
  provider_assigned_at: string;
  provider_viewed?: string;
  provider_accepted?: string;
  provider_closed?: string;
  outcome_code?: string;
  is_urgent?: string;
  client_notes?: string;
  operatorNotes?: string;
  category?: string;

  //Contact details
  phoneNumber: string;
  safeToCall: boolean;
  announceCall: boolean;
  emailAddress: string;
  address: string;
  postcode: string;

  //State note (null if not present)
  state_note: StateNote | null;

  //Client support needs (null if not present)
  clientSupportNeeds: ClientSupportNeeds | null;

  //Third party contact (null if not present)
  thirdParty: ThirdPartyContact | null;

  //Scope traversal (null if not present)
  scopeTraversal: ScopeTraversal | null;

  //Diagnosis (null if not present)
  diagnosis: Diagnosis | null;

  //Notes history (null if not present)
  notesHistory: NotesHistory[];

  // Allow additional fields for debugging
  [key: string]: unknown;
}

export interface SearchClientDetails {
  reference: string;
  created: string;
  modified: string;
  full_name: string;
  laa_reference: number;
  eligibility_state: string;
  personal_details: string;
  requires_action_by: string | null;
  postcode: string;
  rejected: boolean;
  date_of_birth: string;
  category: string;
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

export interface SearchClientDetailsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SearchClientDetails[];
}