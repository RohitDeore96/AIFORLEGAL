# Testing

This document describes the testing strategy and how to run tests.

## Strategy

We test at three levels:

1. **Unit tests** (Vitest) — Pure logic: validators, parsers, chunker, retriever, sanitizer, AI output validation, errors, rate limiter.
2. **Integration tests** (Vitest + real Prisma) — Not yet implemented; would test API routes end-to-end with a test database.
3. **Manual E2E** — The skill's `agent-browser` flow can be used to verify the deployed app.

The current focus is on **unit tests for critical business logic**, because that's where bugs cause the most damage (silent hallucination, broken retrieval, prompt-injection bypass, etc.).

## What we test

| Suite | Tests | What it validates |
|---|---|---|
| `tests/chunker.test.ts` | 11 | Sentence splitting, abbreviation handling, token counting, chunk creation, overlap, edge cases (empty input, long sentences) |
| `tests/retriever.test.ts` | 9 | Tokenization (lowercasing, stopword removal, punctuation), TF-IDF retrieval, top-k limit, min-score filtering, empty input |
| `tests/sanitizer.test.ts` | 10 | Document content wrapping, injection pattern detection (5 patterns), clean text not flagged, original text preserved |
| `tests/validator.test.ts` | 10 | Valid PDF/DOCX/TXT acceptance, unsupported MIME rejection, size limit, empty file, magic-byte spoofing, null-byte filename, overly long filename |
| `tests/ai-output.test.ts` | 12 | MockProvider produces valid output for all 7 schemas (summary, clauses, qa, obligations, checklist, consultation, comparison); zod schemas reject invalid input |
| `tests/errors.test.ts` | 13 | Every `Errors.*` factory produces the right code + status; `toClient()` doesn't leak stack |
| `tests/rate-limit.test.ts` | 4 | Token bucket fills, depletes, blocks, isolates per identifier |

## Why these tests?

Each test corresponds to a real failure mode:

- **Chunker tests**: A bug in chunking could split a sentence mid-clause, losing context for the AI.
- **Retriever tests**: A bug here means the AI gets the wrong chunks → wrong answers.
- **Sanitizer tests**: A missed injection pattern means a malicious document could override the system prompt.
- **Validator tests**: A bypassed validator could let a malicious file (EXE disguised as PDF) onto the server.
- **AI output tests**: A permissive zod schema could let an invalid AI response through, breaking the UI or surfacing hallucinated content.
- **Error tests**: A leaked stack trace could expose internal paths to attackers.
- **Rate limit tests**: A broken limiter enables DoS via AI calls (which cost real money).

## What we deliberately don't test

- **UI rendering**: We trust shadcn/ui primitives. Visual regressions are caught manually.
- **Next.js internals**: We trust the framework's routing, RSC, etc.
- **Gemini API responses**: We don't mock Gemini; instead, we test that our `MockProvider` produces schema-valid output, and we trust `GeminiProvider` to do the same since it uses the same zod validation.
- **Prisma queries**: We trust Prisma's parameterized queries. SQL injection is not possible by construction.

## Running tests

```bash
# Run all tests once
bun run test

# Run in watch mode
bun run test:watch

# Run with coverage
bunx vitest run --coverage
```

## Test setup

`tests/setup.ts` sets env vars to test defaults BEFORE any module imports `@/lib/env`:

```ts
process.env.DATABASE_URL = "file::memory:?cache=shared";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.AI_PROVIDER = "mock";
// ...
```

This ensures tests always run with the Mock provider — no Gemini API calls during tests.

## Adding a new test

1. Identify the critical behavior you want to verify.
2. Add a test file in `tests/` or extend an existing one.
3. Run `bun run test` to verify it passes.
4. Add the test to the table above.

## Coverage

Current coverage (run `bunx vitest run --coverage`):

| Directory | Coverage |
|---|---|
| `src/services/documents/` | ~90% (chunker, retriever, sanitizer, validator fully covered) |
| `src/services/ai/prompts/` | Indirect via `ai-output.test.ts` |
| `src/lib/` | ~95% (errors, rate-limit fully covered; env indirectly) |
| `src/services/ai/providers` | Mock fully covered; Gemini/Zai not (would require API mocking) |

## Future improvements

- **Integration tests**: Spin up a test Prisma DB, hit API routes via `fetch`, verify full request lifecycle.
- **E2E tests**: Use Playwright to test the full user flow (sign up → upload → analyze → Q&A → compare).
- **Property-based tests**: For the chunker, generate random documents and verify invariants (e.g., "no chunk exceeds target size + overlap").
- **Snapshot tests**: For AI prompt construction (verify prompts don't drift).
- **Security tests**: Fuzz the validator with malicious inputs (polyglot files, zip bombs, etc.).
