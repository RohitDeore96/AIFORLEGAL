/**
 * Z.ai SDK provider — used in sandbox.
 * Wraps z-ai-web-dev-sdk chat completions with JSON extraction + zod validation.
 */
import ZAI from "z-ai-web-dev-sdk";
import type { AiProvider, AiGenerateOptions } from "../provider";
import { Errors } from "@/lib/errors";
import type { ZodType } from "zod";

export class ZaiProvider implements AiProvider {
  readonly name = "zai";
  readonly model = "z-ai-default";

  async generateText(
    systemInstruction: string,
    userPrompt: string,
    options?: AiGenerateOptions,
  ) {
    const t0 = Date.now();
    try {
      const ai = await ZAI.create();
      const result = await ai.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxOutputTokens ?? 2048,
      });
      const text = result.choices[0]?.message?.content ?? "";
      return {
        text,
        model: this.model,
        tokenUsage: result.usage?.total_tokens,
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
    try {
      const ai = await ZAI.create();
      const schemaHint = `Respond with ONLY valid JSON matching this schema: ${JSON.stringify(
        describeSchema(schema),
      )}`;
      const result = await ai.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "system", content: schemaHint },
          { role: "user", content: userPrompt },
        ],
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxOutputTokens ?? 4096,
      });
      const rawText = result.choices[0]?.message?.content ?? "";
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
        tokenUsage: result.usage?.total_tokens,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AppError") throw err;
      throw this.translateError(err);
    }
  }

  private translateError(err: unknown): Error {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("rate") || message.includes("quota")) {
      return Errors.rateLimited();
    }
    return Errors.aiProviderError();
  }
}

function describeSchema(schema: ZodType<unknown>): unknown {
  // Best-effort shape description — full shape introspection is heavy; rely on schema validation instead.
  return "see instructions above";
}

function safeParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
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
