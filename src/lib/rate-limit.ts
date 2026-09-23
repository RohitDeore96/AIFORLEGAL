/**
 * Lightweight in-memory rate limiter (token bucket per identifier).
 * For multi-instance production (Vercel), swap with Upstash Redis.
 */
type Bucket = { tokens: number; lastRefillMs: number };

const buckets = new Map<string, Bucket>();
const REFILL_INTERVAL_MS = 60_000;

export function rateLimit(
  identifier: string,
  maxPerMinute: number,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket) {
    buckets.set(identifier, { tokens: maxPerMinute - 1, lastRefillMs: now });
    return { ok: true };
  }

  const elapsed = now - bucket.lastRefillMs;
  const refill = Math.floor(elapsed / REFILL_INTERVAL_MS) * maxPerMinute;
  bucket.tokens = Math.min(maxPerMinute, bucket.tokens + refill);
  bucket.lastRefillMs = now;

  if (bucket.tokens <= 0) {
    return { ok: false, retryAfterMs: REFILL_INTERVAL_MS - (elapsed % REFILL_INTERVAL_MS) };
  }
  bucket.tokens -= 1;
  return { ok: true };
}

/** Test helper — clears all buckets. */
export function _resetRateLimitForTests(): void {
  buckets.clear();
}
