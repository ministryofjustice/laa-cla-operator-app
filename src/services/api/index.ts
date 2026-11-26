import {
  createCase,
  getAllCases,
  updatePersonalDetails,
  searchCases,
  loadCase,
  saveAdaptationDetails,
  getThirdpartyDetails,
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
  getThirdpartyDetails,

  /* c8 ignore next */
};
