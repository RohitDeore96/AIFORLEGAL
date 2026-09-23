import { describe, it, expect } from "vitest";
import { chunkDocument, splitIntoSentences } from "@/services/documents/chunker";

/**
 * Property-based tests — verify invariants hold for arbitrary inputs.
 *
 * These tests generate random inputs and check that the chunker maintains
 * its invariants regardless of input. This catches edge cases that
 * hand-written tests might miss.
 *
 * We use a lightweight approach (no @property-based testing library)
 * to avoid adding dependencies.
 */

function randomWord(minLen = 2, maxLen = 12): string {
  const len = minLen + Math.floor(Math.random() * (maxLen - minLen));
  return Array.from({ length: len }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join("");
}

function randomSentence(minWords = 3, maxWords = 20): string {
  const count = minWords + Math.floor(Math.random() * (maxWords - minWords));
  return (
    Array.from({ length: count }, () => randomWord()).join(" ") + ". "
  );
}

function randomDocument(sentenceCount: number): string {
  return Array.from({ length: sentenceCount }, () => randomSentence()).join("");
}

describe("Property: Chunking invariants hold for random inputs", () => {
  it("never produces empty chunks", () => {
    for (let trial = 0; trial < 50; trial++) {
      const text = randomDocument(10 + Math.floor(Math.random() * 100));
      const chunks = chunkDocument(text);
      for (const chunk of chunks) {
        expect(chunk.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("chunk indices are always sequential (0, 1, 2, ...)", () => {
    for (let trial = 0; trial < 50; trial++) {
      const text = randomDocument(20 + Math.floor(Math.random() * 200));
      const chunks = chunkDocument(text);
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].index).toBe(i);
      }
    }
  });

  it("every chunk has a valid 16-char hex ID", () => {
    for (let trial = 0; trial < 50; trial++) {
      const text = randomDocument(10 + Math.floor(Math.random() * 50));
      const chunks = chunkDocument(text);
      for (const chunk of chunks) {
        expect(chunk.id).toMatch(/^[a-f0-9]{16}$/);
      }
    }
  });

  it("tokenCount is always positive for non-empty chunks", () => {
    for (let trial = 0; trial < 50; trial++) {
      const text = randomDocument(5 + Math.floor(Math.random() * 100));
      const chunks = chunkDocument(text);
      for (const chunk of chunks) {
        expect(chunk.tokenCount).toBeGreaterThan(0);
      }
    }
  });

  it("concatenated chunk text covers the entire document (lossless)", () => {
    for (let trial = 0; trial < 20; trial++) {
      const text = randomDocument(10);
      const chunks = chunkDocument(text, { targetTokens: 1000, overlapTokens: 0 });
      // Every word from the original should appear in some chunk
      const allChunkText = chunks.map((c) => c.text).join(" ");
      const originalWords = text
        .replace(/[.]/g, "")
        .split(/\s+/)
        .filter(Boolean);
      for (const word of originalWords) {
        expect(allChunkText).toContain(word);
      }
    }
  });

  it("empty input always returns empty array", () => {
    expect(chunkDocument("")).toEqual([]);
    expect(chunkDocument("   ")).toEqual([]);
    expect(chunkDocument("\n\n\n")).toEqual([]);
    expect(chunkDocument("   \n\t  \n  ")).toEqual([]);
  });
});

describe("Property: Sentence splitting invariants", () => {
  it("never produces empty sentences for non-empty input", () => {
    for (let trial = 0; trial < 50; trial++) {
      const text = randomDocument(10);
      const sentences = splitIntoSentences(text);
      for (const s of sentences) {
        expect(s.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("rejoining sentences approximates the original", () => {
    for (let trial = 0; trial < 20; trial++) {
      const text = randomDocument(10).trim();
      const sentences = splitIntoSentences(text);
      const rejoined = sentences.join(" ");
      // Word count should be approximately preserved
      const originalWords = text.split(/\s+/).filter(Boolean).length;
      const rejoinedWords = rejoined.split(/\s+/).filter(Boolean).length;
      expect(Math.abs(originalWords - rejoinedWords)).toBeLessThan(5);
    }
  });
});

describe("Property: Chunker handles edge cases gracefully", () => {
  it("handles very long single sentences", () => {
    const longSentence = "word ".repeat(5000).trim() + ".";
    expect(() => chunkDocument(longSentence)).not.toThrow();
    const chunks = chunkDocument(longSentence, { targetTokens: 50 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("handles Unicode text", () => {
    const text = "This agreement is governed by French law (droit français). Conformément à la loi. 日本語のテキスト。";
    expect(() => chunkDocument(text)).not.toThrow();
    const chunks = chunkDocument(text);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("handles text with only punctuation", () => {
    const text = "... ??? !!! ...";
    expect(() => chunkDocument(text)).not.toThrow();
  });

  it("handles text with legal section symbols (§)", () => {
    const text = "Section §1. The parties agree. §2. Payment terms apply. §3. Termination allowed.";
    const sentences = splitIntoSentences(text);
    expect(sentences.length).toBeGreaterThan(0);
  });

  it("handles extremely repetitive text", () => {
    const text = "Term. ".repeat(1000);
    expect(() => chunkDocument(text)).not.toThrow();
  });
});
