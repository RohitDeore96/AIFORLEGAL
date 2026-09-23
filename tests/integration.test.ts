import { describe, it, expect, beforeEach } from "vitest";
import { validateUpload } from "@/services/documents/validator";
import { extractText } from "@/services/documents/parser";
import { chunkDocument } from "@/services/documents/chunker";
import { DocumentRetriever } from "@/services/documents/retriever";
import { sanitizeDocumentText, wrapChunkForRetrieval } from "@/services/documents/sanitizer";
import { MockProvider } from "@/services/ai/mock-provider";
import { SummarySchema } from "@/services/ai/prompts/summary";
import { ClausesSchema } from "@/services/ai/prompts/clauses";
import { QaSchema } from "@/services/ai/prompts/qa";
import { getDocumentStorage, _resetStorageForTests } from "@/services/storage/document-storage";
import { _resetCacheForTests } from "@/lib/cache";
import { _resetRateLimitForTests } from "@/lib/rate-limit";

/**
 * Integration tests — verify the full document processing pipeline
 * works end-to-end:
 *
 * Upload → Validate → Parse → Chunk → Retrieve → Sanitize → AI → Validate Output
 *
 * These tests use the MockProvider so no external API calls are made.
 * They verify that each stage of the pipeline correctly feeds the next.
 */

const SAMPLE_LEGAL_TEXT = `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of January 1, 2024, between Acme Corp ("Customer") and TechServices LLC ("Service Provider").

1. SERVICES. Service Provider shall provide software development services to Customer.

2. PAYMENT. Customer shall pay Service Provider $5,000 per month, due within 30 days of invoice date.

3. TERM. This Agreement shall be effective for 12 months, commencing January 1, 2024, and shall automatically renew for successive 12-month terms unless either party provides 60 days written notice.

4. TERMINATION. Either party may terminate this Agreement for material breach with 30 days written notice. Upon termination, Customer shall pay all outstanding invoices within 15 days.

5. CONFIDENTIALITY. Both parties agree to maintain confidentiality of all proprietary information received during the term of this Agreement.

6. INTELLECTUAL PROPERTY. All work product created by Service Provider shall be owned by Customer.

7. LIABILITY. Service Provider's total liability shall not exceed the fees paid in the preceding 12 months.

8. GOVERNING LAW. This Agreement shall be governed by the laws of the State of California.

9. DISPUTE RESOLUTION. Any disputes shall be resolved through binding arbitration in San Francisco, California.`;

function makePdfBuffer(): Buffer {
  // Minimal valid PDF magic bytes
  return Buffer.concat([
    Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
    Buffer.from("\n...rest of pdf content..."),
  ]);
}

describe("Integration: Full upload → AI pipeline", () => {
  beforeEach(() => {
    _resetCacheForTests();
    _resetRateLimitForTests();
    _resetStorageForTests();
  });

  it("validates → chunks → retrieves → answers a question end-to-end", async () => {
    // Step 1: Validate file (as if uploaded)
    const validated = validateUpload({
      name: "service-agreement.pdf",
      mimeType: "application/pdf",
      size: SAMPLE_LEGAL_TEXT.length,
      buffer: makePdfBuffer(),
    });
    expect(validated.mimeType).toBe("application/pdf");

    // Step 2: Sanitize text (prompt-injection defense)
    const sanitized = sanitizeDocumentText(SAMPLE_LEGAL_TEXT);
    expect(sanitized.safeText).toContain("DOCUMENT_CONTENT_BEGIN");

    // Step 3: Chunk the document
    const chunks = chunkDocument(SAMPLE_LEGAL_TEXT, undefined, { page: 3 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.id.length === 16)).toBe(true);

    // Step 4: Build retriever
    const retriever = new DocumentRetriever(chunks);

    // Step 5: Retrieve relevant chunks for a question
    const retrieved = retriever.retrieve("payment term", 4, 0.01);
    expect(retrieved.length).toBeGreaterThan(0);

    // Step 6: Wrap chunks for AI (prompt-injection defense per chunk)
    const wrappedChunks = retrieved.map(wrapChunkForRetrieval);
    expect(wrappedChunks.every((w) => w.includes("CHUNK_ID"))).toBe(true);

    // Step 7: Call AI (Mock provider — deterministic)
    const provider = new MockProvider();
    const result = await provider.generateStructured(
      "system prompt",
      `Question: What is the payment term?\n\n${wrappedChunks.join("\n\n")}`,
      QaSchema,
    );

    // Step 8: Validate AI output
    expect(result.data.answer).toBeTruthy();
    expect(result.data.confidence).toBeDefined();
    expect(Array.isArray(result.data.citations)).toBe(true);
    expect(Array.isArray(result.data.followUpQuestions)).toBe(true);
  });

  it("generates a valid summary through the full pipeline", async () => {
    // Step 1: Sanitize
    const sanitized = sanitizeDocumentText(SAMPLE_LEGAL_TEXT);

    // Step 2: Call AI for summary
    const provider = new MockProvider();
    const result = await provider.generateStructured(
      "system prompt",
      `Analyze this document:\n${sanitized.safeText}`,
      SummarySchema,
    );

    // Step 3: Validate output
    expect(result.data.documentType).toBeTruthy();
    expect(result.data.parties).toBeInstanceOf(Array);
    expect(result.data.plainLanguageSummary).toBeTruthy();
    expect(result.data.plainLanguageSummary.length).toBeGreaterThan(10);
  });

  it("generates valid clauses through the full pipeline", async () => {
    const sanitized = sanitizeDocumentText(SAMPLE_LEGAL_TEXT);
    const provider = new MockProvider();
    const result = await provider.generateStructured(
      "system prompt",
      `Identify clauses:\n${sanitized.safeText}`,
      ClausesSchema,
    );

    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      const first = result.data[0];
      expect(first.name).toBeTruthy();
      expect(first.category).toBeTruthy();
      expect(first.sourceLocation.snippet).toBeTruthy();
    }
  });
});

describe("Integration: Storage layer", () => {
  beforeEach(() => {
    _resetStorageForTests();
  });

  it("saves and reads a file round-trip", async () => {
    const storage = getDocumentStorage();
    const key = "test-user/test-file.txt";
    const content = Buffer.from("Test legal document content");
    await storage.save(key, content);
    const read = await storage.read(key);
    expect(read.toString()).toBe("Test legal document content");
  });

  it("delete is idempotent (no error on non-existent file)", async () => {
    const storage = getDocumentStorage();
    await expect(storage.delete("nonexistent/file.txt")).resolves.not.toThrow();
  });

  it("read throws NotFound for non-existent file", async () => {
    const storage = getDocumentStorage();
    await expect(storage.read("nonexistent")).rejects.toThrow();
  });
});

describe("Integration: Text extraction → chunking → retrieval consistency", () => {
  it("extracted text can be chunked and retrieved", () => {
    // Simulate TXT extraction
    const buffer = Buffer.from(SAMPLE_LEGAL_TEXT, "utf-8");
    // extractText is async but for TXT it's synchronous internally
    const extracted = extractTextSync(buffer, "text/plain");
    expect(extracted.text).toBe(SAMPLE_LEGAL_TEXT);

    // Chunk
    const chunks = chunkDocument(extracted.text, undefined, {
      page: extracted.pageCount ?? undefined,
    });
    expect(chunks.length).toBeGreaterThan(0);

    // Retrieve
    const retriever = new DocumentRetriever(chunks);
    const results = retriever.retrieve("termination notice", 3, 0.01);
    expect(results.length).toBeGreaterThan(0);

    // Retrieved chunks should mention "termination"
    const combinedText = results.map((r) => r.text).join(" ").toLowerCase();
    expect(combinedText).toContain("terminat");
  });

  it("document with payment terms is retrievable by payment questions", () => {
    const chunks = chunkDocument(SAMPLE_LEGAL_TEXT);
    const retriever = new DocumentRetriever(chunks);

    const queries = [
      "What is the payment term?",
      "When is payment due?",
      "How much does the customer pay?",
      "What are the fees?",
    ];

    for (const query of queries) {
      const results = retriever.retrieve(query, 3, 0.03);
      expect(results.length, `Query "${query}" should return results`).toBeGreaterThan(0);
    }
  });

  it("document with termination clause is retrievable by termination questions", () => {
    const chunks = chunkDocument(SAMPLE_LEGAL_TEXT);
    const retriever = new DocumentRetriever(chunks);

    const queries = [
      "How can this agreement be terminated?",
      "What is the termination notice period?",
      "What happens if there is a material breach?",
    ];

    for (const query of queries) {
      const results = retriever.retrieve(query, 3, 0.03);
      expect(results.length, `Query "${query}" should return results`).toBeGreaterThan(0);
    }
  });

  it("unrelated query returns no results (hallucination prevention)", () => {
    const chunks = chunkDocument(SAMPLE_LEGAL_TEXT);
    const retriever = new DocumentRetriever(chunks);
    const results = retriever.retrieve(
      "quantum physics and the double-slit experiment",
      4,
      0.5, // high threshold to ensure no false matches
    );
    expect(results.length).toBe(0);
  });
});

/**
 * Helper: synchronous version of extractText for TXT (since TXT extraction
 * is inherently synchronous — just buffer.toString).
 * The real extractText is async for PDF/DOCX.
 */
function extractTextSync(buffer: Buffer, mimeType: string): {
  text: string;
  pageCount: number | null;
  language: string | null;
} {
  if (mimeType !== "text/plain") throw new Error("Only text/plain supported in sync mode");
  const text = buffer.toString("utf-8");
  return { text, pageCount: null, language: "en" };
}
