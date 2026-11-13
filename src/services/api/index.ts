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

  /* c8 ignore next */
};
