import {
  createCase,
  getAllCases,
  loadCase,
  updatePersonalDetails,
  searchCases,
} from "./caseDetailsService.js";

export * from "./baseApiService.js";
export * from "./caseDetailsService.js";

export const apiService = {
  getAllCases,
  loadCase,
  updatePersonalDetails,
  searchCases,
  createCase,
  /* c8 ignore next */
};
