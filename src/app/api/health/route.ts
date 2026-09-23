/**
 * Health check — public endpoint. Used by Vercel + uptime monitors.
 * Never exposes secrets or internal paths.
 */
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    provider: env.AI_PROVIDER,
    model: env.GEMINI_MODEL,
  });
}
