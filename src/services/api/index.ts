import {
  createCase,
  getAllCases,
  updatePersonalDetails,
  searchCases,
  loadCase,
  saveAdaptationDetails,
  getFinancialEligibility,
  updateFinancialEligibility,
} from "./caseDetailsService.js";
import { getBenefitTypeSuggestions } from "#src/services/cfeBenefitTypesClient.js";

export * from "./baseApiService.js";
export * from "./caseDetailsService.js";

export const apiService = {
  getAllCases,
  updatePersonalDetails,
  searchCases,
  createCase,
  loadCase,
  saveAdaptationDetails,
  getFinancialEligibility,
  updateFinancialEligibility,
  getBenefitTypeSuggestions,

  /* c8 ignore next */
};
