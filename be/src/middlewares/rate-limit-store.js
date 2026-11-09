const { env } = require('../config/env.js');
const { AppError } = require('../shared/app-error.js');

/**
 * AF-03: Distributed rate-limit store.
 *
 * express-rate-limit defaults to MemoryStore, which is process-local. When the
 * backend runs more than one instance, failed login / change-password budgets
 * are not shared and an attacker can multiply attempts by hitting each
 * instance. This module provides an opt-in Redis-backed store.
 *
 * Configuration:
 * - RATE_LIMIT_STORE=memory|redis (default: memory, suitable for local dev/tests)
 * - REDIS_URL=redis://... (required when RATE_LIMIT_STORE=redis)
 * - RATE_LIMIT_REDIS_PREFIX=hsb:rl: (optional key namespace)
 * - RATE_LIMIT_REQUIRE_DISTRIBUTED=true (optional hard fail if store=memory)
 *
 * Failure policy: store errors are never swallowed. The error is thrown to the
 * Express error handler which responds 503, so a Redis outage fails closed
 * rather than silently disabling rate limiting.
 */

const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {hits, ttl}
`;

class RateLimitStoreUnavailableError extends AppError {
  constructor(cause) {
    super(
      503,
      'Dịch vụ giới hạn tần suất tạm thời không khả dụng. Vui lòng thử lại sau.',
      cause?.message ? { reason: cause.message } : undefined,
    );
    this.name = 'RateLimitStoreUnavailableError';
  }
}

class RedisRateLimitStore {
  /**
   * @param {object} options
   * @param {object} options.client - node-redis v4/v5/v6 client (already connected or connecting)
   * @param {string} [options.prefix]
   * @param {number} [options.windowMs]
   */
  constructor({ client, prefix = 'hsb:rl:', windowMs = 15 * 60 * 1000 }) {
    if (!client) throw new Error('RedisRateLimitStore requires a Redis client');
    this.client = client;
    this.prefix = prefix;
    this.windowMs = windowMs;
    // False because counters are shared by every backend instance.
    this.localKeys = false;
  }

  init(options = {}) {
    if (options.windowMs) this.windowMs = options.windowMs;
  }

  prefixKey(key) {
    return `${this.prefix}${key}`;
  }

  async increment(key) {
    try {
      const result = await this.client.eval(INCREMENT_SCRIPT, {
        keys: [this.prefixKey(key)],
        arguments: [String(this.windowMs)],
      });
      const totalHits = Number(Array.isArray(result) ? result[0] : result);
      const ttl = Array.isArray(result) ? Number(result[1]) : NaN;
      const effectiveTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : this.windowMs;
      return {
        totalHits,
        resetTime: new Date(Date.now() + effectiveTtl),
      };
    } catch (error) {
      throw new RateLimitStoreUnavailableError(error);
    }
  }

  async decrement(key) {
    try {
      const value = await this.client.decr(this.prefixKey(key));
      if (Number(value) < 0) {
        await this.client.set(this.prefixKey(key), '0', { KEEPTTL: true });
      }
    } catch (error) {
      throw new RateLimitStoreUnavailableError(error);
    }
  }

  async resetKey(key) {
    try {
      await this.client.del(this.prefixKey(key));
    } catch (error) {
      throw new RateLimitStoreUnavailableError(error);
    }
  }

  async shutdown() {
    // The shared Redis client is owned by the factory below, not by the store.
  }
}

let sharedRedisClient = null;
let redisClientPromise = null;

function getRedisClient() {
  if (sharedRedisClient) return sharedRedisClient;
  // Lazy require keeps memory-store development independent from Redis.
  const { createClient } = require('redis');
  const client = createClient({
    url: env.redisUrl,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 20) return new Error('Redis reconnect retries exhausted');
        return Math.min(100 * 2 ** retries, 5000);
      },
    },
  });
  client.on('error', (error) => {
    // Never log connection strings or credentials.
    console.warn('[rate-limit] Redis error:', error?.message || 'unknown error');
  });
  client.on('reconnecting', () => {
    console.warn('[rate-limit] Redis reconnecting...');
  });
  client.on('ready', () => {
    console.log('[rate-limit] Redis store connected');
  });
  sharedRedisClient = client;
  redisClientPromise = client.connect().catch((error) => {
    console.error('[rate-limit] Redis initial connection failed:', error?.message || 'unknown error');
    // Keep the client instance so node-redis can reconnect; commands fail
    // closed (503) until the connection is restored.
    redisClientPromise = null;
  });
  return client;
}

/**
 * Creates a Redis-backed store when configured, otherwise returns undefined so
 * express-rate-limit keeps its MemoryStore (single-instance/local dev).
 *
 * @param {string} scope - Unique namespace for one limiter.
 * @returns {RedisRateLimitStore | undefined}
 */
function createRateLimitStore(scope) {
  if (env.rateLimitStore !== 'redis') return undefined;
  if (!env.redisUrl) {
    throw new Error('RATE_LIMIT_STORE=redis requires REDIS_URL to be configured');
  }
  return new RedisRateLimitStore({
    client: getRedisClient(),
    prefix: `${env.rateLimitRedisPrefix}${scope}:`,
    windowMs: 15 * 60 * 1000,
  });
}

/**
 * Resolves the store options for a limiter. Tests may inject `options.store`.
 *
 * @param {string} scope
 * @param {object} [options]
 * @returns {object}
 */
function resolveStoreOptions(scope, options = {}) {
  const store = options.store || createRateLimitStore(scope);
  return store ? { store } : {};
}

async function closeRedisClient() {
  const client = sharedRedisClient;
  sharedRedisClient = null;
  redisClientPromise = null;
  if (!client) return;
  try {
    if (client.isOpen) await client.quit();
  } catch {
    // Shutdown must not throw.
  }
}

module.exports = {
  RedisRateLimitStore,
  RateLimitStoreUnavailableError,
  createRateLimitStore,
  resolveStoreOptions,
  closeRedisClient,
  // Exposed for tests only.
  _getRedisClientForTests: getRedisClient,
};
