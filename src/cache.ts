/**
 * Cache abstraction: Redis when REDIS_URL is set, otherwise an in-memory map.
 * Used for TWAP values, eligible-token lists and other RPC-heavy responses.
 */
import Redis from "ioredis";
import { config } from "./config";

let redis: Redis | null = null;
if (config.redisUrl) {
  try {
    redis = new Redis(config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 2 });
    redis.on("error", (e) => console.warn("[cache] redis error:", e.message));
    console.log("[cache] using Redis");
  } catch (e: any) {
    console.warn("[cache] redis init failed, falling back to memory:", e.message);
  }
}
if (!redis) console.log("[cache] using in-memory cache");

const mem = new Map<string, { value: string; expires: number }>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redis) {
      const v = await redis.get(key);
      return v ? (JSON.parse(v) as T) : null;
    }
  } catch {
    /* fall through to memory */
  }
  const entry = mem.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    mem.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSec = 60): Promise<void> {
  const str = JSON.stringify(value);
  try {
    if (redis) {
      await redis.set(key, str, "EX", ttlSec);
      return;
    }
  } catch {
    /* fall through to memory */
  }
  mem.set(key, { value: str, expires: Date.now() + ttlSec * 1000 });
}
