import { createClient, type RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let redisInitAttempted = false;

/**
 * Lazily connect to Redis when REDIS_URL is configured. Returns null when Redis
 * is unavailable so callers can gracefully fall back to in-memory behaviour.
 * The connection is attempted once per process.
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient?.isOpen) return redisClient;
  if (redisInitAttempted) return redisClient?.isOpen ? redisClient : null;
  redisInitAttempted = true;

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) return null;

  try {
    const client = createClient({ url: redisUrl });
    client.on("error", () => {
      // Swallow connection errors — callers fall back to memory.
    });
    await client.connect();
    redisClient = client as RedisClientType;
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}
