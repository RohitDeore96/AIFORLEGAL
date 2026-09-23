import { z } from "zod";
import { BASE_LEGAL_SYSTEM_PROMPT } from "./base";
import { sanitizeDocumentText } from "@/services/documents/sanitizer";

export const CLAUSE_CATEGORIES = [
  "DEFINITIONS", "PAYMENT", "FEES", "RENEWAL", "TERMINATION",
  "CONFIDENTIALITY", "INTELLECTUAL_PROPERTY", "LIABILITY",
  "INDEMNIFICATION", "WARRANTIES", "DISPUTE_RESOLUTION",
  "GOVERNING_LAW", "DATA_PROTECTION", "NON_COMPETE",
  "NON_SOLICITATION", "FORCE_MAJEURE", "NOTICE", "OTHER",
] as const;

export const ClauseSchema = z.object({
  name: z.string(),
  category: z.enum(CLAUSE_CATEGORIES),
  plainLanguageExplanation: z.string(),
  sourceLocation: z.object({
    page: z.number().nullable(),
    section: z.string().nullable(),
    snippet: z.string(),
  }),
  whyItMatters: z.string(),
  suggestedQuestions: z.array(z.string()).default([]),
});

export const ClausesSchema = z.array(ClauseSchema);

export function buildClausesSystemPrompt(): string {
  return `${BASE_LEGAL_SYSTEM_PROMPT}

TASK: Identify the most important clauses in the provided legal document.

For each clause, provide:
- name: short label (e.g. "Termination for Convenience")
- category: one of ${CLAUSE_CATEGORIES.join(", ")}
- plainLanguageExplanation: 2-4 sentences in plain language a non-lawyer can understand
- sourceLocation: where in the document this clause appears (page, section, snippet of source text)
- whyItMatters: 1-2 sentences on what this clause affects
- suggestedQuestions: 1-3 questions the user may want to ask a lawyer about this clause

RULES:
- Only include clauses that are actually present in the document. Do not invent.
- The snippet must be a verbatim quote from the document (max 300 chars).
- Use neutral language. Never call a clause "dangerous" or "illegal".
- If a category has no clause in the document, do not include it.`;
}

export function buildClausesUserPrompt(documentText: string): string {
  return `Identify the important clauses in the following document. Return a JSON array.

${sanitizeDocumentText(documentText)}`;
}
