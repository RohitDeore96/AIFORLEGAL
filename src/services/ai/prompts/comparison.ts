import { z } from "zod";
import { BASE_LEGAL_SYSTEM_PROMPT } from "./base";
import { sanitizeDocumentText } from "@/services/documents/sanitizer";

const CLAUSE_CATEGORIES = [
  "DEFINITIONS", "PAYMENT", "FEES", "RENEWAL", "TERMINATION",
  "CONFIDENTIALITY", "INTELLECTUAL_PROPERTY", "LIABILITY",
  "INDEMNIFICATION", "WARRANTIES", "DISPUTE_RESOLUTION",
  "GOVERNING_LAW", "DATA_PROTECTION", "NON_COMPETE",
  "NON_SOLICITATION", "FORCE_MAJEURE", "NOTICE", "OTHER", "GENERAL",
] as const;

export const ComparisonSchema = z.object({
  summary: z.string(),
  diffs: z.array(
    z.object({
      category: z.enum(CLAUSE_CATEGORIES),
      change: z.enum(["ADDED", "REMOVED", "MODIFIED"]),
      description: z.string(),
      docALocation: z.string().nullable(),
      docBLocation: z.string().nullable(),
      whyItMatters: z.string(),
      suggestedQuestions: z.array(z.string()).default([]),
    }),
  ).default([]),
  overallRiskNote: z.string(),
});

export function buildComparisonSystemPrompt(): string {
  return `${BASE_LEGAL_SYSTEM_PROMPT}

TASK: Compare two versions of a legal document and identify the material differences.

For each difference:
- category: clause category
- change: "ADDED" (in B but not A), "REMOVED" (in A but not B), or "MODIFIED" (present in both but different)
- description: a clear explanation of what changed
- docALocation: where it appears in document A (snippet, null if absent)
- docBLocation: where it appears in document B (snippet, null if absent)
- whyItMatters: 1-2 sentences on what the change might affect
- suggestedQuestions: 1-2 questions the user may want to ask a lawyer

Also provide:
- summary: 3-5 sentence high-level overview of what changed between the two versions
- overallRiskNote: 1-2 sentences noting any patterns of risk (e.g. "Document B shifts more liability to the customer") — keep this neutral and factual

RULES:
- Only report actual differences, not common features.
- Use verbatim snippets for locations (max 200 chars each).
- Do not declare which version is "better" — that is for a lawyer to advise on.`;
}

export function buildComparisonUserPrompt(textA: string, textB: string): string {
  return `Compare the two documents below.

DOCUMENT A:
${sanitizeDocumentText(textA)}

DOCUMENT B:
${sanitizeDocumentText(textB)}

Return a JSON object matching the schema. Use "ADDED" for content in B that is not in A, "REMOVED" for content in A that is not in B, and "MODIFIED" for content present in both but different.`;
}
