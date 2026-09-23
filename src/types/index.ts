/**
 * Centralized domain types. Pure types — no runtime code, no side effects.
 */
import type { DocumentStatus, AnalysisType } from "@prisma/client";

// ---------- Document ----------
export type DocumentSummary = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  errorMessage: string | null;
  wordCount: number | null;
  pageCount: number | null;
  language: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------- AI: Summary ----------
export type DocumentOverview = {
  documentType: string | null;
  purpose: string | null;
  parties: string[];
  effectiveDate: string | null;
  term: string | null;
  keyObligations: string[];
  importantDates: { label: string; date: string; context?: string }[];
  paymentProvisions: string | null;
  terminationProvisions: string | null;
  majorResponsibilities: string[];
  plainLanguageSummary: string;
};

// ---------- AI: Clauses ----------
export type ClauseCategory =
  | "DEFINITIONS"
  | "PAYMENT"
  | "FEES"
  | "RENEWAL"
  | "TERMINATION"
  | "CONFIDENTIALITY"
  | "INTELLECTUAL_PROPERTY"
  | "LIABILITY"
  | "INDEMNIFICATION"
  | "WARRANTIES"
  | "DISPUTE_RESOLUTION"
  | "GOVERNING_LAW"
  | "DATA_PROTECTION"
  | "NON_COMPETE"
  | "NON_SOLICITATION"
  | "FORCE_MAJEURE"
  | "NOTICE"
  | "OTHER";

export type IdentifiedClause = {
  name: string;
  category: ClauseCategory;
  plainLanguageExplanation: string;
  sourceLocation: { page?: number; section?: string; snippet: string };
  whyItMatters: string;
  suggestedQuestions: string[];
};

// ---------- AI: Obligations ----------
export type Obligation = {
  party: string;
  obligation: string;
  deadline: string | null;
  condition: string | null;
  source: string;
};

// ---------- AI: Q&A ----------
export type QaCitation = {
  chunkId: string;
  snippet: string;
  page?: number;
  section?: string;
};

export type QaAnswer = {
  answer: string;
  citations: QaCitation[];
  confidence: "high" | "medium" | "low" | "insufficient";
  followUpQuestions: string[];
  disclaimer: string;
};

// ---------- AI: Checklist ----------
export type ChecklistItemInput = {
  label: string;
  rationale: string;
  category: "PAYMENT" | "TERMINATION" | "OBLIGATIONS" | "RISK" | "PROCESS" | "PROFESSIONAL_HELP";
};

// ---------- AI: Consultation ----------
export type ConsultationPrep = {
  documentSummary: string;
  keyClauses: string[];
  unclearProvisions: string[];
  importantDates: string[];
  missingInformation: string[];
  questionsForLawyer: string[];
  documentsToBring: string[];
};

// ---------- AI: Comparison ----------
export type ComparisonDiff = {
  category: ClauseCategory | "GENERAL";
  change: "ADDED" | "REMOVED" | "MODIFIED";
  description: string;
  docALocation: string | null;
  docBLocation: string | null;
  whyItMatters: string;
  suggestedQuestions: string[];
};

export type ComparisonResult = {
  documentA: { id: string; name: string };
  documentB: { id: string; name: string };
  summary: string;
  diffs: ComparisonDiff[];
  overallRiskNote: string;
};

// ---------- Document chunking / retrieval ----------
export type DocumentChunk = {
  id: string;
  index: number;
  text: string;
  page?: number;
  section?: string;
  tokenCount: number;
};

// ---------- API contracts ----------
export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
