import { z } from "zod";
import { BASE_LEGAL_SYSTEM_PROMPT } from "./base";
import { sanitizeDocumentText } from "@/services/documents/sanitizer";

export const ObligationsSchema = z.array(
  z.object({
    party: z.string(),
    obligation: z.string(),
    deadline: z.string().nullable(),
    condition: z.string().nullable(),
    source: z.string(),
  }),
);

export function buildObligationsSystemPrompt(): string {
  return `${BASE_LEGAL_SYSTEM_PROMPT}

TASK: Extract obligations and deadlines from the provided legal document.

For each obligation, identify:
- party: who must perform the obligation (use the actual party name from the document, e.g. "Licensor", "Tenant", "the Company")
- obligation: a clear, concise description of what must be done
- deadline: the date or time period by which it must be done (or null if not specified)
- condition: any condition that triggers the obligation (or null)
- source: a verbatim quote (max 200 chars) showing where in the document this obligation comes from

RULES:
- Only extract obligations that are explicitly stated. Do not infer.
- If a deadline is ambiguous (e.g. "within a reasonable time"), preserve the original wording.
- Do not invent parties. If the document refers to "the Parties", use that.
- If no obligations are found, return an empty array.`;
}

export function buildObligationsUserPrompt(documentText: string): string {
  return `Extract all obligations from the following document. Return a JSON array.

${sanitizeDocumentText(documentText)}`;
}
