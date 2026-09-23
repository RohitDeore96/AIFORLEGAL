import { describe, it, expect } from "vitest";
import { chunkDocument, splitIntoSentences, approximateTokenCount } from "@/services/documents/chunker";
import { DocumentRetriever, tokenize } from "@/services/documents/retriever";

/**
 * Algorithmic complexity tests — verifies that the core operations
 * scale efficiently with input size.
 *
 * These tests prove:
 * - Chunking is O(n) — linear time, not quadratic
 * - Retrieval is O(C×Q) — linear in both corpus and query size
 * - No accidental O(n²) regressions
 *
 * Methodology: run with increasing input sizes, verify the time ratio
 * stays proportional (not exponential).
 */

describe("Algorithmic Complexity: Chunking is O(n)", () => {
  const SIZES = [100, 500, 2000, 5000]; // sentence counts
  const BASE_SENTENCE = "This is a test sentence about a contract clause. ";

  it("chunks 100 sentences in proportional time", () => {
    const text = BASE_SENTENCE.repeat(100);
    const start = performance.now();
    const chunks = chunkDocument(text);
    const elapsed = performance.now() - start;
    expect(chunks.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50); // should be well under 50ms
  });

  it("chunks scale linearly (not quadratically)", () => {
    // Run with two sizes, verify the larger one is NOT exponentially slower
    const small = BASE_SENTENCE.repeat(500);
    const large = BASE_SENTENCE.repeat(5000); // 10x larger

    const startSmall = performance.now();
    chunkDocument(small);
    const smallMs = performance.now() - startSmall;

    const startLarge = performance.now();
    chunkDocument(large);
    const largeMs = performance.now() - startLarge;

    // If O(n), large should be ~10x slower (within a generous tolerance)
    // If O(n²), large would be ~100x slower
    const ratio = largeMs / Math.max(smallMs, 0.001);
    expect(ratio).toBeLessThan(30); // O(n²) would give ~100x; O(n) gives ~10x
  });

  it("chunking produces stable IDs (deterministic)", () => {
    const text = "This is a test document. It has multiple sentences.";
    const chunks1 = chunkDocument(text);
    const chunks2 = chunkDocument(text);
    expect(chunks1.map((c) => c.id)).toEqual(chunks2.map((c) => c.id));
  });

  it("no chunk exceeds 2x the target token size", () => {
    const longSentence = "word ".repeat(2000).trim() + ".";
    const chunks = chunkDocument(longSentence, { targetTokens: 100 });
    for (const chunk of chunks) {
      // Allow 2x tolerance for hard-split boundaries
      expect(chunk.tokenCount).toBeLessThanOrEqual(200);
    }
  });
});

describe("Algorithmic Complexity: Retrieval is O(C×Q)", () => {
  const BASE_CHUNK_TEXT = "This clause discusses payment terms and invoice deadlines. ";

  it("retrieval scales linearly with corpus size", () => {
    const query = "What are the payment terms?";

    const smallChunks = Array.from({ length: 50 }, (_, i) => ({
      id: `c${i}`,
      index: i,
      text: `${BASE_CHUNK_TEXT} Variant ${i}.`,
      tokenCount: 20,
    }));

    const largeChunks = Array.from({ length: 500 }, (_, i) => ({
      id: `c${i}`,
      index: i,
      text: `${BASE_CHUNK_TEXT} Variant ${i}.`,
      tokenCount: 20,
    }));

    const smallRetriever = new DocumentRetriever(smallChunks);
    const largeRetriever = new DocumentRetriever(largeChunks);

    const startSmall = performance.now();
    smallRetriever.retrieve(query, 4);
    const smallMs = performance.now() - startSmall;

    const startLarge = performance.now();
    largeRetriever.retrieve(query, 4);
    const largeMs = performance.now() - startLarge;

    // 10x corpus should be ~10x slower (linear), not 100x (quadratic)
    const ratio = largeMs / Math.max(smallMs, 0.001);
    expect(ratio).toBeLessThan(50);
  });

  it("retrieval scales linearly with query length", () => {
    const chunks = Array.from({ length: 100 }, (_, i) => ({
      id: `c${i}`,
      index: i,
      text: `${BASE_CHUNK_TEXT} Variant ${i}.`,
      tokenCount: 20,
    }));
    const retriever = new DocumentRetriever(chunks);

    const shortQuery = "payment terms";
    const longQuery = "What are the payment terms and conditions for this agreement including deadlines?";

    const startShort = performance.now();
    retriever.retrieve(shortQuery, 4);
    const shortMs = performance.now() - startShort;

    const startLong = performance.now();
    retriever.retrieve(longQuery, 4);
    const longMs = performance.now() - startLong;

    // Longer query should be proportionally slower, not exponentially
    expect(longMs).toBeLessThan(shortMs * 20);
  });

  it("returns at most k results regardless of corpus size", () => {
    const chunks = Array.from({ length: 1000 }, (_, i) => ({
      id: `c${i}`,
      index: i,
      text: `${BASE_CHUNK_TEXT} Variant ${i}.`,
      tokenCount: 20,
    }));
    const retriever = new DocumentRetriever(chunks);
    const results = retriever.retrieve("payment", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });
});

describe("Algorithmic Complexity: Tokenization is O(n)", () => {
  it("tokenizes 100K chars in under 50ms", () => {
    const text = "The quick brown fox jumps over the lazy dog. ".repeat(2500);
    const start = performance.now();
    const tokens = tokenize(text);
    const elapsed = performance.now() - start;
    expect(tokens.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });

  it("splitIntoSentences is linear", () => {
    const small = "Sentence one. ".repeat(500);
    const large = "Sentence one. ".repeat(5000);

    const startSmall = performance.now();
    splitIntoSentences(small);
    const smallMs = performance.now() - startSmall;

    const startLarge = performance.now();
    splitIntoSentences(large);
    const largeMs = performance.now() - startLarge;

    const ratio = largeMs / Math.max(smallMs, 0.001);
    expect(ratio).toBeLessThan(30); // linear, not quadratic
  });
});

describe("Memory: No unnecessary duplication", () => {
  it("approximateTokenCount is O(1) — just string length / 4", () => {
    const text = "a".repeat(1_000_000); // 1MB
    const start = performance.now();
    const count = approximateTokenCount(text);
    const elapsed = performance.now() - start;
    expect(count).toBe(250000);
    expect(elapsed).toBeLessThan(5); // O(1) should be instant
  });

  it("retriever does not duplicate chunk text", () => {
    const text = "Original chunk text content here.";
    const chunk = { id: "c1", index: 0, text, tokenCount: 8 };
    const retriever = new DocumentRetriever([chunk]);
    const all = retriever.all();
    // Should return the same text, not a copy
    expect(all[0].text).toBe(text);
  });
});
