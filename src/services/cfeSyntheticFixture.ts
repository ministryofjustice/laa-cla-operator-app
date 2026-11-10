import type { CfeAssessmentRequest } from "./cfeClient.js";

const SYNTHETIC_DATE_OF_BIRTH = "1980-01-01";
const SYNTHETIC_PROCEEDING_CODE = "DA001";
const SYNTHETIC_CLIENT_INVOLVEMENT = "A";
const ISO_DATE_START_INDEX = 0;
const ISO_DATE_END_INDEX = 10;

/**
 * Creates the documented synthetic controlled-work payload for CFE staging.
 * @param {string} submissionDate Synthetic submission date.
 * @returns {CfeAssessmentRequest} Fixed test data with no case or client identifiers.
 */
export function createSyntheticCfeAssessment(
  submissionDate = new Date()
    .toISOString()
    .slice(ISO_DATE_START_INDEX, ISO_DATE_END_INDEX),
): CfeAssessmentRequest {
  return {
    assessment: {
      submission_date: submissionDate,
      level_of_help: "controlled",
      controlled_legal_representation: false,
      section_gross_income: "complete",
      section_disposable_income: "complete",
      section_capital: "complete",
    },
    applicant: {
      date_of_birth: SYNTHETIC_DATE_OF_BIRTH,
      receives_qualifying_benefit: false,
      receives_asylum_support: false,
    },
    proceeding_types: [
      {
        ccms_code: SYNTHETIC_PROCEEDING_CODE,
        client_involvement_type: SYNTHETIC_CLIENT_INVOLVEMENT,
      },
    ],
    capitals: {
      bank_accounts: [],
    },
    cash_transactions: {
      income: [],
      outgoings: [],
    },
  };
}
