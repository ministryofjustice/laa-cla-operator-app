import {
  createCase,
  getAllCases,
  updatePersonalDetails,
  searchCases,
  loadCase,
} from "./caseDetailsService.js";

export * from "./baseApiService.js";
export * from "./caseDetailsService.js";

export const apiService = {
  getAllCases,
  updatePersonalDetails,
  searchCases,
  createCase,
  loadCase,
  /* c8 ignore next */
};
