import { createCase, getAllCases, updatePersonalDetails, searchCases } from './caseDetailsService.js';

export * from './baseApiService.js'
export * from './caseDetailsService.js'

export const apiService = { getAllCases, updatePersonalDetails, searchCases, createCase }