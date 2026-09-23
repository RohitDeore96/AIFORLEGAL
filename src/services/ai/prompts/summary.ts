/**
 * Prompt templates for the document summary feature.
 * Pure functions — no side effects, easily testable.
 */
import { z } from "zod";
import { BASE_LEGAL_SYSTEM_PROMPT } from "./base";
import { sanitizeDocumentText } from "@/services/documents/sanitizer";

export const SummarySchema = z.object({
  documentType: z.string().nullable(),
  purpose: z.string().nullable(),
  parties: z.array(z.string()).default([]),
  effectiveDate: z.string().nullable(),
  term: z.string().nullable(),
  keyObligations: z.array(z.string()).default([]),
  importantDates: z
    .array(
      z.object({
        label: z.string(),
        date: z.string(),
        context: z.string().optional(),
      }),
    )
    .default([]),
  paymentProvisions: z.string().nullable(),
  terminationProvisions: z.string().nullable(),
  majorResponsibilities: z.array(z.string()).default([]),
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
