/**
 * Typed environment access — single source of truth.
 * Throws on missing required vars at startup so failures are loud.
 *
 * NOTE: Vercel sometimes sets env vars to empty string "" instead of
 * leaving them undefined. zod's `z.coerce.number()` parses "" as 0
 * (because Number("") === 0), which would set MAX_UPLOAD_BYTES=0 and
 * break uploads. We use `emptyStringToUndefined` to convert "" to
 * undefined so zod's `.default()` kicks in correctly.
 */
import { z } from "zod";

/**
 * Preprocessor: convert empty string to undefined so zod's `.default()`
 * applies. Handles the Vercel empty-string env var issue.
 */
const emptyStringToUndefined = z.preprocess((val) => {
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
}, z.unknown());

/**
 * Number coercion that treats empty/whitespace strings as undefined
 * (falls back to default) instead of converting to 0.
 */
const optionalNumber = (defaultValue: number) =>
  emptyStringToUndefined.pipe(z.coerce.number().default(defaultValue));

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().default("file:./dev.db"),

  // NextAuth
  NEXTAUTH_URL: z.string().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z
    .string()
    .default("dev-only-secret-change-in-production-please"),

  // AI provider selection. One of:
  //   "zai"     — sandbox SDK (z-ai-web-dev-sdk)
  //   "gemini"  — @google/generative-ai (production)
  //   "mock"    — deterministic stubs for tests/demo
  AI_PROVIDER: z
    .enum(["zai", "gemini", "mock"])
    .default(() => {
      if (process.env.GOOGLE_GEMINI_API_KEY) return "gemini";
      return "mock";
    }),

  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),

  // File storage path (filesystem). For Vercel, swap with blob storage in production.
  STORAGE_DIR: z.string().default("./.storage"),

  // Upload limits
  MAX_UPLOAD_BYTES: optionalNumber(10 * 1024 * 1024), // 10MB
  ALLOWED_MIME_TYPES: z
    .string()
    .default("application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"),

  // Rate limit (per-IP per-minute) for AI endpoints
  AI_RATE_LIMIT_PER_MIN: optionalNumber(10),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten());
    throw new Error("Invalid environment configuration");
  }
  cached = parsed.data;
  return cached;
}

export const env = loadEnv();
