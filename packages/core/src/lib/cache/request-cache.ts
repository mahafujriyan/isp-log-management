import { getRedisClient } from "@isp/core/lib/cache/redis";

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryEntry>();
const MAX_MEMORY_ENTRIES = 500;

function pruneMemoryCache(now = Date.now()): void {
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }
  if (memoryCache.size <= MAX_MEMORY_ENTRIES) return;
  const over = memoryCache.size - MAX_MEMORY_ENTRIES;
  const keys = memoryCache.keys();
  for (let i = 0; i < over; i += 1) {
    const next = keys.next();
    if (next.done) break;
    memoryCache.delete(next.value);
  }
}

function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setToMemory(key: string, value: unknown, ttlSeconds: number): void {
  const expiresAt = Date.now() + Math.max(1, ttlSeconds) * 1000;
  memoryCache.set(key, { value, expiresAt });
  pruneMemoryCache();
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const fromMemory = getFromMemory<T>(key);
  if (fromMemory !== null) return fromMemory;

  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    setToMemory(key, parsed, 2);
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  setToMemory(key, value, ttlSeconds);
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { EX: Math.max(1, Math.floor(ttlSeconds)) });
  } catch {
    // best-effort cache
  }
}

export async function withRequestCache<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  const cached = await getCachedJson<T>(key);
  if (cached !== null) return cached;
  const value = await producer();
  await setCachedJson(key, value, ttlSeconds);
  return value;
}
