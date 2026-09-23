/**
 * GET /api/documents/:id/qa/history
 *   Returns prior Q&A messages for this document.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import { requireUserId } from "@/services/auth/session";
import { Errors } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.userId !== userId) throw Errors.notFound("Document");

    const messages = await db.qaMessage.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "asc" },
    });

    return ok(
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations ? JSON.parse(m.citations) : null,
        createdAt: m.createdAt,
      })),
    );
  } catch (err) {
    return fail(err);
  }
}
