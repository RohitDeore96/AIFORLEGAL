import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for env.ts — verifies that empty-string env vars (which Vercel
 * sometimes sets) don't break numeric defaults.
 *
 * Note: env.ts loads `env` once at module-import time and caches it. To test
 * different env states, we reload the module by clearing the require cache.
 */

describe("env.ts", () => {
  beforeEach(() => {
    // Clear cached env module so each test gets a fresh load
    vi.resetModules();
  });

  it("uses default MAX_UPLOAD_BYTES (10MB) when env var is not set", async () => {
    delete process.env.MAX_UPLOAD_BYTES;
    const { env } = await import("@/lib/env");
    expect(env.MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it("uses default AI_RATE_LIMIT_PER_MIN (10) when env var is not set", async () => {
    delete process.env.AI_RATE_LIMIT_PER_MIN;
    const { env } = await import("@/lib/env");
    expect(env.AI_RATE_LIMIT_PER_MIN).toBe(10);
  });

  it("parses MAX_UPLOAD_BYTES when set to a valid number string", async () => {
    process.env.MAX_UPLOAD_BYTES = "5242880"; // 5MB
    const { env } = await import("@/lib/env");
    expect(env.MAX_UPLOAD_BYTES).toBe(5242880);
  });

  /**
   * Critical regression test: Vercel sometimes sets env vars to empty string
   * instead of leaving them undefined. Before the fix, z.coerce.number()
   * would parse "" as 0 (because Number("") === 0), which broke uploads
   * with "File size X exceeds 0 byte limit".
   */
  it("falls back to default when MAX_UPLOAD_BYTES is empty string (Vercel bug)", async () => {
    process.env.MAX_UPLOAD_BYTES = "";
    const { env } = await import("@/lib/env");
    expect(env.MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it("falls back to default when MAX_UPLOAD_BYTES is whitespace-only", async () => {
    process.env.MAX_UPLOAD_BYTES = "   ";
    const { env } = await import("@/lib/env");
    expect(env.MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it("falls back to default when AI_RATE_LIMIT_PER_MIN is empty string", async () => {
    process.env.AI_RATE_LIMIT_PER_MIN = "";
    const { env } = await import("@/lib/env");
    expect(env.AI_RATE_LIMIT_PER_MIN).toBe(10);
  });

  it("auto-selects gemini provider when GOOGLE_GEMINI_API_KEY is set", async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "AIzaSyTest";
    delete process.env.AI_PROVIDER;
    const { env } = await import("@/lib/env");
    expect(env.AI_PROVIDER).toBe("gemini");
  });

  it("auto-selects mock provider when GOOGLE_GEMINI_API_KEY is not set", async () => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.AI_PROVIDER;
    const { env } = await import("@/lib/env");
    expect(env.AI_PROVIDER).toBe("mock");
  });

  it("respects explicit AI_PROVIDER override", async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "AIzaSyTest";
    process.env.AI_PROVIDER = "mock"; // explicitly override
    const { env } = await import("@/lib/env");
    expect(env.AI_PROVIDER).toBe("mock");
  });
});
