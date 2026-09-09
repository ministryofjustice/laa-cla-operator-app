/**
 * Enhanced API Middleware
 *
 * Generalized version of MCC's axios middleware pattern.
 * Creates configurable axios instances with authentication, logging,
 * and error handling.
 *
 * Based on MCC's utils/axiosSetup.ts patterns.
 */

import { create } from 'middleware-axios';
import type { Request, Response, NextFunction } from 'express';
import type { AxiosInstanceWrapper } from '#types/axios-instance-wrapper.js';
import type {
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { devLog, devError } from '#src/scripts/helpers/index.js';
import type { SilasSessionAuth } from '#types/auth-types.js';

const DEFAULT_TIMEOUT = 5000;
const HTTP_UNAUTHORIZED = 401;

/**
 * Configuration options for the API middleware.
 */
export interface ApiMiddlewareConfig {
  /** Default timeout for requests. */
  timeout?: number;

  /** Default headers to include with all requests. */
  defaultHeaders?: Record<string, string>;

  /** Whether to enable request and response logging. */
  enableLogging?: boolean;

  /** Optional authentication service for JWT handling. */
  authService?: AuthServiceInterface | null;
}

/**
 * Authentication service interface compatible with the MCC auth service.
 */
export interface AuthServiceInterface {
  /** Retrieve the authentication header. */
  getAuthHeader: () => Promise<string>;

  /** Clear stored authentication tokens. */
  clearTokens: () => void;
}

/**
 * Extend the Express Request interface with the Axios middleware wrapper.
 */
declare global {
  namespace Express {
    interface Request {
      axiosMiddleware: AxiosInstanceWrapper;
    }
  }
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
 * Create API middleware with the supplied configuration.
 *
 * The middleware creates an Axios instance for each request and attaches
 * it to `req.axiosMiddleware`. Optional request/response logging and JWT
 * authentication are configured through the supplied options.
 *
 * @param {ApiMiddlewareConfig} config - Configuration for the API middleware.
 * @returns {(req: Request, res: Response, next: NextFunction) => void} Express middleware function.
 */
export function createApiMiddleware(
  config: ApiMiddlewareConfig = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    timeout = DEFAULT_TIMEOUT,
    defaultHeaders = {},
    enableLogging = true,
    authService = null,
  } = config;

  return (req: Request, _res: Response, next: NextFunction): void => {
    /**
     * Create an Axios instance using the configured defaults.
     */
    const axiosWrapper = create({
      timeout,
      headers: {
        'Content-Type': 'application/json',
        ...defaultHeaders,
      },
    });

    /**
     * Add request and response logging interceptors when logging is enabled.
     */
    if (enableLogging) {
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
     * Add JWT authentication interceptors when an authentication service
     * has been configured.
     */
    if (authService !== null) {
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

      /**
       * Clear cached authentication tokens when the API returns 401.
       */
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

    req.axiosMiddleware = axiosWrapper;

    next();
  };
}

/**
 * Authentication middleware that checks whether the user is logged in.
 *
 * Redirects unauthenticated users to the Entra sign-in page.
 * Authenticated users are passed to the next middleware.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next function.
 * @returns {void} Redirects unauthenticated users or calls the next middleware.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { session } = req;
  const { silasAuth } = session;

  if (!hasValidSilasToken(silasAuth)) {
    res.redirect('/sign-in');
    return;
  }

  next();
}

/**
 * Check whether a SiLAS authentication session is valid.
 *
 * A session is considered valid when it exists and its expiration
 * timestamp is later than the current time.
 *
 * @param {SilasSessionAuth | undefined} silasAuth - SiLAS authentication session to validate.
 * @returns {boolean} True when the authentication session exists and has not expired.
 */
export function hasValidSilasToken(
  silasAuth: SilasSessionAuth | undefined
): boolean {
  if (silasAuth === undefined) {
    return false;
  }

  return silasAuth.expiresAt > Date.now();
}

/**
 * Default API middleware using the standard configuration.
 *
 * This is compatible with existing template usage.
 */
export const axiosMiddleware = createApiMiddleware();

/**
 * Middleware that exposes authentication status to response locals.
 *
 * The middleware makes `isAuthenticated`, `userEmail`, and `userName`
 * available to templates.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next function.
 * @returns {void} Sets authentication locals and calls the next middleware.
 */
export const setAuthStatus = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { session } = req;
  const { silasAuth, user } = session;

  res.locals.isAuthenticated =
    silasAuth !== undefined &&
    silasAuth.expiresAt > Date.now();

  res.locals.userEmail = user?.email ?? null;
  res.locals.userName = user?.name ?? null;

  next();
};
