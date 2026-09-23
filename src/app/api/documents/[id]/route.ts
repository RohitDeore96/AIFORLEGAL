/**
 * GET    /api/documents/:id         — fetch document metadata
 * DELETE /api/documents/:id         — delete document + stored file
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import { requireUserId } from "@/services/auth/session";
import { getDocumentStorage } from "@/services/storage/document-storage";
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

    return ok({
      id: doc.id,
      filename: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      errorMessage: doc.errorMessage,
      wordCount: doc.wordCount,
      pageCount: doc.pageCount,
      language: doc.language,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.userId !== userId) throw Errors.notFound("Document");

    await db.document.delete({ where: { id } });

    try {
      const storage = getDocumentStorage();
      await storage.delete(doc.storagePath);
    } catch (e) {
      console.warn("Failed to delete stored file", e);
    }

    return ok({ deleted: true, id });
  } catch (err) {
    return fail(err);
  }
}
