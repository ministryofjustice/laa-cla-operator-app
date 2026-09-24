/**
 * Enhanced API Middleware
 *
 * Generalized version of MCC's axios middleware pattern.
 * Creates configurable axios instances with authentication, logging,
 * and error handling.
 *
 * Based on MCC's utils/axiosSetup.ts patterns.
 */

import { create } from "middleware-axios";
import type { Request, Response, NextFunction } from "express";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import type { SilasSessionAuth } from "#types/auth-types.js";
import {
  addLoggingInterceptors,
  addAuthServiceInterceptors,
  addSessionSilasTokenInterceptor,
  type ApiAuthService,
} from "./apiInterceptors.js";

const DEFAULT_TIMEOUT = 5000;

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

  /** Whether to attach SILAS session bearer tokens when present. */
  useSessionSilasAuth?: boolean;
}

/**
 * Authentication service interface compatible with the MCC auth service.
 */
export interface AuthServiceInterface extends ApiAuthService {
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
  config: ApiMiddlewareConfig = {},
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    timeout = DEFAULT_TIMEOUT,
    defaultHeaders = {},
    enableLogging = true,
    authService = null,
    useSessionSilasAuth = true,
  } = config;

  return (req: Request, _res: Response, next: NextFunction): void => {
    /**
     * Create an Axios instance using the configured defaults.
     */
    const axiosWrapper = create({
      timeout,
      headers: {
        "Content-Type": "application/json",
        ...defaultHeaders,
      },
    });

    /**
     * Add request and response logging interceptors when logging is enabled.
     */
    if (enableLogging) {
      addLoggingInterceptors(axiosWrapper);
    }

    /**
     * Add JWT authentication interceptors when an authentication service
     * has been configured.
     */
    if (authService !== null) {
      addAuthServiceInterceptors(axiosWrapper, authService, enableLogging);
    }

    if (useSessionSilasAuth) {
      const accessToken = req.session.silasAuth?.accessToken;
      const hasToken =
        typeof accessToken === "string" && accessToken.trim() !== "";

      if (hasToken) {
        addSessionSilasTokenInterceptor(
          axiosWrapper,
          accessToken,
          enableLogging,
        );
      }
    }

    req.axiosMiddleware = axiosWrapper;
    req.state = { authenticatedAxios: axiosWrapper };

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
  next: NextFunction,
): void {
  const { session } = req;
  const { silasAuth } = session;

  if (!hasValidSilasToken(silasAuth)) {
    res.redirect("/sign-in");
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
  silasAuth: SilasSessionAuth | undefined,
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
  next: NextFunction,
): void => {
  const { session } = req;
  const { silasAuth, user } = session;

  res.locals.isAuthenticated = hasValidSilasToken(silasAuth);

  res.locals.userEmail = user?.email ?? null;
  res.locals.userName = user?.name ?? null;

  next();
};
