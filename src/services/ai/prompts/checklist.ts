import { z } from "zod";
import { BASE_LEGAL_SYSTEM_PROMPT } from "./base";
import { sanitizeDocumentText } from "@/services/documents/sanitizer";
import { nullableArray } from "../schemas/helpers";

export const ChecklistSchema = nullableArray(
  z.object({
    label: z.string(),
    rationale: z.string(),
    category: z.union([
      z.enum(["PAYMENT", "TERMINATION", "OBLIGATIONS", "RISK", "PROCESS", "PROFESSIONAL_HELP"]),
      z.string().transform(() => "PROCESS" as const),
    ]),
  }),
);

export function buildChecklistSystemPrompt(): string {
  return `${BASE_LEGAL_SYSTEM_PROMPT}

TASK: Generate a personalized, document-grounded action checklist for the user based on the provided legal document.

Each item should be:
- label: a short, actionable item (imperative mood, starts with a verb)
- rationale: 1 sentence explaining why this item matters for THIS document
- category: one of PAYMENT, TERMINATION, OBLIGATIONS, RISK, PROCESS, PROFESSIONAL_HELP

RULES:
- Include 5-10 items.
- Items must be grounded in the actual document content (e.g. if the document has a termination notice period, include "Review the 30-day termination notice requirement" — don't include generic items unrelated to this document).
- Always include at least 1 PROFESSIONAL_HELP item at the end.
- Do not include items that have no relevance to the document.
- Use clear, plain language.`;
}

export function buildChecklistUserPrompt(documentText: string): string {
  return `Generate an action checklist based on this document. Return a JSON array.

${sanitizeDocumentText(documentText)}`;
}
