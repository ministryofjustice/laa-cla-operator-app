import {
  createCase,
  getAllCases,
  updatePersonalDetails,
  searchCases,
  loadCase,
  saveAdaptationDetails,
  loadPersonalDetails,
} from "./caseDetailsService.js";

export * from "./baseApiService.js";
export * from "./caseDetailsService.js";

export const apiService = {
  getAllCases,
  updatePersonalDetails,
  searchCases,
  createCase,
  loadCase,
  loadPersonalDetails,
  saveAdaptationDetails,

  /* c8 ignore next */
};
