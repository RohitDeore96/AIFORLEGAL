/**
 * POST /api/documents/:id/analyze?type=summary
 *   Triggers AI analysis. Body: none for summary/clauses/obligations/checklist/consultation.
 *
 * Caching: results are stored in the Analysis table. Re-running returns the cached result.
 * (Set ?force=true to re-run.)
 *
 * Query params:
 *   type: one of "summary" | "clauses" | "obligations" | "checklist" | "consultation"
 *   force: if "true", re-run even if cached.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import { requireUserId } from "@/services/auth/session";
import { aiService } from "@/services/ai";
import { Errors } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import type { AnalysisType } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED: Record<string, AnalysisType> = {
  summary: "SUMMARY",
  clauses: "CLAUSES",
  obligations: "OBLIGATIONS",
  consultation: "CONSULTATION",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.userId !== userId) throw Errors.notFound("Document");

    const url = new URL(req.url);
    const typeKey = url.searchParams.get("type");
    if (!typeKey || !(typeKey in ALLOWED)) {
      throw Errors.validation("Missing or invalid 'type' query param");
    }
    const analysisType = ALLOWED[typeKey];
    const force = url.searchParams.get("force") === "true";

    // Rate limit
    const rl = rateLimit(`ai:${userId}:${analysisType}`, 10);
    if (!rl.ok) throw Errors.rateLimited();

    // Cache check
    if (!force) {
      const cached = await db.analysis.findFirst({
        where: { documentId: id, type: analysisType },
        orderBy: { createdAt: "desc" },
      });
      if (cached) {
        return ok({ cached: true, result: JSON.parse(cached.resultJson) });
      }
    }

    // Run analysis
    const text = doc.textContent;
    let result;
    switch (analysisType) {
      case "SUMMARY":
        result = (await aiService.summarize(text)).data;
        break;
      case "CLAUSES":
        result = (await aiService.identifyClauses(text)).data;
        break;
      case "OBLIGATIONS":
        result = (await aiService.extractObligations(text)).data;
        break;
      case "CONSULTATION":
        result = (await aiService.prepareConsultation(text)).data;
        break;
      default:
        throw Errors.validation(`Unsupported analysis type: ${analysisType}`);
    }

    const analysis = await db.analysis.create({
      data: {
        documentId: id,
        type: analysisType,
        resultJson: JSON.stringify(result),
        modelUsed: "auto",
      },
    });

    return ok({ cached: false, result, analysisId: analysis.id });
  } catch (err) {
    return fail(err);
  }
}
