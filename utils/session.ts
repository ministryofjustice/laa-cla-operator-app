import chalk from 'chalk';
import type session from 'express-session';
import type { Config } from '#types/config-types.js';
import { MemoryStore } from 'express-session';

/**
 * Build session configuration
 * @param {Config} config - Base session configuration
 * @returns {session.SessionOptions} Configured session options
 */
export const buildSessionConfig = (
  config: Config,
): session.SessionOptions => {
  console.log(
    chalk.yellow(
      '⚠️  Using in-memory session store (not suitable for production environments)',
    ),
  );

  const store = new MemoryStore();

  return {
    ...config.session,
    store,
  };
};
