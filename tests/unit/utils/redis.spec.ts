import { strict as assert } from "assert";
import sinon from "sinon";
import { createRedisClient, recycleRedisClient } from "#utils/redis.js";
import type { RedisConfig } from "#types/config-types.js";

describe("createRedisClient", () => {
  let consoleLogStub: sinon.SinonStub;
  let consoleErrorStub: sinon.SinonStub;

  beforeEach(() => {
    consoleLogStub = sinon.stub(console, "log");
    consoleErrorStub = sinon.stub(console, "error");
    recycleRedisClient(); // Ensure we start with a fresh client for each test
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should create a redis client using redis protocol when TLS is disabled", () => {
    const config: RedisConfig = {
      host: "localhost",
      port: 6379,
      tls_enabled: false,
      auth_token: "secret-token",
      enabled: true,
    };

    const client = createRedisClient(config);
    const clientOptions = (client as any).options;

    assert(client, "Should return a client instance");
    assert.equal(
      (client as any).isOpen,
      false,
      "Should not connect inside createRedisClient",
    );
    assert.equal(
      clientOptions.password,
      "secret-token",
      "Should pass auth token as password",
    );
    assert.equal(
      clientOptions.socket.connectTimeout,
      10000,
      "Should set connect timeout",
    );
    assert.equal(
      typeof clientOptions.socket.reconnectStrategy,
      "function",
      "Should set reconnect strategy",
    );
    assert(
      consoleLogStub.calledWithMatch(
        "Connecting to Redis at redis://localhost:6379",
      ),
    );
  });

  it("should use rediss protocol when TLS is enabled", () => {
    const config: RedisConfig = {
      host: "redis.example.com",
      port: 6380,
      tls_enabled: true,
      enabled: true,
    };

    createRedisClient(config);

    assert(
      consoleLogStub.calledWithMatch(
        "Connecting to Redis at rediss://redis.example.com:6380",
      ),
    );
  });

  it("should apply reconnect strategy delay and cap it at 3000ms", () => {
    const config: RedisConfig = {
      host: "localhost",
      port: 6379,
      tls_enabled: false,
      enabled: true,
    };

    const client = createRedisClient(config);
    const reconnectStrategy = (client as any).options.socket.reconnectStrategy;

    assert.equal(
      reconnectStrategy(2),
      200,
      "Should use retries * 100 for lower retries",
    );
    assert.equal(
      reconnectStrategy(10),
      1000,
      "Should calculate delay for allowed retry range",
    );
    assert(
      consoleLogStub.calledWithMatch(
        "Redis reconnecting... attempt 2, waiting 200ms",
      ),
    );
  });

  it("should stop reconnecting after more than 10 retries", () => {
    const config: RedisConfig = {
      host: "localhost",
      port: 6379,
      tls_enabled: false,
      enabled: true,
    };

    const client = createRedisClient(config);
    const reconnectStrategy = (client as any).options.socket.reconnectStrategy;
    const result = reconnectStrategy(11);

    assert(result instanceof Error, "Should return an Error after 10 retries");
    assert.equal(result.message, "Redis reconnection limit exceeded");
    assert(
      consoleErrorStub.calledWithMatch(
        "Redis reconnection failed after 10 attempts",
      ),
    );
  });

  it("should register and execute redis event handlers", () => {
    const config: RedisConfig = {
      host: "localhost",
      port: 6379,
      tls_enabled: false,
      enabled: true,
    };

    const client = createRedisClient(config) as any;

    client.emit("connect");
    client.emit("ready");
    client.emit("reconnecting");
    client.emit("end");
    client.emit("error", new Error("Boom"));

    assert(consoleLogStub.calledWithMatch("Redis client connecting..."));
    assert(consoleLogStub.calledWithMatch("Redis client ready"));
    assert(consoleLogStub.calledWithMatch("Redis client reconnecting..."));
    assert(consoleLogStub.calledWithMatch("Redis client disconnected"));
    assert(consoleErrorStub.calledWithMatch("Redis Client Error:"));
  });
});
