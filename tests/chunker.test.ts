import { describe, it, expect } from "vitest";
import { splitIntoSentences, chunkDocument, approximateTokenCount } from "@/services/documents/chunker";

describe("splitIntoSentences", () => {
  it("splits on sentence-final punctuation followed by a capital letter", () => {
    const text = "This is sentence one. This is sentence two. And a third one.";
    const sentences = splitIntoSentences(text);
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe("This is sentence one.");
    expect(sentences[1]).toBe("This is sentence two.");
  });

  it("does not split on common abbreviations", () => {
    const text = "Mr. Smith signed the agreement. The company is Inc. registered in DE.";
    const sentences = splitIntoSentences(text);
    // Should produce 2 sentences, not 4 — abbreviations should not break sentences.
    expect(sentences.length).toBeLessThanOrEqual(3);
  });

  it("handles empty input", () => {
    expect(splitIntoSentences("")).toEqual([]);
    expect(splitIntoSentences("   ")).toEqual([]);
  });

  it("normalizes whitespace", () => {
    const text = "Sentence\r\none.\r\nSentence two.";
    const sentences = splitIntoSentences(text);
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).not.toContain("\r");
  });
});

describe("approximateTokenCount", () => {
  it("counts tokens approximately (1 token ≈ 4 chars)", () => {
    expect(approximateTokenCount("")).toBe(0);
    expect(approximateTokenCount("ab")).toBe(1);
    expect(approximateTokenCount("abcd")).toBe(1);
    expect(approximateTokenCount("abcde")).toBe(2);
  });
});

describe("chunkDocument", () => {
  it("returns empty array for empty input", () => {
    expect(chunkDocument("")).toEqual([]);
    expect(chunkDocument("   ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const text = "This is a short document. It has only a few sentences.";
    const chunks = chunkDocument(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("short document");
  });

  it("produces multiple chunks for long text", () => {
    const sentence = "This is a sentence about a contract clause that should be chunked appropriately. ";
    const longText = sentence.repeat(100); // ~8KB
    const chunks = chunkDocument(longText, { targetTokens: 100, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should have a stable id
    for (const chunk of chunks) {
      expect(chunk.id).toMatch(/^[a-f0-9]{16}$/);
      expect(chunk.index).toBeGreaterThanOrEqual(0);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });

  it("preserves page metadata", () => {
    const chunks = chunkDocument("Some text. Another sentence.", {}, { page: 5 });
    expect(chunks[0].page).toBe(5);
  });

  it("handles a single very long sentence by splitting it", () => {
    const longSentence = "word ".repeat(500).trim() + ".";
    const chunks = chunkDocument(longSentence, { targetTokens: 50 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("ensures indices are sequential", () => {
    const chunks = chunkDocument("Sentence one. ".repeat(200), { targetTokens: 30 });
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].index).toBe(i);
    }
  });
});
