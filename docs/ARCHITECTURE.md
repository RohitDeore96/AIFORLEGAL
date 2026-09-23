# Architecture

This document describes the architecture of LegalLens AI in depth.

## High-level diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (Client)                       │
│  React 19 + Next.js 16 App Router + TanStack Query + Tailwind│
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge / Node Runtime                │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │  Middleware │  │ App Routes │  │  API Routes│              │
│  │  (auth gate)│  │  (SSR/RSC) │  │  (/api/*)  │              │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘              │
│        │              │              │                      │
│        └──────────────┴──────────────┘                     │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────┐         │
│  │              Services Layer (pure)             │         │
│  │  ┌─────────────┐  ┌──────────┐  ┌──────────┐  │         │
│  │  │ AI Service  │  │ Document │  │ Storage  │  │         │
│  │  │ (provider   │  │ Pipeline │  │ (FS/Blob)│  │         │
│  │  │  abstraction)│ └──────────┘  └──────────┘  │         │
│  │  └──────┬──────┘                               │         │
│  │         │                                      │         │
│  │         ▼                                      │         │
│  │  ┌──────────────┐                              │         │
│  │  │ AiProvider   │ ← GeminiProvider / Zai / Mock│         │
│  │  └──────────────┘                              │         │
│  └────────────────────────────────────────────────┘         │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────┐         │
│  │             Prisma Client (typed)              │         │
│  └────────────────────┬───────────────────────────┘         │
└────────────────────────┼────────────────────────────────────┘
                         ▼
              ┌──────────────────────┐
              │  Database            │
              │  (SQLite dev /       │
              │   Postgres prod)     │
              └──────────────────────┘
                           │
                           ▼ (AI calls only)
              ┌──────────────────────┐
              │  Google Gemini API   │
              └──────────────────────┘
```

## Layer responsibilities

### 1. Presentation layer (`src/app/`, `src/components/`)

- **Routes** map URL paths to React Server Components (RSC).
- Server components fetch initial data and pass to client components.
- Client components (`'use client'`) handle interactivity, optimistic updates, and API calls via TanStack Query.
- shadcn/ui primitives keep the visual language consistent.
- The `(app)` route group wraps all authenticated pages with a shared sidebar layout and `force-dynamic` rendering.

### 2. API layer (`src/app/api/`)

- Thin HTTP handlers — they parse input, call services, and return `ApiResponse<T>`.
- Each handler:
  1. Calls `requireUserId()` for auth.
  2. Validates input via zod.
  3. Calls a service.
  4. Returns `ok(data)` or `fail(err)` (never raw errors).
- No business logic lives here — all logic is in services.

### 3. Services layer (`src/services/`)

Stateless, testable, pure functions/classes. Each service has one responsibility:

| Service | Responsibility |
|---|---|
| `services/ai/` | AI provider abstraction, prompt construction, output validation, high-level `aiService` facade |
| `services/documents/validator.ts` | File validation (MIME, magic-bytes, size, filename) |
| `services/documents/parser.ts` | Text extraction from PDF/DOCX/TXT |
| `services/documents/chunker.ts` | Sliding-window sentence-aware chunking |
| `services/documents/retriever.ts` | TF-IDF retrieval (no external embedding API) |
| `services/documents/sanitizer.ts` | Prompt-injection defense |
| `services/storage/` | Filesystem storage (swappable interface) |
| `services/auth/` | NextAuth config + session helpers |

### 4. Data layer (`prisma/`, `src/lib/db.ts`)

- Prisma schema defines all tables: `User`, `Document`, `Analysis`, `QaMessage`, `ChecklistItem`, `Comparison`, `Account`, `Session`, `VerificationToken`.
- Single Prisma client instance (singleton via globalThis cache for Next.js HMR).
- All queries are scoped by `userId` to enforce user isolation.

### 5. Cross-cutting (`src/lib/`)

- `env.ts` — typed env access via zod
- `errors.ts` — AppError class with typed codes; never leaks internals
- `rate-limit.ts` — in-memory token bucket
- `api-response.ts` — consistent `{ ok, data | error }` envelope
- `format.ts` — UI-only formatting helpers

## Request lifecycle (example: upload)

```
1. Browser POST /api/documents (multipart/form-data with file)
2. Middleware (src/middleware.ts):
   - Check session JWT
   - If no session and path requires auth → redirect to /sign-in
3. API route handler (src/app/api/documents/route.ts):
   - requireUserId() → throws if no session
   - rateLimit() check
   - Parse FormData, extract File
   - validateUpload(): MIME, magic-bytes, size, filename
   - Compute sha256 checksum
   - storage.save() → write to disk under {userId}/{checksum}.ext
   - extractText(): pdf-parse / mammoth / utf-8
   - chunkDocument(): build chunks (in-memory, not persisted)
   - db.document.create() with status=READY, textContent cached
   - Return ok({ id, status, ... })
4. Browser receives response, navigates to /documents/{id}/summary
```

## Request lifecycle (example: Q&A)

```
1. Browser POST /api/documents/{id}/qa { question: "..." }
2. Middleware → auth check
3. API route handler:
   - requireUserId()
   - Load document (scoped by userId — 404 if not owned)
   - rateLimit("qa:{userId}:{docId}", 20)
   - Validate body with zod
   - chunkDocument(doc.textContent) — rebuild chunks (cheap, O(n))
   - DocumentRetriever.retrieve(question, k=4, minScore=0.05)
   - If 0 chunks → return "Not found" without AI call
   - Otherwise:
     - aiService.answerQuestion(question, retrievedChunks)
       → builds prompt with sanitized chunk wrappers
       → calls AiProvider.generateStructured()
       → validates output against QaSchema (zod)
       → strips invalid citations (chunk IDs not in retrieved set)
     - Persist QaMessage(user) + QaMessage(assistant) with citations
     - Return ok({ answer, citations, confidence, followUpQuestions, disclaimer })
4. Browser optimistically adds user message; on success, appends assistant message
```

## AI provider abstraction

```typescript
// src/services/ai/provider.ts
export interface AiProvider {
  generateStructured<T>(
    systemInstruction: string,
    userPrompt: string,
    schema: ZodType<T>,
    options?: AiGenerateOptions,
  ): Promise<AiStructuredResult<T>>;
  generateText(...): Promise<AiTextResult>;
}
```

The factory picks the implementation based on `AI_PROVIDER` env var:

- `gemini` → GeminiProvider (uses `@google/generative-ai`, sets `responseMimeType: "application/json"`)
- `zai` → ZaiProvider (uses `z-ai-web-dev-sdk`, parses JSON from text response)
- `mock` → MockProvider (deterministic stubs, no network calls)

The rest of the codebase depends only on the `AiProvider` interface. To add a new provider (e.g., Anthropic Claude), implement the interface and add a case to the factory.

## Why TF-IDF (not embeddings)?

For a single-document corpus (typical use case), TF-IDF cosine similarity is:

- **Free** — no external API call per query
- **Fast** — O(C × Q) where C is chunks and Q is query tokens
- **Sufficient** — legal documents are vocabulary-dense; term overlap is a strong signal
- **Citation-friendly** — we can show exactly which terms matched

For multi-document corpora or cross-tenant retrieval, swap `DocumentRetriever` for an embedding-based retriever (Vertex AI `text-embedding-004`). The interface is the same.

## Caching strategy

| Operation | Cached where | Invalidation |
|---|---|---|
| AI summary/clauses/obligations/consultation | `Analysis` table | `?force=true` query param |
| AI comparison | `Comparison` table | Auto-invalidates if either doc changes (delete cascade) |
| Document text | `Document.textContent` column | Never (deleted with document) |
| Q&A history | `QaMessage` table | Deleted with document |
| Checklist | `ChecklistItem` table | Regenerated on demand |

## Error handling

- All errors thrown in services are `AppError` instances with typed `code` and `statusCode`.
- The `fail()` helper in `api-response.ts` catches unknown errors and converts them to `INTERNAL` errors.
- Server-side logs include the full cause; client-side responses include only `{ code, message }`.
- No stack traces ever reach the client.

## Type safety

- `tsconfig.json` has `"strict": true` and `"noImplicitAny": false` (the latter is needed because Next.js's type inference in some places relies on implicit any; we override per-file with explicit types where it matters).
- All AI outputs are validated with zod schemas before being returned to the caller.
- All env access goes through `env.ts` (zod-validated).
- All API request bodies are validated with zod before being processed.
