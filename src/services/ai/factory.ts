/**
 * AI provider factory — picks the right provider based on env.
 *
 * Order of precedence:
 *   1. AI_PROVIDER env var (explicit)
 *   2. GOOGLE_GEMINI_API_KEY present → GeminiProvider
 *   3. Fall back to MockProvider (demo mode)
 *
 * The factory memoizes the instance so we don't re-create per request.
 */
import { env } from "@/lib/env";
import type { AiProvider } from "./provider";
import { GeminiProvider } from "./gemini-provider";
import { ZaiProvider } from "./zai-provider";
import { MockProvider } from "./mock-provider";

let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cached) return cached;

  switch (env.AI_PROVIDER) {
    case "gemini":
      cached = new GeminiProvider();
      break;
    case "zai":
      cached = new ZaiProvider();
      break;
    case "mock":
      cached = new MockProvider();
      break;
    default:
      cached = new MockProvider();
  }

  return cached;
}

/** Test helper — clears cache and forces re-resolution on next call. */
export function _resetAiProviderForTests(): void {
  cached = null;
}

export type { AiProvider };
