import type { AxiosInstanceWrapper } from '#types/axios-instance-wrapper.js';
import type { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { devLog, devError } from '#src/scripts/helpers/index.js';

const HTTP_UNAUTHORIZED = 401;

export interface ApiAuthService {
  getAuthHeader: () => Promise<string>;
  clearTokens: () => void;
}

/**
 * Convert an unknown error value into an Error instance.
 *
 * @param {unknown} error - The value to convert into an Error.
 * @returns {Error} An Error instance.
 */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Check whether an unknown error is an Axios error with an HTTP response.
 *
 * @param {unknown} error - The error value to inspect.
 * @returns {boolean} True when the error contains an Axios response with a numeric status.
 */
function isAxiosErrorWithResponse(
  error: unknown
): error is AxiosError & { response: { status: number } } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  );
}

/**
 * Register request/response interceptors for API diagnostics logging.
 *
 * @param {AxiosInstanceWrapper} axiosWrapper - Axios wrapper to augment with logging interceptors.
 */
export function addLoggingInterceptors(
  axiosWrapper: AxiosInstanceWrapper
): void {
  axiosWrapper.axiosInstance.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      devLog(
        `API Request: ${requestConfig.method?.toUpperCase()} ` +
          `${requestConfig.baseURL ?? ''}${requestConfig.url ?? ''}`
      );

      return requestConfig;
    },
    async (error: unknown) => {
      const requestError = toError(error);

      devError(`API Request Error: ${requestError.message}`);

      return await Promise.reject(requestError);
    }
  );

  axiosWrapper.axiosInstance.interceptors.response.use(
    (response) => {
      devLog(
        `API Response: ${response.status} ` +
          `${response.config.method?.toUpperCase()} ` +
          `${response.config.url}`
      );

      return response;
    },
    async (error: unknown) => {
      if (isAxiosErrorWithResponse(error)) {
        devError(
          `API Response Error: ${error.response.status} ` +
            `${error.config?.method?.toUpperCase()} ` +
            `${error.config?.url}`
        );
      } else {
        const responseError = toError(error);

        devError(`API Network Error: ${responseError.message}`);
      }

      return await Promise.reject(toError(error));
    }
  );
}

/**
 * Register authentication and unauthorized-response interceptors.
 *
 * @param {AxiosInstanceWrapper} axiosWrapper - Axios wrapper to augment with auth interceptors.
 * @param {ApiAuthService} authService - Service that provides and clears authentication tokens.
 * @param {boolean} enableLogging - Whether auth-related diagnostic logging is enabled.
 */
export function addAuthServiceInterceptors(
  axiosWrapper: AxiosInstanceWrapper,
  authService: ApiAuthService,
  enableLogging: boolean
): void {
  axiosWrapper.axiosInstance.interceptors.request.use(
    async (requestConfig: InternalAxiosRequestConfig) => {
      try {
        requestConfig.headers.Authorization =
          await authService.getAuthHeader();

        if (enableLogging) {
          devLog(
            'Added JWT authorization header to API request'
          );
        }
      } catch (error) {
        const authError = toError(error);

        devError(
          `Failed to add JWT authorization header: ${authError.message}`
        );
      }

      return requestConfig;
    },
    async (error: unknown) => await Promise.reject(toError(error))
  );

  axiosWrapper.axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (
        isAxiosErrorWithResponse(error) &&
        error.response.status === HTTP_UNAUTHORIZED
      ) {
        if (enableLogging) {
          devError(
            'API returned 401 Unauthorized - clearing cached tokens'
          );
        }

        authService.clearTokens();
      }

      return await Promise.reject(toError(error));
    }
  );
}

/**
 * Register a request interceptor that injects the SILAS bearer token.
 *
 * @param {AxiosInstanceWrapper} axiosWrapper - Axios wrapper to augment with a session token interceptor.
 * @param {string} accessToken - SILAS access token from the current user session.
 * @param {boolean} enableLogging - Whether token-injection diagnostic logging is enabled.
 */
export function addSessionSilasTokenInterceptor(
  axiosWrapper: AxiosInstanceWrapper,
  accessToken: string,
  enableLogging: boolean
): void {
  axiosWrapper.axiosInstance.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      requestConfig.headers.Authorization = `Bearer ${accessToken}`;

      if (enableLogging) {
        devLog('Added SILAS bearer token to API request');
      }

      return requestConfig;
    },
    async (error: unknown) => await Promise.reject(toError(error))
  );
}
