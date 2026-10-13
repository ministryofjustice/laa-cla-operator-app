import chalk from "chalk";
import type session from "express-session";
import { RedisStore } from "connect-redis";
import type { Config } from "#types/config-types.js";
import { MemoryStore } from "express-session";
import { createRedisClient } from "#utils/redis.js";

/**
 * Build session configuration
 * @param {Config} config - Base session configuration
 * @returns {session.SessionOptions} Configured session options
 */
export const buildSessionConfig = async (
  config: Config,
): Promise<session.SessionOptions> => {
  // eslint-disable-next-line no-useless-assignment -- assigned later
  let store = null;
  if (config.redis.enabled) {
    const client = createRedisClient(config.redis);
    if (!client.isOpen) {
      await client.connect();
    }
    store = new RedisStore({ client });
  } else {
    console.log(
      chalk.yellow(
        "⚠️  Using in-memory session store (not suitable for production environments)",
      ),
    );
    store = new MemoryStore();
  }

  return {
    ...config.session,
    store,
  };
};
