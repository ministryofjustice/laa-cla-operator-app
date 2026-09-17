import { postcodeLookup } from '../postcodeLookup.js';
import { getAllCases } from './caseDetailsService.js';

export * from './baseApiService.js'
export * from './caseDetailsService.js'

export const apiService = { getAllCases }
export const apiPostcodeService = {lookup: postcodeLookup}