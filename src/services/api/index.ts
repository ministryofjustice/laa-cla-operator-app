import {
  createCase,
  getAllCases,
  updatePersonalDetails,
  searchCases,
  loadCase,
  adaptationDetails,
} from "./caseDetailsService.js";

export * from "./baseApiService.js";
export * from "./caseDetailsService.js";

export const apiService = {
  getAllCases,
  updatePersonalDetails,
  searchCases,
  createCase,
  loadCase,
  adaptationDetails,

  /* c8 ignore next */
};
