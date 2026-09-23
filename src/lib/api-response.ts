/**
 * Helper for consistent API error responses.
 */
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import type { ApiResponse } from "@/types";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data } satisfies ApiResponse<T>, { status });
}

export function fail(err: unknown) {
  const appError =
    err instanceof AppError
      ? err
      : new AppError("INTERNAL", 500, "Something went wrong. Please try again.");

  // Log the full error server-side only — never leak to client.
  if (appError.statusCode >= 500) {
    console.error("[API ERROR]", {
      code: appError.code,
      message: appError.message,
      cause: appError.cause,
      stack: appError.stack,
    });
  } else {
    console.warn("[API WARN]", appError.code, appError.message);
  }

  return NextResponse.json(
    { ok: false, error: appError.toClient() } satisfies ApiResponse<never>,
    { status: appError.statusCode },
  );
}
