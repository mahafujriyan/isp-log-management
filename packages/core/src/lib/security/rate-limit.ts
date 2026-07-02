import { getRedisClient } from "@isp/core/lib/cache/redis";

export interface RateLimitResult {
  allowed: boolean;
  /** Requests counted in the current window (after this hit). */
  count: number;
  /** Remaining allowance before the limit is hit. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfterSeconds: number;
}

interface MemoryCounter {
  count: number;
  expiresAt: number;
}

const memoryCounters = new Map<string, MemoryCounter>();

function pruneMemory(now: number): void {
  if (memoryCounters.size < 5000) return;
  for (const [key, entry] of memoryCounters) {
    if (entry.expiresAt <= now) memoryCounters.delete(key);
  }
}

function hitMemory(key: string, windowSeconds: number): { count: number; ttl: number } {
  const now = Date.now();
  pruneMemory(now);
  const existing = memoryCounters.get(key);
  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + windowSeconds * 1000;
    memoryCounters.set(key, { count: 1, expiresAt });
    return { count: 1, ttl: windowSeconds };
  }
  existing.count += 1;
  memoryCounters.set(key, existing);
  return { count: existing.count, ttl: Math.ceil((existing.expiresAt - now) / 1000) };
}

/**
 * Fixed-window rate limiter. Uses Redis (atomic INCR + EXPIRE) when available so
 * limits are shared across instances, otherwise falls back to an in-memory counter.
 *
 * @param namespace logical bucket (e.g. "demo-request:ip")
 * @param identifier the client identifier (ip / device id / email)
 * @param limit max requests allowed within the window
 * @param windowSeconds window length in seconds
 */
export async function checkRateLimit(
  namespace: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const key = `rl:${namespace}:${identifier}`;
  const redis = await getRedisClient();

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      let ttl = await redis.ttl(key);
      if (ttl < 0) {
        await redis.expire(key, windowSeconds);
        ttl = windowSeconds;
      }
      return {
        allowed: count <= limit,
        count,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: ttl,
      };
    } catch {
      // fall through to memory on redis error
    }
  }

  const { count, ttl } = hitMemory(key, windowSeconds);
  return {
    allowed: count <= limit,
    count,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: ttl,
  };
}

/** Read the current count without incrementing (used for lockout checks). */
export async function peekRateLimit(namespace: string, identifier: string): Promise<number> {
  const key = `rl:${namespace}:${identifier}`;
  const redis = await getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? Number(raw) : 0;
    } catch {
      // fall through
    }
  }
  const entry = memoryCounters.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return 0;
  return entry.count;
}

/** Reset a counter (e.g. after a successful login). */
export async function resetRateLimit(namespace: string, identifier: string): Promise<void> {
  const key = `rl:${namespace}:${identifier}`;
  const redis = await getRedisClient();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // ignore
    }
  }
  memoryCounters.delete(key);
}
