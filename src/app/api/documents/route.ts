/**
 * POST /api/documents — upload a new document.
 * GET  /api/documents — list the current user's documents.
 *
 * Pipeline: validate → extract text → chunk → persist.
 * Extraction + chunking happen synchronously so the user gets the document's
 * status immediately. AI analysis is triggered separately by the client.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import { requireUserId } from "@/services/auth/session";
import { validateUpload } from "@/services/documents/validator";
import { extractText } from "@/services/documents/parser";
import { chunkDocument } from "@/services/documents/chunker";
import { getDocumentStorage } from "@/services/storage/document-storage";
import { createHash } from "node:crypto";
import path from "node:path";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel: max function duration

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

    // Rate-limit per user
    const rl = rateLimit(`upload:${userId}`, 10);
    if (!rl.ok) {
      const { Errors } = await import("@/lib/errors");
      throw Errors.rateLimited();
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      const { Errors } = await import("@/lib/errors");
      throw Errors.validation("File is required");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = validateUpload({
      name: file.name,
      // Pass file.type as-is. If it's empty or unrecognized, the validator
      // falls back to inferring from the file extension.
      mimeType: file.type,
      size: file.size,
      buffer,
    });

    const checksum = createHash("sha256").update(buffer).digest("hex");
    const storedName = `${userId}/${checksum}${path.extname(validated.name) || ".bin"}`;
    const storage = getDocumentStorage();
    await storage.save(storedName, validated.buffer);

    // Extract text + chunk
    const extracted = await extractText(validated.buffer, validated.mimeType);
    const chunks = chunkDocument(extracted.text, undefined, { page: extracted.pageCount ?? undefined });
    const wordCount = extracted.text.split(/\s+/).filter(Boolean).length;

    const doc = await db.document.create({
      data: {
        userId,
        filename: storedName,
        originalName: validated.name,
        mimeType: validated.mimeType,
        sizeBytes: validated.size,
        storagePath: storedName,
        textContent: extracted.text,
        pageCount: extracted.pageCount,
        wordCount,
        language: extracted.language,
        checksum,
        status: "READY",
        metadata: JSON.stringify({ chunks: chunks.length }),
      },
    });

    return ok({
      id: doc.id,
      filename: doc.originalName,
      status: doc.status,
      wordCount: doc.wordCount,
      pageCount: doc.pageCount,
      language: doc.language,
      chunkCount: chunks.length,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const docs = await db.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        wordCount: true,
        pageCount: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        errorMessage: true,
      },
    });

    return ok(
      docs.map((d) => ({
        ...d,
        filename: d.originalName,
      })),
    );
  } catch (err) {
    return fail(err);
  }
}
