import { describe, it, expect } from "vitest";
import { DocumentRetriever, tokenize } from "@/services/documents/retriever";
import type { DocumentChunk } from "@/types";

function makeChunk(id: string, text: string, page?: number): DocumentChunk {
  return { id, index: 0, text, page, tokenCount: text.length / 4 };
}

describe("tokenize", () => {
  it("lowercases and strips punctuation", () => {
    const tokens = tokenize("The QUICK brown fox jumped!");
    expect(tokens).toContain("quick");
    expect(tokens).toContain("brown");
    expect(tokens).toContain("fox");
    expect(tokens).toContain("jumped");
    expect(tokens).not.toContain("the"); // stopword
  });

  it("removes stopwords", () => {
    const tokens = tokenize("the and or but with");
    expect(tokens).toHaveLength(0);
  });

  it("handles empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("DocumentRetriever", () => {
  it("returns empty array for empty index", () => {
    const r = new DocumentRetriever([]);
    expect(r.retrieve("anything", 5)).toEqual([]);
    expect(r.all()).toEqual([]);
  });

  it("returns empty array for empty query", () => {
    const r = new DocumentRetriever([makeChunk("c1", "This is a contract about payment terms.")]);
    expect(r.retrieve("", 5)).toEqual([]);
  });

  it("retrieves the most relevant chunk", () => {
    const chunks = [
      makeChunk("c1", "This agreement is governed by the laws of the State of California."),
      makeChunk("c2", "Payment terms are net thirty days from invoice date."),
      makeChunk("c3", "Either party may terminate this agreement for material breach."),
    ];
    const r = new DocumentRetriever(chunks);
    const results = r.retrieve("What are the payment terms?", 1);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("c2");
  });

  it("respects the top-k limit", () => {
    const chunks = Array.from({ length: 10 }, (_, i) =>
      makeChunk(`c${i}`, `This document discusses payment terms and invoices. Chunk ${i}.`),
    );
    const r = new DocumentRetriever(chunks);
    const results = r.retrieve("payment terms", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("filters out chunks below the minimum score", () => {
    const chunks = [makeChunk("c1", "This is about confidentiality and trade secrets.")];
    const r = new DocumentRetriever(chunks);
    const results = r.retrieve("completely unrelated query about quantum physics", 5, 0.9);
    expect(results).toEqual([]);
  });

  it("returns all chunks via .all()", () => {
    const chunks = [makeChunk("c1", "text one"), makeChunk("c2", "text two")];
    const r = new DocumentRetriever(chunks);
    expect(r.all()).toHaveLength(2);
  });
});
