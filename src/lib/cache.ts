/**
 * In-memory chunk cache with TTL.
 *
 * Problem: On every Q&A request, the system rebuilds document chunks from
 * the cached text content. For a 10-page document, this is ~50ms of CPU
 * time per question. For a user asking 10 questions, that's 500ms wasted.
 *
 * Solution: Cache chunks per document ID in memory with a 5-minute TTL.
 * The cache is per-process (works great on Vercel serverless since each
 * function instance handles many requests before being recycled).
 *
 * Memory impact: A typical 10-page legal document (~5000 words) produces
 * ~10 chunks of ~2KB each = ~20KB. With 100 active documents cached,
 * that's ~2MB — well within Vercel's 1GB memory limit.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 200; // LRU-ish cap to prevent unbounded growth

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get a value from cache, or compute and store it.
 * Returns the cached/computed value.
 */
export async function cachedCompute<T>(
  key: string,
  compute: () => Promise<T>,
  ttlMs: number = TTL_MS,
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.data;
  }

  // Compute fresh value
  const data = await compute();
  cache.set(key, { data, expiresAt: now + ttlMs });

  // Evict expired entries + enforce max size
  if (cache.size > MAX_ENTRIES) {
    evictExpired(now);
    if (cache.size > MAX_ENTRIES) {
      // Evict oldest entries (Map preserves insertion order)
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }

  return data;
}

function evictExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

/** Invalidate a specific cache entry (e.g., when a document is deleted). */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/** Invalidate all cache entries matching a prefix. */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/** Test helper — clears all cache entries. */
export function _resetCacheForTests(): void {
  cache.clear();
}

/** Test helper — returns current cache size. */
export function _cacheSizeForTests(): number {
  return cache.size;
}
