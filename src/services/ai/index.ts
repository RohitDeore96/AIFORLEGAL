/**
 * High-level AI service — the only AI surface the rest of the app uses.
 * Composes prompts + retriever + provider + output validation.
 *
 * Every method:
 *   - Uses retrieval to ground the model
 *   - Validates output via zod
 *   - Returns typed results
 *   - Throws AppError on any failure
 */
import { getAiProvider } from "./factory";
import { DocumentRetriever } from "@/services/documents/retriever";
import type { DocumentChunk } from "@/types";
import type { DocumentOverview, IdentifiedClause, Obligation, QaAnswer, ChecklistItemInput, ConsultationPrep, ComparisonResult } from "@/types";

import {
  SummarySchema,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
} from "./prompts/summary";
import {
  ClausesSchema,
  buildClausesSystemPrompt,
  buildClausesUserPrompt,
} from "./prompts/clauses";
import {
  QaSchema,
  buildQaSystemPrompt,
  buildQaUserPrompt,
} from "./prompts/qa";
import {
  ObligationsSchema,
  buildObligationsSystemPrompt,
  buildObligationsUserPrompt,
} from "./prompts/obligations";
import {
  ChecklistSchema,
  buildChecklistSystemPrompt,
  buildChecklistUserPrompt,
} from "./prompts/checklist";
import {
  ConsultationSchema,
  buildConsultationSystemPrompt,
  buildConsultationUserPrompt,
} from "./prompts/consultation";
import {
  ComparisonSchema,
  buildComparisonSystemPrompt,
  buildComparisonUserPrompt,
} from "./prompts/comparison";

export type AnalysisMeta = {
  model: string;
  tokenUsage?: number;
  durationMs: number;
};

export const aiService = {
  /** Summarize a document into structured overview. */
  async summarize(documentText: string): Promise<{ data: DocumentOverview; meta: AnalysisMeta }> {
    const provider = getAiProvider();
    const result = await provider.generateStructured(
      buildSummarySystemPrompt(),
      buildSummaryUserPrompt(documentText),
      SummarySchema,
    );
    return {
      data: result.data,
      meta: { model: result.model, tokenUsage: result.tokenUsage, durationMs: result.durationMs },
    };
  },

  /** Identify clauses in a document. */
  async identifyClauses(documentText: string): Promise<{ data: IdentifiedClause[]; meta: AnalysisMeta }> {
    const provider = getAiProvider();
    const result = await provider.generateStructured(
      buildClausesSystemPrompt(),
      buildClausesUserPrompt(documentText),
      ClausesSchema,
    );
    return {
      data: result.data,
      meta: { model: result.model, tokenUsage: result.tokenUsage, durationMs: result.durationMs },
    };
  },

  /** Extract obligations and deadlines. */
  async extractObligations(documentText: string): Promise<{ data: Obligation[]; meta: AnalysisMeta }> {
    const provider = getAiProvider();
    const result = await provider.generateStructured(
      buildObligationsSystemPrompt(),
      buildObligationsUserPrompt(documentText),
      ObligationsSchema,
    );
    return {
      data: result.data,
      meta: { model: result.model, tokenUsage: result.tokenUsage, durationMs: result.durationMs },
    };
  },

  /** Generate an action checklist. */
  async generateChecklist(documentText: string): Promise<{ data: ChecklistItemInput[]; meta: AnalysisMeta }> {
    const provider = getAiProvider();
    const result = await provider.generateStructured(
      buildChecklistSystemPrompt(),
      buildChecklistUserPrompt(documentText),
      ChecklistSchema,
    );
    return {
      data: result.data,
      meta: { model: result.model, tokenUsage: result.tokenUsage, durationMs: result.durationMs },
    };
  },

  /** Build consultation prep pack. */
  async prepareConsultation(documentText: string): Promise<{ data: ConsultationPrep; meta: AnalysisMeta }> {
    const provider = getAiProvider();
    const result = await provider.generateStructured(
      buildConsultationSystemPrompt(),
      buildConsultationUserPrompt(documentText),
      ConsultationSchema,
    );
    return {
      data: result.data,
      meta: { model: result.model, tokenUsage: result.tokenUsage, durationMs: result.durationMs },
    };
  },

  /** Answer a user question grounded in retrieved chunks. */
  async answerQuestion(
    question: string,
    chunks: DocumentChunk[],
  ): Promise<{ data: QaAnswer; meta: AnalysisMeta }> {
    const provider = getAiProvider();
    const result = await provider.generateStructured(
      buildQaSystemPrompt(),
      buildQaUserPrompt(question, chunks),
      QaSchema,
    );
    // Validate citation integrity: every cited chunkId must exist
    const validChunkIds = new Set(chunks.map((c) => c.id));
    const cleanedCitations = result.data.citations.filter((c) => validChunkIds.has(c.chunkId));
    return {
      data: { ...result.data, citations: cleanedCitations },
      meta: { model: result.model, tokenUsage: result.tokenUsage, durationMs: result.durationMs },
    };
  },

  /** Compare two documents. */
  async compareDocuments(
    textA: string,
    textB: string,
  ): Promise<{ data: ComparisonResult; meta: AnalysisMeta }> {
    const provider = getAiProvider();
    const result = await provider.generateStructured(
      buildComparisonSystemPrompt(),
      buildComparisonUserPrompt(textA, textB),
      ComparisonSchema,
    );
    return {
      data: result.data,
      meta: { model: result.model, tokenUsage: result.tokenUsage, durationMs: result.durationMs },
    };
  },
};

/** Convenience: build a retriever for a document's chunks. */
export function buildRetriever(chunks: DocumentChunk[]): DocumentRetriever {
  return new DocumentRetriever(chunks);
}
