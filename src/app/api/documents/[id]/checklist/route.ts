/**
 * POST /api/documents/:id/checklist/generate  — generate checklist (uses AI)
 * GET  /api/documents/:id/checklist           — get checklist with completion state
 * PATCH /api/documents/:id/checklist/:itemId   — toggle complete / update label
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

// POST: generate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.userId !== userId) throw Errors.notFound("Document");

    const rl = rateLimit(`checklist:${userId}:${id}`, 5);
    if (!rl.ok) throw Errors.rateLimited();

    // Delete existing items (regenerate)
    await db.checklistItem.deleteMany({ where: { documentId: id } });

    const { data: items } = await aiService.generateChecklist(doc.textContent);

    const created = await db.$transaction(
      items.map((item, idx) =>
        db.checklistItem.create({
          data: {
            documentId: id,
            label: item.label,
            rationale: item.rationale,
            sortOrder: idx,
          },
        }),
      ),
    );

    return ok({ count: created.length });
  } catch (err) {
    return fail(err);
  }
}

// GET: list
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.userId !== userId) throw Errors.notFound("Document");

    const items = await db.checklistItem.findMany({
      where: { documentId: id },
      orderBy: { sortOrder: "asc" },
    });

    return ok(items);
  } catch (err) {
    return fail(err);
  }
}

// PATCH: toggle
const PatchSchema = z.object({
  itemId: z.string(),
  completed: z.boolean().optional(),
  label: z.string().min(1).max(300).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc || doc.userId !== userId) throw Errors.notFound("Document");

    const json = await req.json();
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) {
      throw Errors.validation(parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { itemId, completed, label } = parsed.data;

    const item = await db.checklistItem.findUnique({ where: { id: itemId } });
    if (!item || item.documentId !== id) throw Errors.notFound("Checklist item");

    const updated = await db.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(completed !== undefined ? { completed } : {}),
        ...(label !== undefined ? { label } : {}),
      },
    });

    return ok(updated);
  } catch (err) {
    return fail(err);
  }
}
