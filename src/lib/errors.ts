/**
 * Typed application errors. Avoids leaking internals via `message`.
 */
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "CORRUPT_FILE"
  | "RATE_LIMITED"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_OUTPUT"
  | "AI_INSUFFICIENT_CONTEXT"
  | "PROMPT_INJECTION_DETECTED"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    Object.defineProperty(this, "cause", { value: cause });
  }

  /** Safe to expose to client. Never includes internal stack traces. */
  toClient() {
    return { code: this.code, message: this.message };
  }
}

export const Errors = {
  unauthorized: () => new AppError("UNAUTHORIZED", 401, "Authentication required"),
  forbidden: () => new AppError("FORBIDDEN", 403, "You do not have access to this resource"),
  notFound: (what = "Resource") => new AppError("NOT_FOUND", 404, `${what} not found`),
  validation: (msg: string) => new AppError("VALIDATION", 400, msg),
  unsupportedFile: (mime: string) =>
    new AppError("UNSUPPORTED_FILE", 415, `File type "${mime}" is not supported`),
  fileTooLarge: (size: number, max: number) =>
    new AppError("FILE_TOO_LARGE", 413, `File size ${size} exceeds ${max} byte limit`),
  emptyFile: () => new AppError("EMPTY_FILE", 400, "Uploaded file is empty"),
  corruptFile: () => new AppError("CORRUPT_FILE", 422, "Uploaded file appears to be corrupt or unreadable"),
  rateLimited: () => new AppError("RATE_LIMITED", 429, "Too many requests. Please slow down."),
  aiProviderError: (msg = "AI service is temporarily unavailable") =>
    new AppError("AI_PROVIDER_ERROR", 502, msg),
  aiInvalidOutput: () =>
    new AppError("AI_INVALID_OUTPUT", 502, "AI returned an invalid response. Please try again."),
  aiInsufficientContext: () =>
    new AppError("AI_INSUFFICIENT_CONTEXT", 422, "The document does not contain enough information to answer this question."),
  promptInjection: () =>
    new AppError("PROMPT_INJECTION_DETECTED", 400, "Your input contains potentially unsafe content."),
  internal: () => new AppError("INTERNAL", 500, "Something went wrong. Please try again."),
};
