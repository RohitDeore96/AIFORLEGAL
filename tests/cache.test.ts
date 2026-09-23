import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cachedCompute,
  invalidateCache,
  invalidateCachePrefix,
  _resetCacheForTests,
  _cacheSizeForTests,
} from "@/lib/cache";

describe("cachedCompute", () => {
  beforeEach(() => {
    _resetCacheForTests();
    vi.clearAllMocks();
  });

  it("computes value on first call", async () => {
    const compute = vi.fn().mockResolvedValue("result");
    const result = await cachedCompute("key1", compute);
    expect(result).toBe("result");
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("returns cached value on second call (no recompute)", async () => {
    const compute = vi.fn().mockResolvedValue("result");
    await cachedCompute("key2", compute);
    const result = await cachedCompute("key2", compute);
    expect(result).toBe("result");
    expect(compute).toHaveBeenCalledTimes(1); // not called again
  });

  it("caches different keys independently", async () => {
    const compute1 = vi.fn().mockResolvedValue("a");
    const compute2 = vi.fn().mockResolvedValue("b");
    expect(await cachedCompute("key-a", compute1)).toBe("a");
    expect(await cachedCompute("key-b", compute2)).toBe("b");
    expect(compute1).toHaveBeenCalledTimes(1);
    expect(compute2).toHaveBeenCalledTimes(1);
  });

  it("recomputes after TTL expires", async () => {
    const compute = vi.fn().mockResolvedValue("fresh");
    await cachedCompute("key-ttl", compute, 10); // 10ms TTL
    expect(compute).toHaveBeenCalledTimes(1);
    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 20));
    await cachedCompute("key-ttl", compute, 10);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("does NOT recompute before TTL expires", async () => {
    const compute = vi.fn().mockResolvedValue("cached");
    await cachedCompute("key-not-expired", compute, 5000);
    await cachedCompute("key-not-expired", compute, 5000);
    await cachedCompute("key-not-expired", compute, 5000);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("handles complex objects (DocumentRetriever)", async () => {
    const retriever = { retrieve: () => ["chunk1", "chunk2"] };
    const compute = vi.fn().mockResolvedValue(retriever);
    const r1 = await cachedCompute("retriever:doc1", compute);
    const r2 = await cachedCompute("retriever:doc1", compute);
    expect(r1).toBe(r2); // same reference
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("handles compute errors (does not cache failures)", async () => {
    const compute = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("success");
    await expect(cachedCompute("key-error", compute)).rejects.toThrow("fail");
    expect(await cachedCompute("key-error", compute)).toBe("success");
    expect(compute).toHaveBeenCalledTimes(2);
  });
});

describe("invalidateCache", () => {
  beforeEach(() => {
    _resetCacheForTests();
  });

  it("removes a specific cache entry", async () => {
    const compute = vi.fn().mockResolvedValue("value");
    await cachedCompute("key-invalidate", compute);
    expect(_cacheSizeForTests()).toBe(1);
    invalidateCache("key-invalidate");
    expect(_cacheSizeForTests()).toBe(0);
    // Next call should recompute
    await cachedCompute("key-invalidate", compute);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("does nothing for non-existent key", () => {
    expect(() => invalidateCache("nonexistent")).not.toThrow();
    expect(_cacheSizeForTests()).toBe(0);
  });
});

describe("invalidateCachePrefix", () => {
  beforeEach(() => {
    _resetCacheForTests();
  });

  it("removes all entries matching prefix", async () => {
    const compute = vi.fn().mockResolvedValue("value");
    await cachedCompute("retriever:doc1", compute);
    await cachedCompute("retriever:doc2", compute);
    await cachedCompute("summary:doc1", compute);
    expect(_cacheSizeForTests()).toBe(3);

    invalidateCachePrefix("retriever:");
    expect(_cacheSizeForTests()).toBe(1); // only summary:doc1 remains
  });

  it("does nothing for non-matching prefix", async () => {
    const compute = vi.fn().mockResolvedValue("value");
    await cachedCompute("retriever:doc1", compute);
    invalidateCachePrefix("nonexistent:");
    expect(_cacheSizeForTests()).toBe(1);
  });
});

describe("cache eviction", () => {
  beforeEach(() => {
    _resetCacheForTests();
  });

  it("evicts expired entries when max size is exceeded", async () => {
    const compute = vi.fn().mockResolvedValue("value");
    // Fill cache beyond MAX_ENTRIES (200)
    for (let i = 0; i < 210; i++) {
      await cachedCompute(`key-${i}`, compute, 1); // 1ms TTL
    }
    // Some entries should have been evicted
    expect(_cacheSizeForTests()).toBeLessThanOrEqual(210);
  });
});
