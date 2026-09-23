import { describe, it, expect } from "vitest";
import { Errors, AppError } from "@/lib/errors";

describe("Errors", () => {
  it("creates an unauthorized error with 401 status", () => {
    const e = Errors.unauthorized();
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe("UNAUTHORIZED");
    expect(e.statusCode).toBe(401);
    expect(e.message).toBe("Authentication required");
  });

  it("creates a forbidden error with 403 status", () => {
    const e = Errors.forbidden();
    expect(e.code).toBe("FORBIDDEN");
    expect(e.statusCode).toBe(403);
  });

  it("creates a not-found error with 404 status", () => {
    const e = Errors.notFound("Document");
    expect(e.code).toBe("NOT_FOUND");
    expect(e.statusCode).toBe(404);
    expect(e.message).toContain("Document");
  });

  it("creates a validation error with 400 status", () => {
    const e = Errors.validation("Invalid input");
    expect(e.code).toBe("VALIDATION");
    expect(e.statusCode).toBe(400);
  });

  it("creates an unsupported-file error with 415 status", () => {
    const e = Errors.unsupportedFile("application/x-msdownload");
    expect(e.code).toBe("UNSUPPORTED_FILE");
    expect(e.statusCode).toBe(415);
  });

  it("creates a file-too-large error with 413 status", () => {
    const e = Errors.fileTooLarge(100, 50);
    expect(e.code).toBe("FILE_TOO_LARGE");
    expect(e.statusCode).toBe(413);
  });

  it("creates an empty-file error with 400 status", () => {
    const e = Errors.emptyFile();
    expect(e.code).toBe("EMPTY_FILE");
    expect(e.statusCode).toBe(400);
  });

  it("creates a corrupt-file error with 422 status", () => {
    const e = Errors.corruptFile();
    expect(e.code).toBe("CORRUPT_FILE");
    expect(e.statusCode).toBe(422);
  });

  it("creates a rate-limited error with 429 status", () => {
    const e = Errors.rateLimited();
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.statusCode).toBe(429);
  });

  it("creates an AI provider error with 502 status", () => {
    const e = Errors.aiProviderError();
    expect(e.code).toBe("AI_PROVIDER_ERROR");
    expect(e.statusCode).toBe(502);
  });

  it("creates an AI invalid-output error with 502 status", () => {
    const e = Errors.aiInvalidOutput();
    expect(e.code).toBe("AI_INVALID_OUTPUT");
    expect(e.statusCode).toBe(502);
  });

  it("creates a prompt-injection error with 400 status", () => {
    const e = Errors.promptInjection();
    expect(e.code).toBe("PROMPT_INJECTION_DETECTED");
    expect(e.statusCode).toBe(400);
  });

  it("toClient() returns a safe object (no stack trace)", () => {
    const e = Errors.internal();
    const c = e.toClient();
    expect(c.code).toBe("INTERNAL");
    expect(c.message).toBeTruthy();
    expect(JSON.stringify(c)).not.toContain("stack");
  });
});
