import type { Application, NextFunction, Request, Response } from 'express';
import { devError, extractErrorMessage } from '#src/scripts/helpers/index.js';

const HTTP_INTERNAL_SERVER_ERROR = 500;

/**
 * Registers global error middleware to normalize runtime and API errors.
 * @param {Application} app - Express application used to register the global error middleware.
 */
export function setupGlobalErrorHandler(app: Application): void {
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    const message = extractErrorMessage(error);

    devError(`Unhandled request error: ${message}`);
    const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error("Unhandled request error", {
      message: errorObj.message,
      stack: errorObj.stack,
      cause: errorObj.cause,
    });
    
    if (res.headersSent) {
      next(error);
      return;
    }

    res.status(HTTP_INTERNAL_SERVER_ERROR).render('main/error.njk', {
      status: HTTP_INTERNAL_SERVER_ERROR,
      error: message,
    });
  });
}
