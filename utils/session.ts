import chalk from 'chalk';
import type session from 'express-session';
import type { Config } from '#types/config-types.js';
import type { Store } from 'express-session';
import { MemoryStore } from 'express-session';

/**
 * Build session configuration
 * @param {Config} config - Base session configuration
 * @param {RedisClientFactory} redisClientFactory - Factory function to create Redis client (for testing/mocking)
 * @returns {Promise<session.SessionOptions>} Configured session options with Redis store
 */
export const buildSessionConfig = async (
  config: Config,
): Promise<session.SessionOptions> => {
  let store: Store;
		console.log(chalk.yellow('⚠️  Using in-memory session store (not suitable for production environments)'));
		store = new MemoryStore();

	return {
    ...config.session,
		store: store,
  };
};