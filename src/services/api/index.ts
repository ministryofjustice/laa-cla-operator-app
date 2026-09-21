import { createCase, getAllCases, updatePersonalDetails, searchCasesWithContactDetails } from './caseDetailsService.js';

export * from './baseApiService.js'
export * from './caseDetailsService.js'

export const apiService = { getAllCases, updatePersonalDetails, searchCasesWithContactDetails, createCase }