import { z } from "zod";
import { BASE_LEGAL_SYSTEM_PROMPT } from "./base";
import { sanitizeDocumentText } from "@/services/documents/sanitizer";

export const ConsultationSchema = z.object({
  documentSummary: z.string(),
  keyClauses: z.array(z.string()).default([]),
  unclearProvisions: z.array(z.string()).default([]),
  importantDates: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  questionsForLawyer: z.array(z.string()).default([]),
  documentsToBring: z.array(z.string()).default([]),
});

export function buildConsultationSystemPrompt(): string {
  return `${BASE_LEGAL_SYSTEM_PROMPT}

TASK: Help the user prepare for a consultation with a qualified legal professional based on the provided document.

Generate:
- documentSummary: 3-5 sentence summary the user could read aloud to a lawyer to give context
- keyClauses: list of clause names the user should ask about (from the document)
- unclearProvisions: list of provisions that are ambiguous or hard to interpret
- importantDates: list of dates or deadlines the user should be aware of
- missingInformation: list of things the document does NOT address but that might be relevant (e.g. "no governing law clause", "no dispute resolution mechanism")
- questionsForLawyer: 5-10 specific questions the user could ask a lawyer, grounded in the document
- documentsToBring: list of related documents the user might want to bring (e.g. "any prior versions of this contract", "communications with the other party")

RULES:
- Everything must be grounded in the document. Do not invent.
- The goal is to help the user communicate effectively with a lawyer, NOT to replace one.
- Questions should be specific and reference actual document content.`;
}

export function buildConsultationUserPrompt(documentText: string): string {
  return `Prepare a consultation pack based on this document. Return a JSON object.

${sanitizeDocumentText(documentText)}`;
}
