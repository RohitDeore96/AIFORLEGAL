# Deployment

This guide walks you through deploying LegalLens AI to **Vercel**, assuming you've never used Vercel before.

## Prerequisites

1. A GitHub account with the repo pushed (see [PUSH_INSTRUCTIONS.md](./PUSH_INSTRUCTIONS.md))
2. A [Vercel account](https://vercel.com/signup) — free tier is sufficient
3. A [Google Gemini API key](https://aistudio.google.com/apikey) — free tier is sufficient
4. A [Neon Postgres](https://neon.tech) account — free tier is sufficient (replaces the local SQLite database)

## Step-by-step deployment

### 1. Push the repo to GitHub

Follow [`PUSH_INSTRUCTIONS.md`](./PUSH_INSTRUCTIONS.md) to push your local code to `https://github.com/RohitDeore96/AIFORLEGAL`.

### 2. Sign up for Vercel

1. Go to https://vercel.com/signup
2. Click **Continue with GitHub** (recommended — connects your GitHub account)
3. Authorize Vercel to access your repositories

### 3. Import the project

1. On the Vercel dashboard, click **Add New...** → **Project**
2. Find `AIFORLEGAL` in the repository list and click **Import**
3. Vercel auto-detects Next.js — you don't need to change any build settings

### 4. Create a Neon Postgres database

1. Go to https://neon.tech and sign up (free, no credit card)
2. Click **New Project** → name it `aiforlegal` → pick a region close to Vercel's default (Washington DC = `us-east-1`)
3. Once created, click **Connection Details** → **Pooled connection** → copy the connection string
   - It will look like: `postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/aiforlegal?sslmode=require`

### 5. Set up Prisma for Postgres

✅ **Already done.** The committed `prisma/schema.prisma` uses `provider = "postgresql"` — no edit needed.

> **Note**: SQLite doesn't work on Vercel because serverless functions are stateless — they can't share a SQLite file. Postgres (Neon) is the production database.

### 6. Configure environment variables on Vercel

On the Vercel project page:

1. Go to **Settings** → **Environment Variables**
2. Add each of the following:

| Key | Value | Environment |
|---|---|---|
| `DATABASE_URL` | Your Neon connection string (from step 4) | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Generate one with `openssl rand -base64 32` in your terminal | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` (you'll know this after first deploy; for now use placeholder) | Production |
| `AI_PROVIDER` | `gemini` | Production, Preview, Development |
| `GOOGLE_GEMINI_API_KEY` | Your Google AI Studio API key | Production, Preview, Development |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Production, Preview, Development |
| `ALLOW_SIGNUP_VIA_SIGNIN` | `true` (only if you want to allow sign-up via the sign-in form) | Production, Preview |

> **Tip**: For `NEXTAUTH_URL`, you can leave it blank initially. After the first deploy, Vercel will show you the URL — come back and set it.

### 7. Deploy

1. Click **Deploy** on the Vercel project page
2. Wait for the build to finish (usually 1-2 minutes)
3. Vercel will give you a URL like `https://aiforlegal.vercel.app`

### 8. Initialize the database

After the first deploy, you need to create the database tables. Two options:

**Option A: Locally (recommended)**

```bash
# In your local repo
# Temporarily set DATABASE_URL to the Neon production URL
export DATABASE_URL="postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/aiforlegal?sslmode=require"

# Push the schema
bun run db:push

# Reset DATABASE_URL when done
unset DATABASE_URL
```

**Option B: Via Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel link  # link your local repo to the Vercel project
vercel env pull .env.local  # pull env vars locally
bun run db:push
```

### 9. Verify the deployment

1. Visit `https://your-project.vercel.app` — you should see the landing page
2. Click **Sign up**, create an account
3. Upload a small PDF or TXT file (e.g., a sample contract)
4. Check that the summary, clauses, and Q&A features work
5. Visit `https://your-project.vercel.app/api/health` — should return JSON with `status: "ok"` and `provider: "gemini"`

### 10. (Optional) Set up a custom domain

1. On Vercel: **Settings** → **Domains**
2. Add your custom domain (e.g., `legallens.example.com`)
3. Update your DNS provider's CNAME record to point to Vercel
4. Update `NEXTAUTH_URL` env var to your custom domain

## Common Vercel issues & fixes

### "Function execution timed out"

Vercel Hobby tier has a 10-second timeout for serverless functions. AI calls can exceed this on slow days.

**Fix**: Either upgrade to Pro tier (60s timeout), or reduce `maxOutputTokens` in the AI provider, or implement streaming responses.

### "Prisma: Can't reach database server"

Usually a connection string issue. Verify:
- The connection string ends with `?sslmode=require` (Neon requires SSL)
- You're using the **pooled connection** URL (the one with `-pooler` in the hostname)
- The database is in the same region as your Vercel function (Settings → Functions → Region)

### "NextAuth: No secret provided"

You forgot to set `NEXTAUTH_SECRET` in Vercel env vars. Generate one with:

```bash
openssl rand -base64 32
```

And add it to Vercel env vars.

### "AI provider error" / 502

Either your `GOOGLE_GEMINI_API_KEY` is invalid, or you've hit the Gemini free tier quota. Check the function logs:

1. Vercel dashboard → your project → **Logs** tab
2. Filter by `AI_PROVIDER_ERROR`

### Build fails with "Module not found"

You probably forgot to commit a file. Check `git status` locally and push any new files.

## Production checklist

Before going live:

- [ ] Set `NEXTAUTH_SECRET` to a strong random string (not the dev default)
- [ ] Set `NEXTAUTH_URL` to your final production URL
- [ ] Set `AI_PROVIDER=gemini` and `GOOGLE_GEMINI_API_KEY`
- [ ] Swap filesystem storage for Vercel Blob (currently uses local FS, which doesn't persist on Vercel)
- [ ] Set `ALLOW_SIGNUP_VIA_SIGNIN=false` if you don't want public sign-ups (or implement separate sign-up)
- [ ] Add a rate-limit backend (Upstash Redis) for production-grade limiting
- [ ] Configure Vercel's DDoS protection (enabled by default)
- [ ] Set up Vercel analytics (optional)
- [ ] Add a custom domain
- [ ] Set up monitoring (Vercel's built-in or external like Sentry)

## Cost estimate (Vercel Hobby tier)

For a small deployment:

- **Vercel**: Free (100GB bandwidth, 100GB-hours serverless execution)
- **Neon Postgres**: Free (0.5GB storage, 100 compute hours/month)
- **Google Gemini**: Free tier — 15 requests/minute, 1500/day for `gemini-1.5-flash`
- **Total**: $0/month for the first few hundred users

For larger deployments, upgrade to Vercel Pro ($20/mo) and Neon Pro ($19/mo).
