# How to push your local code to https://github.com/RohitDeore96/AIFORLEGAL

## Why this guide

The AIFORLEGAL repo currently has only an initial commit (a 12-byte README). All the work I built is in `/home/z/my-project/AIFORLEGAL/` on this machine — but it's not yet on GitHub.

You need to push it yourself because **I will not use the GitHub token you shared in chat** (it's compromised — see the security warning at the top of our conversation).

## Step 1: Revoke the leaked token (do this first!)

1. Go to https://github.com/settings/tokens
2. Find the token starting with `ghp_lA5tKG5o...`
3. Click **Revoke**
4. Click **Delete**

## Step 2: Generate a fresh token

1. Go to https://github.com/settings/tokens?type=beta (fine-grained tokens are more secure)
2. Click **Generate new token**
3. Set:
   - **Resource owner**: `RohitDeore96`
   - **Repository access**: Only select repositories → `AIFORLEGAL`
   - **Permissions**:
     - Repository permissions → Contents: **Read and write**
     - Repository permissions → Metadata: **Read-only** (required)
4. Click **Generate token**
5. **Copy the token immediately** — you won't see it again
6. Store it in a password manager — do NOT paste it back into chat

## Step 3: Get the code onto your machine

The code lives at `/home/z/my-project/AIFORLEGAL/` on this sandbox machine. You have two options:

### Option A: Download as a tarball (recommended)

I will create a tarball and put it in `/home/z/my-project/download/`. You download it, extract it, and push to GitHub.

### Option B: Clone the GitHub repo fresh and apply my changes

1. On your machine: `git clone https://github.com/RohitDeore96/AIFORLEGAL.git`
2. Replace the contents with my code (I'll provide a download link)
3. Commit and push

## Step 4: Push to GitHub

On your machine:

```bash
# 1. Navigate to the repo
cd AIFORLEGAL

# 2. Initialize git if needed (skip if you cloned)
# git init
# git remote add origin https://github.com/RohitDeore96/AIFORLEGAL.git

# 3. Authenticate (choose ONE method)

# Method A: HTTPS with token (simplest)
git remote set-url origin https://RohitDeore96:<YOUR_NEW_TOKEN>@github.com/RohitDeore96/AIFORLEGAL.git

# Method B: GitHub CLI (recommended for repeated use)
gh auth login
# → Choose GitHub.com → HTTPS → Yes to Git credentials → Login with browser

# 4. Stage everything
git add .

# 5. Commit
git commit -m "feat: complete AI legal document intelligence platform

- Next.js 16 + TypeScript strict mode + Tailwind 4 + shadcn/ui
- Prisma + SQLite (dev) / Postgres (prod) data layer
- Retrieval-grounded Gemini AI (with Mock + ZAI fallbacks)
- Document upload (PDF/DOCX/TXT) with magic-byte validation
- Features: summary, clauses, obligations, Q&A, comparison, checklist, consultation prep
- Auth (NextAuth + bcrypt) + per-user data isolation
- Prompt-injection defense + hallucination prevention (citation integrity)
- 69 unit tests passing (chunker, retriever, sanitizer, validator, errors, rate-limit, AI output)
- Full docs: README, ARCHITECTURE, SECURITY, TESTING, DEPLOYMENT, AI_WORKFLOW
- Vercel-ready (output: standalone, force-dynamic auth pages)"

# 6. Push
git push -u origin main
# or: git push -u origin master (depending on your default branch name)
```

## Step 5: Verify

1. Visit https://github.com/RohitDeore96/AIFORLEGAL
2. You should see all the files: `src/`, `prisma/`, `tests/`, `docs/`, `README.md`, etc.
3. The commit history should show your new commit on top of the initial commit

## Troubleshooting

### "Authentication failed"

- Your token may not have the right permissions. Re-generate with `Contents: Read and write`.
- Make sure you're using the token (not your password) — GitHub doesn't accept passwords for git operations anymore.

### "Refusing to allow an OAuth App to create or update workflow"

- This happens if your token doesn't have workflow permission. Either add `Workflows: Read and write` to the token, or remove `.github/` directory from the commit.

### "Large file rejected"

- We don't have any large files, but if git complains, check `du -sh node_modules` — make sure `node_modules` is in `.gitignore` (it is).

### "Pre-commit hook failed"

- We don't have pre-commit hooks, so this shouldn't happen. If it does, it's your local git config — bypass with `git commit --no-verify`.

## What's in the commit

The commit will include:

- `src/` — all application code (~70 files)
- `prisma/schema.prisma` — database schema
- `tests/` — 7 test files, 69 tests
- `docs/` — README, ARCHITECTURE, SECURITY, TESTING, DEPLOYMENT, AI_WORKFLOW
- `.env.example` — env template (no real secrets)
- `vitest.config.ts`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs` — config
- `package.json` + `bun.lock` — dependencies
- `LICENSE` — MIT

The commit will NOT include (because `.gitignore` excludes them):

- `node_modules/`
- `.env` (real secrets)
- `.next/` (build output)
- `.storage/` (uploaded files)
- `db/` (SQLite database)
- `dev.log`, `server.log`
