import { createClient } from "redis";
import chalk from "chalk";
import type { RedisConfig } from "#types/config-types.js";
import { devError, devLog } from "#src/scripts/helpers/index.js";

const REDIS_CONNECTION_TIMEOUT_MS = 10000;
const REDIS_RECONNECT_DELAY_MULTIPLIER = 100;
const REDIS_RECONNECT_DELAY_MAX_MS = 3000;
const REDIS_MAX_RETRIES = 10;
/**
 * Builds the Redis connection URL based on the configuration.
 * @param {RedisConfig} config - Redis configuration object
 * @returns {string} Redis connection URL
 */
export const buildConnectionUrl = (config: RedisConfig): string => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- null and false are both falsy
  const protocol = config.tls_enabled ? "rediss://" : "redis://";
  return `${protocol}${config.host}:${config.port}`;
};

let globalRedisClient: ReturnType<typeof createClient> | null = null;

/**
 * Recycle the global Redis client by quitting the connection and clearing the reference.
 * @returns {void}
 */
export const recycleRedisClient = (): void => {
  if (globalRedisClient !== null) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to wait for this
    globalRedisClient.quit();
    globalRedisClient = null;
  }
};

/**
 * Create and configure Redis client
 * @param {RedisConfig} config - Redis configuration from environment variables
 * @returns {ReturnType<typeof createClient>} Configured Redis client
 */
export const createRedisClient = (
  config: RedisConfig,
): ReturnType<typeof createClient> => {
  if (globalRedisClient !== null) {
    return globalRedisClient;
  }

  const redisUrl = buildConnectionUrl(config);
  devLog(chalk.green(`Connecting to Redis at ${redisUrl}`));

  globalRedisClient = createClient({
    url: redisUrl,
    password: config.auth_token,
    socket: {
      connectTimeout: REDIS_CONNECTION_TIMEOUT_MS,
      /**
       * Reconnection strategy with exponential backoff
       * @param {number} retries - Number of reconnection attempts
       * @returns {number | Error} Delay in milliseconds or Error to stop reconnecting
       */
      reconnectStrategy: (retries: number) => {
        if (retries > REDIS_MAX_RETRIES) {
          console.error(
            chalk.red("❌ Redis reconnection failed after 10 attempts"),
          );
          return new Error("Redis reconnection limit exceeded");
        }
        const delay = Math.min(
          retries * REDIS_RECONNECT_DELAY_MULTIPLIER,
          REDIS_RECONNECT_DELAY_MAX_MS,
        );
        console.log(
          chalk.yellow(
            `⚠️  Redis reconnecting... attempt ${retries}, waiting ${delay}ms`,
          ),
        );
        return delay;
      },
    },
  });

  globalRedisClient.on("error", (err) => {
    devError(chalk.red("Redis Client Error:", err));
  });

  globalRedisClient.on("connect", () => {
    devLog(chalk.green("✓ Redis client connecting..."));
  });

  globalRedisClient.on("ready", () => {
    devLog(chalk.green("✓ Redis client ready"));
  });

  globalRedisClient.on("reconnecting", () => {
    devLog(chalk.yellow("⚠️  Redis client reconnecting..."));
  });

  globalRedisClient.on("end", () => {
    devLog(chalk.yellow("⚠️  Redis client disconnected"));
  });

  return globalRedisClient;
};
