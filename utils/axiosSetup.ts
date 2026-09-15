import { create } from 'middleware-axios';
import type { Request, Response, NextFunction } from 'express';
import type { AxiosInstanceWrapper } from '#types/axios-instance-wrapper.js';
import type { InternalAxiosRequestConfig } from 'axios';
import { devLog } from '#src/scripts/helpers/index.js';
import '#src/scripts/helpers/sessionHelpers.js';

const DEFAULT_TIMEOUT = 5000;
const HTTP_UNAUTHORIZED = 401;

// Extend Express Request to include our axiosMiddleware
declare global {
  namespace Express {
    interface RequestState {
      authenticatedAxios: AxiosInstanceWrapper;
    }
    interface Request {
      state: RequestState;
      axiosMiddleware: AxiosInstanceWrapper;
    }
  }
}

/**
 * Convert unknown error to Error instance
 * @param {unknown} error Error to convert
 * @returns {Error} Error instance
 */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Type guard for axios error with response
 * @param {unknown} error Error to check
 * @returns {boolean} True if error has response details we use for logging
 */
function isAxiosErrorWithResponse(error: unknown): error is {
  response: {
    status: number;
    data?: unknown;
    headers?: Record<string, string | string[] | undefined>;
  };
} {
  return error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    typeof (error.response).status === 'number';
}

/**
 * Axios middleware to attach Axios instance to request object.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 * @returns {void}
 */
export const axiosMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Create axios instance with default config
  const axiosWrapper = create({
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const { silasAuth } = req.session;
  const { accessToken } = silasAuth ?? {};

  // Axios runs on every request, so this makes it less noisy by checking routes where SiLAS auth is needed
  const hasToken = Boolean(accessToken?.trim());
  const needsSilasAuth = req.path.startsWith('/cases') || req.path.startsWith('/search');

  if (!hasToken && needsSilasAuth) {
    devLog('No SILAS access token found in session - request will proceed without Authorization header');
  }

  if (hasToken) {
    axiosWrapper.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        config.headers.Authorization = `Bearer ${accessToken}`;
        devLog('Added SILAS bearer token to API request');
        return config;
      },
      async (error: unknown) => await Promise.reject(toError(error))
    );
  }

  // Response interceptor for 401 error handling
  axiosWrapper.axiosInstance.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    if (isAxiosErrorWithResponse(error) && error.response.status === HTTP_UNAUTHORIZED) {
      console.log('401 response:', {
    data: error.response.data,
    wwwAuthenticate:
      error.response.headers?.['www-authenticate'],
    });
    }

    return await Promise.reject(toError(error));
  },
  );

    req.axiosMiddleware = axiosWrapper;
    req.state = { authenticatedAxios: axiosWrapper };
    next();
};