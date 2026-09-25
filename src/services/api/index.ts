import { createCase, getAllCases, updatePersonalDetails, searchCases, loadCase } from './caseDetailsService.js';

export * from './baseApiService.js'
export * from './caseDetailsService.js'

export const apiService = { getAllCases, loadCase, updatePersonalDetails, searchCases, createCase }