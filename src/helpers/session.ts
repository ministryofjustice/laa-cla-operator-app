import {Request} from "express"
import { promisify } from "node:util";
/**
 * Saves the current request session.
 *
 * @param {Request} req Express request containing the session to save.
 * @returns {Promise<void>} A promise resolving after the session is saved.
 */
export async function saveSession(req: Request): Promise<void> {
  const save = promisify((callback: (error?: unknown) => void): void => {
    req.session.save(callback);
  });

  await save();
}

/**
 * Regenerates the current request session.
 *
 * @param {Request} req Express request containing the session to regenerate.
 * @returns {Promise<void>} A promise resolving after the session is regenerated.
 */
export async function regenerateSession(req: Request): Promise<void> {
  const regenerate = promisify((callback: (error?: unknown) => void): void => {
    req.session.regenerate(callback);
  });

  await regenerate();
}

/**
 * Destroys the current request session.
 *
 * @param {Request} req Express request containing the session to destroy.
 * @returns {Promise<void>} A promise resolving after the session is destroyed.
 */
export async function destroySession(req: Request): Promise<void> {
  const destroy = promisify((callback: (error?: unknown) => void): void => {
    req.session.destroy(callback);
  });

  await destroy();
}