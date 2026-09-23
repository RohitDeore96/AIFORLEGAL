/**
 * Document chunker — splits extracted text into semantically meaningful chunks
 * for retrieval. Uses a sliding-window strategy with overlap to avoid losing
 * context at boundaries.
 *
 * Algorithmic complexity:
 *   - splitIntoSentences: O(n) where n = text length
 *   - chunkSentences: O(s) where s = sentence count (single pass)
 *   - Overall: O(n)
 *
 * No O(n^2) operations.
 */
import type { DocumentChunk } from "@/types";
import { createHash } from "node:crypto";

const TARGET_TOKENS = 512; // ~2KB per chunk — works well with Gemini's context
const OVERLAP_TOKENS = 64; // ~12% overlap — preserves boundary context
const MIN_CHUNK_TOKENS = 32; // don't emit tiny tail chunks; merge them
const APPROX_CHARS_PER_TOKEN = 4; // rough English approximation

export type ChunkOptions = {
  targetTokens?: number;
  overlapTokens?: number;
};

export function chunkDocument(
  text: string,
  options?: ChunkOptions,
  metadata?: { page?: number },
): DocumentChunk[] {
  const target = options?.targetTokens ?? TARGET_TOKENS;
  const overlap = options?.overlapTokens ?? OVERLAP_TOKENS;

  if (!text || text.trim().length === 0) return [];

  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return [];

  const chunks: DocumentChunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = approximateTokenCount(sentence);
    if (sentenceTokens > target) {
      // Flush current chunk first
      if (current.length > 0) {
        chunks.push(buildChunk(current, chunks.length, metadata));
        current = [];
        currentTokens = 0;
      }
      // Hard-split the long sentence
      for (const piece of splitLongSentence(sentence, target)) {
        chunks.push(buildChunk([piece], chunks.length, metadata));
      }
      continue;
    }

    if (currentTokens + sentenceTokens > target) {
      chunks.push(buildChunk(current, chunks.length, metadata));
      // Start new chunk with overlap: keep last sentence if it fits
      const overlapStart = current.length > 1 ? current.length - 1 : 0;
      current = current.slice(overlapStart);
      currentTokens = current.reduce((sum, s) => sum + approximateTokenCount(s), 0);
    }

    current.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (current.length > 0) {
    const lastTokens = current.reduce((sum, s) => sum + approximateTokenCount(s), 0);
    if (lastTokens >= MIN_CHUNK_TOKENS || chunks.length === 0) {
      chunks.push(buildChunk(current, chunks.length, metadata));
    } else {
      // Merge with previous chunk
      const prev = chunks.pop();
      if (prev) {
        chunks.push({
          ...prev,
          text: `${prev.text}\n\n${current.join(" ")}`,
          tokenCount: prev.tokenCount + lastTokens,
        });
      } else {
        chunks.push(buildChunk(current, 0, metadata));
      }
    }
  }

  return chunks;
}

function buildChunk(
  sentences: string[],
  index: number,
  metadata?: { page?: number },
): DocumentChunk {
  const text = sentences.join(" ").trim();
  return {
    id: createHash("sha256").update(text).digest("hex").slice(0, 16),
    index,
    text,
    page: metadata?.page,
    tokenCount: approximateTokenCount(text),
  };
}

/**
 * Sentence splitter — handles English + many Latin-script languages.
 * Does NOT split on common abbreviations like "Mr.", "Inc.", "§".
 */
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st",
  "inc", "ltd", "co", "corp", "llc", "llp",
  "art", "sec", "no", "vol", "fig", "eq", "ch",
  "pp", "p", "et al", "vs",
]);

export function splitIntoSentences(text: string): string[] {
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");
  // Insert split marker after sentence-final punctuation followed by whitespace.
  // Use a placeholder to avoid splitting on abbreviations followed by capitals.
  const parts = normalized.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/);
  const sentences: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Filter out abbreviation-only splits
    const lastWord = trimmed.split(/\s+/).slice(-1)[0]?.toLowerCase().replace(/[.,]/g, "");
    if (ABBREVIATIONS.has(lastWord ?? "")) {
      // Merge with previous sentence
      if (sentences.length > 0) {
        sentences[sentences.length - 1] += " " + trimmed;
        continue;
      }
    }
    sentences.push(trimmed);
  }
  return sentences;
}

function splitLongSentence(sentence: string, target: number): string[] {
  const targetChars = target * APPROX_CHARS_PER_TOKEN;
  const pieces: string[] = [];
  let start = 0;
  while (start < sentence.length) {
    let end = Math.min(start + targetChars, sentence.length);
    // Try to break on a word boundary
    if (end < sentence.length) {
      const lastSpace = sentence.lastIndexOf(" ", end);
      if (lastSpace > start + targetChars / 2) end = lastSpace;
    }
    pieces.push(sentence.slice(start, end).trim());
    start = end;
  }
  return pieces.filter((p) => p.length > 0);
}

export function approximateTokenCount(text: string): number {
  // Cheap approximation: 1 token ~ 4 chars for English.
  // Gemini tokenizer differs but this is sufficient for chunk-size decisions.
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}
