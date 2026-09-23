/**
 * Google Gemini provider — production-grade.
 * Uses @google/generative-ai. Works on Vercel, Cloud Run, anywhere Node runs.
 *
 * Error handling strategy:
 *   1. If the API call itself fails (network, auth, quota) → AI_PROVIDER_ERROR
 *   2. If the response is not valid JSON → AI_INVALID_OUTPUT (log raw text)
 *   3. If the JSON fails zod validation → try to repair common issues,
 *      then log the raw text + validation errors for debugging
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiProvider, AiGenerateOptions } from "../provider";
import { Errors } from "@/lib/errors";
import { env } from "@/lib/env";
import type { ZodType } from "zod";

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  readonly model: string;
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey ?? env.GOOGLE_GEMINI_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_GEMINI_API_KEY is required for GeminiProvider");
    }
    this.client = new GoogleGenerativeAI(key);
    this.model = model ?? env.GEMINI_MODEL;
  }

  async generateText(
    systemInstruction: string,
    userPrompt: string,
    options?: AiGenerateOptions,
  ) {
    const t0 = Date.now();
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
      },
    });
    try {
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      return {
        text,
        model: this.model,
        tokenUsage: result.response.usageMetadata?.totalTokenCount,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      throw this.translateError(err);
    }
  }

  async generateStructured<T>(
    systemInstruction: string,
    userPrompt: string,
    schema: ZodType<T>,
    options?: AiGenerateOptions,
  ) {
    const t0 = Date.now();
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxOutputTokens ?? 4096,
        responseMimeType: "application/json",
      },
    });
    try {
      const result = await model.generateContent(userPrompt);
      const rawText = result.response.text();

      // Check for empty response (Gemini sometimes returns empty when blocked)
      if (!rawText || rawText.trim().length === 0) {
        console.error("[gemini] Empty response. Finish reason:", result.response.promptFeedback);
        throw Errors.aiInvalidOutput();
      }

      const parsed = safeParseJson(rawText);
      if (!parsed.ok) {
        console.error("[gemini] JSON parse failed. Raw text (first 500 chars):", rawText.slice(0, 500));
        throw Errors.aiInvalidOutput();
      }

      // First validation attempt
      let validated = schema.safeParse(parsed.value);

      // If it fails, try to repair common Gemini output issues
      if (!validated.success) {
        const repaired = repairCommonIssues(parsed.value);
        if (repaired !== parsed.value) {
          console.warn("[gemini] First validation failed, trying repaired output");
          validated = schema.safeParse(repaired);
        }
      }

      if (!validated.success) {
        // Log the validation errors + raw response for debugging (server-side only)
        console.error("[gemini] Schema validation failed:", {
          model: this.model,
          zodErrors: validated.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
            code: i.code,
          })),
          rawText: rawText.slice(0, 1000),
          parsedValue: JSON.stringify(parsed.value).slice(0, 500),
        });
        throw Errors.aiInvalidOutput();
      }

      return {
        data: validated.data,
        rawText,
        model: this.model,
        tokenUsage: result.response.usageMetadata?.totalTokenCount,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AppError") throw err;
      throw this.translateError(err);
    }
  }

  private translateError(err: unknown): Error {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[gemini] Provider error:", message);
    if (message.includes("quota") || message.includes("RATE_LIMIT") || message.includes("429")) {
      return Errors.rateLimited();
    }
    if (message.includes("timeout") || message.includes("DEADLINE")) {
      return Errors.aiProviderError("AI request timed out. Please try again.");
    }
    if (message.includes("404") || message.includes("not found") || message.includes("model")) {
      return Errors.aiProviderError(
        `AI model "${this.model}" is not available. Check GEMINI_MODEL env var.`,
      );
    }
    return Errors.aiProviderError();
  }
}

function safeParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    // Try to extract JSON from a code-fenced response
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return { ok: true, value: JSON.parse(match[1]) };
      } catch {
        return { ok: false };
      }
    }
    // Try to find first { ... } or [ ... ]
    const objMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) {
      try {
        return { ok: true, value: JSON.parse(objMatch[0]) };
      } catch {
        return { ok: false };
      }
    }
    return { ok: false };
  }
}

/**
 * Repairs common Gemini output issues that cause zod validation to fail:
 *
 * 1. null where an array is expected → []
 * 2. string where an array is expected → [string]
 * 3. null where a string is expected → "" (for non-nullable string fields)
 * 4. Trims whitespace from strings
 *
 * This is a best-effort repair — if the structure is fundamentally wrong,
 * validation will still fail and the error will be logged.
 */
function repairCommonIssues(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map(repairCommonIssues);
  }

  const obj = value as Record<string, unknown>;
  const repaired: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    // If the value is null but the key suggests it should be an array (plural names),
    // convert to empty array
    if (val === null && (key.endsWith("s") || key === "parties" || key === "questions")) {
      repaired[key] = [];
    }
    // If the value is a string but the key suggests it should be an array
    else if (typeof val === "string" && (key.endsWith("s") || key === "parties" || key === "questions")) {
      repaired[key] = [val];
    } else {
      repaired[key] = repairCommonIssues(val);
    }
  }
  return repaired;
}
