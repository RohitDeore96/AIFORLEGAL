/**
 * Google Gemini provider — production-grade.
 * Uses @google/generative-ai. Works on Vercel, Cloud Run, anywhere Node runs.
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
      const parsed = safeParseJson(rawText);
      if (!parsed.ok) {
        throw Errors.aiInvalidOutput();
      }
      const validated = schema.safeParse(parsed.value);
      if (!validated.success) {
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
    if (message.includes("quota") || message.includes("RATE_LIMIT")) {
      return Errors.rateLimited();
    }
    if (message.includes("timeout")) {
      return Errors.aiProviderError("AI request timed out. Please try again.");
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
    return { ok: false };
  }
}
