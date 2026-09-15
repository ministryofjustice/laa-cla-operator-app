/**
 * Base API Service
 * Provides shared utilities for all API services
 */

import type { AxiosInstanceWrapper } from '#types/axios-instance-wrapper.js';
import { extractAndLogError } from '#src/scripts/helpers/index.js';
import config from '../../../config.js';

/**
 * Generic API call wrapper with error handling
 * @template T
 * @param {Function} apiCall - Async function that makes the API call
 * @param {string} errorContext - Context for error logging
 * @returns {Promise<T>} API response
 */
export async function handleApiCall<T>(
  apiCall: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    const errorMessage = extractAndLogError(error, errorContext);
    throw new Error(errorMessage, { cause: error });
  }
}

/**
 * Configure axios instance with API credentials and headers
 * @param {AxiosInstanceWrapper} axiosMiddleware - Axios middleware from request
 * @returns {AxiosInstanceWrapper} Configured axios instance
 */
export function configureAxiosInstance(axiosMiddleware: AxiosInstanceWrapper): AxiosInstanceWrapper {
  // Override base URL and add API-specific headers
  const { axiosInstance } = axiosMiddleware;
  const { defaults } = axiosInstance;
  const { api: { baseUrl } } = config;

  // Safely configure axios defaults
  if (typeof baseUrl === 'string') {
    defaults.baseURL = baseUrl;
  }

  defaults.headers.common['Content-Type'] = 'application/json';
  defaults.headers.common.Accept = 'application/json';

  return axiosMiddleware;
}