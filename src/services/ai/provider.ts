/**
 * AI provider abstraction. The rest of the app depends only on this interface.
 *
 * Implementations:
 *   - GeminiProvider  : production (uses @google/generative-ai)
 *   - ZaiProvider     : sandbox SDK
 *   - MockProvider    : deterministic stubs for tests / offline demo
 */
export interface AiProvider {
  /** Provider name (for telemetry / model attribution). */
  readonly name: string;
  readonly model: string;

  /**
   * Generate structured output. Implementations MUST:
   *   - Parse JSON from the model response
   *   - Validate against the supplied zod schema
   *   - Throw AppError("aiInvalidOutput") if validation fails
   */
  generateStructured<T>(
    systemInstruction: string,
    userPrompt: string,
    schema: import("zod").ZodType<T>,
    options?: AiGenerateOptions,
  ): Promise<AiStructuredResult<T>>;

  /**
   * Generate free-form text. Used for chat replies that include citations
   * parsed from a structured envelope.
   */
  generateText(
    systemInstruction: string,
    userPrompt: string,
    options?: AiGenerateOptions,
  ): Promise<AiTextResult>;
}

export type AiGenerateOptions = {
  temperature?: number;
  maxOutputTokens?: number;
};

export type AiStructuredResult<T> = {
  data: T;
  rawText: string;
  model: string;
  tokenUsage?: number;
  durationMs: number;
};

export type AiTextResult = {
  text: string;
  model: string;
  tokenUsage?: number;
  durationMs: number;
};
