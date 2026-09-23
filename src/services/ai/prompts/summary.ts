/**
 * Prompt templates for the document summary feature.
 * Pure functions — no side effects, easily testable.
 */
import { z } from "zod";
import { BASE_LEGAL_SYSTEM_PROMPT } from "./base";
import { sanitizeDocumentText } from "@/services/documents/sanitizer";
import { nullableArray } from "../schemas/helpers";

export const SummarySchema = z.object({
  documentType: z.union([z.string(), z.null()]).transform((v) => v ?? null),
  purpose: z.union([z.string(), z.null()]).transform((v) => v ?? null),
  parties: nullableArray(z.string()),
  effectiveDate: z.union([z.string(), z.number(), z.null()]).transform((v) => (v === null ? null : String(v))),
  term: z.union([z.string(), z.number(), z.null()]).transform((v) => (v === null ? null : String(v))),
  keyObligations: nullableArray(z.string()),
  importantDates: nullableArray(
    z.object({
      label: z.string(),
      date: z.union([z.string(), z.number(), z.null()]).transform((v) => String(v ?? "")),
      context: z.string().optional(),
    }),
  ),
  paymentProvisions: z.union([z.string(), z.null()]).transform((v) => v ?? null),
  terminationProvisions: z.union([z.string(), z.null()]).transform((v) => v ?? null),
  majorResponsibilities: nullableArray(z.string()),
  plainLanguageSummary: z.string(),
});
export type SummaryOutput = z.infer<typeof SummarySchema>;

export function buildSummarySystemPrompt(): string {
  return `${BASE_LEGAL_SYSTEM_PROMPT}

TASK: Analyze the provided legal document and produce a structured overview.

REQUIREMENTS:
- Extract only what is actually present in the document. Use null for missing fields.
- For dates, preserve the format used in the document. If no date is present, use null.
- "plainLanguageSummary" should be a 3-5 sentence explanation a non-lawyer can understand.
- Do NOT include any analysis that requires external legal knowledge.`;
}

export function buildSummaryUserPrompt(documentText: string): string {
  return `Please analyze the following legal document and return a JSON object matching the requested schema.

${sanitizeDocumentText(documentText)}`;
}
