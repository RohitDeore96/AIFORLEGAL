/**
 * Document retriever — finds the most relevant chunks for a query.
 *
 * Strategy: TF-IDF cosine similarity (no external embedding calls needed).
 * Complexity:
 *   - index(): O(C * T) where C = chunks, T = unique tokens per chunk
 *   - retrieve(): O(C * Q) where Q = query tokens
 * This is far cheaper than calling an embedding API per query and is
 * sufficient for a single-document corpus of legal clauses.
 *
 * For multi-document / cross-tenant retrieval, swap in Vertex AI embeddings.
 */
import type { DocumentChunk } from "@/types";

type TermFreq = Map<string, number>;
type IndexedChunk = {
  chunk: DocumentChunk;
  tf: TermFreq; // term frequency (raw counts)
  magnitude: number; // L2 norm of TF vector
};

export class DocumentRetriever {
  private index: IndexedChunk[] = [];
  private df: Map<string, number> = new Map(); // document frequency per term
  private totalChunks = 0;

  constructor(chunks: DocumentChunk[]) {
    this.build(chunks);
  }

  private build(chunks: DocumentChunk[]): void {
    for (const chunk of chunks) {
      const tokens = tokenize(chunk.text);
      const tf = new Map<string, number>();
      for (const t of tokens) {
        tf.set(t, (tf.get(t) ?? 0) + 1);
      }
      // Update DF
      for (const term of tf.keys()) {
        this.df.set(term, (this.df.get(term) ?? 0) + 1);
      }
      const magnitude = Math.sqrt(
        [...tf.values()].reduce((sum, c) => sum + c * c, 0),
      );
      this.index.push({ chunk, tf, magnitude: magnitude || 1 });
      this.totalChunks += 1;
    }
  }

  /**
   * Retrieve top-k chunks for a query.
   * Returns chunks sorted by relevance (descending). If no chunk meets the
   * minimum score threshold, returns empty array — caller must surface the
   * "not found in document" answer rather than hallucinate.
   */
  retrieve(query: string, k = 4, minScore = 0.05): DocumentChunk[] {
    if (this.index.length === 0) return [];
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const queryTf = new Map<string, number>();
    for (const t of queryTokens) queryTf.set(t, (queryTf.get(t) ?? 0) + 1);
    const queryMagnitude = Math.sqrt(
      [...queryTf.values()].reduce((s, c) => s + c * c, 0),
    ) || 1;

    const scores = this.index.map(({ chunk, tf, magnitude }) => {
      let dot = 0;
      for (const [term, qf] of queryTf) {
        const cf = tf.get(term);
        if (!cf) continue;
        const idf = Math.log((this.totalChunks + 1) / ((this.df.get(term) ?? 0) + 1)) + 1;
        dot += qf * cf * idf * idf;
      }
      const cosine = dot / (queryMagnitude * magnitude);
      return { chunk, score: cosine };
    });

    return scores
      .filter((s) => s.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((s) => s.chunk);
  }

  /** Returns all chunks (used when context size is small enough to fit). */
  all(): DocumentChunk[] {
    return this.index.map((i) => i.chunk);
  }
}

/**
 * Tokenizer — lowercase, strip punctuation, split on whitespace.
 * Keeps legal-relevant tokens including section symbols and numbers.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Keep section symbols §, dollar amounts, dates (basic)
    .replace(/[^\w\s$§%.-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
  "at", "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "to", "from", "up", "down",
  "in", "out", "on", "off", "over", "under", "again", "further", "once",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might",
  "shall", "can", "need", "dare", "ought", "used",
  "of", "this", "that", "these", "those", "it", "its", "they", "them",
  "their", "we", "us", "our", "you", "your", "he", "him", "his", "she",
  "her", "i", "me", "my",
  "as", "such", "than", "too", "very", "s", "t", "d", "ll", "m", "o", "re",
  "ve", "y", "ain", "aren", "couldn", "didn", "doesn", "hadn", "hasn",
  "haven", "isn", "ma", "mightn", "mustn", "needn", "shan", "shouldn",
  "wasn", "weren", "won", "wouldn",
]);
