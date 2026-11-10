import type { Application, NextFunction, Request, Response } from "express";
import { devError, extractErrorMessage } from "#src/scripts/helpers/index.js";

const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_FORBIDDEN = 403;
const CSRF_ERROR_CODE = "EBADCSRFTOKEN";

/**
 * Identifies csrf-sync validation failures for a correct forbidden response.
 * @param {unknown} error Candidate error.
 * @returns {boolean} True for an invalid CSRF token error.
 */
const isCsrfError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === CSRF_ERROR_CODE;

/**
 * Registers global error middleware to normalize runtime and API errors.
 * @param {Application} app - Express application used to register the global error middleware.
 */
export function setupGlobalErrorHandler(app: Application): void {
  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      const message = extractErrorMessage(error);

      devError(`Unhandled request error: ${message}`);

      if (res.headersSent) {
        next(error);
        return;
      }

      if (isCsrfError(error)) {
        res.status(HTTP_FORBIDDEN).render("main/error.njk", {
          status: HTTP_FORBIDDEN,
          error: "Your session could not be verified. Please try again.",
        });
        return;
      }

      res.status(HTTP_INTERNAL_SERVER_ERROR).render("main/error.njk", {
        status: HTTP_INTERNAL_SERVER_ERROR,
        error: message,
      });
    },
  );
}
