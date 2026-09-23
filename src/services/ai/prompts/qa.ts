import { z } from "zod";
import { BASE_LEGAL_SYSTEM_PROMPT } from "./base";
import { wrapChunkForRetrieval } from "@/services/documents/sanitizer";
import type { DocumentChunk } from "@/types";

export const QaSchema = z.object({
  answer: z.string(),
  citations: z
    .array(
      z.object({
        chunkId: z.string(),
        snippet: z.string(),
        page: z.number().nullable(),
        section: z.string().nullable(),
      }),
    )
    .default([]),
  confidence: z.enum(["high", "medium", "low", "insufficient"]),
  followUpQuestions: z.array(z.string()).default([]),
});
export type QaOutput = z.infer<typeof QaSchema>;

export function buildQaSystemPrompt(): string {
  return `${BASE_LEGAL_SYSTEM_PROMPT}

TASK: Answer the user's question about the legal document using ONLY the provided document chunks as evidence.

HARD RULES:
- If the chunks do not contain enough information to answer, set confidence to "insufficient" and answer: "Not found in the provided document."
- Every claim in your answer must be supported by a citation. Citations must reference chunk_id values that are actually provided in the context.
- Snippets must be verbatim quotes (max 200 chars).
- NEVER use external legal knowledge to answer.
- NEVER speculate. NEVER use weasel words like "likely" or "probably" to mask hallucination.
- If the question asks for legal advice, decline politely and suggest consulting a qualified lawyer.
- Provide 1-3 follow-up questions that might help the user explore the document further.

CONFIDENCE LEVELS:
- "high": answer is directly and explicitly supported by 1+ chunks
- "medium": answer is supported but requires some interpretation across chunks
- "low": answer is partially supported, important context may be missing
- "insufficient": the document does not contain enough information`;
}

export function buildQaUserPrompt(
  question: string,
  chunks: DocumentChunk[],
): string {
  const context = chunks.map(wrapChunkForRetrieval).join("\n\n---\n\n");
  return `User question:
${question}

Relevant document chunks (use ONLY these as evidence):
${context}

Return a JSON object matching the schema. If none of the chunks are relevant, set confidence to "insufficient".`;
}
