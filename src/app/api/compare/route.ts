/**
 * POST /api/compare
 *   Body: { docAId: string, docBId: string }
 *
 * Compares two documents owned by the current user.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import { requireUserId } from "@/services/auth/session";
import { aiService } from "@/services/ai";
import { Errors } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  docAId: z.string().min(1),
  docBId: z.string().min(1),
}).refine((v) => v.docAId !== v.docBId, { message: "Documents must differ" });

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

    const rl = rateLimit(`compare:${userId}`, 5);
    if (!rl.ok) throw Errors.rateLimited();

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      throw Errors.validation(parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { docAId, docBId } = parsed.data;

    const [docA, docB] = await Promise.all([
      db.document.findUnique({ where: { id: docAId } }),
      db.document.findUnique({ where: { id: docBId } }),
    ]);
    if (!docA || docA.userId !== userId) throw Errors.notFound("Document A");
    if (!docB || docB.userId !== userId) throw Errors.notFound("Document B");

    // Check cache
    const existing = await db.comparison.findFirst({
      where: { userId, docAId, docBId },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return ok({ cached: true, result: JSON.parse(existing.resultJson) });
    }

    const { data, meta } = await aiService.compareDocuments(docA.textContent, docB.textContent);
    const result = {
      ...data,
      documentA: { id: docA.id, name: docA.originalName },
      documentB: { id: docB.id, name: docB.originalName },
    };

    await db.comparison.create({
      data: {
        userId,
        docAId,
        docBId,
        resultJson: JSON.stringify(result),
        modelUsed: meta.model,
      },
    });

    return ok({ cached: false, result });
  } catch (err) {
    return fail(err);
  }
}
