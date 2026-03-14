# GLearn — Cloud Deployment Guide

## Architecture

```
[Your Mac]                    [Cloud — Free Tier]
  Claude Desktop
       |                      GitHub Pages (Frontend)
  MCP Server (local)  ──────► Cloud Run (Backend)
  (stdio transport)                  |
                               Supabase (PostgreSQL)
```

## Step 1 — Set up Supabase (Database)

1. Go to https://supabase.com → New project → name it `gleam`
2. Once created: **Settings → Database → Connection string → URI**
3. Copy the URI (looks like `postgresql://postgres:[pass]@db.[id].supabase.co:5432/postgres`)
4. Append `?sslmode=require` to the end
5. Go to **SQL Editor** and run the Alembic migration manually:

```sql
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT '📚',
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tech_stack JSONB DEFAULT '[]',
    links JSONB DEFAULT '{}',
    resume_bullets JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Step 2 — Set up GCP

1. Create a GCP project (or use an existing one)
2. Enable APIs:
   ```bash
   gcloud services enable run.googleapis.com containerregistry.googleapis.com
   ```
3. Create a Service Account for GitHub Actions:
   ```bash
   gcloud iam service-accounts create github-actions --display-name="GitHub Actions"
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```
4. Copy `key.json` content — you'll need it for GitHub Secrets

## Step 3 — Push to GitHub

1. Create a new repo named `GLearn` on GitHub (public or private)
2. Enable GitHub Pages: **Settings → Pages → Source: gh-pages branch**
3. Add these **GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Contents of `key.json` (the whole JSON) |
| `DATABASE_URL` | Your Supabase connection URI |
| `VITE_API_URL` | Cloud Run URL (fill in after first deploy) |

4. Push the code:
   ```bash
   cd GLearn/
   git init
   git add .
   git commit -m "Initial GLearn cloud setup"
   git remote add origin git@github.com:YOUR_USERNAME/GLearn.git
   git push -u origin main
   ```

## Step 4 — First Deploy

1. The backend GitHub Action fires on push → builds Docker image → deploys to Cloud Run
2. After deploy, get your Cloud Run URL:
   ```bash
   gcloud run services describe gleam-backend --region us-central1 --format='value(status.url)'
   ```
3. Add this URL as `VITE_API_URL` in GitHub Secrets
4. Update `frontend/.env` with the Cloud Run URL
5. Touch a frontend file (or push again) to trigger the frontend deploy
6. Your app is live at: `https://YOUR_USERNAME.github.io/GLearn/`

## Step 5 — MCP Server (local → cloud backend)

See `mcp_server/cloud_setup.md` for exact Claude Desktop config.

In short: add `API_BASE_URL` pointing to your Cloud Run URL in the MCP env config.

## Free Tier Limits

| Service | Free Limit | Expected Usage |
|---------|-----------|----------------|
| GCP Cloud Run | 2M requests/month | Personal: ~1K/month ✅ |
| GCP Cloud Run compute | 360K GB-seconds/month | 256MB × ~50hrs = 46K ✅ |
| Supabase DB | 500MB | Study cards: ~10MB ✅ |
| Supabase bandwidth | 2GB/month | Minimal API traffic ✅ |
| GitHub Pages | Unlimited | Static files ✅ |
| GitHub Actions | 2000 min/month | ~2 min/deploy ✅ |

**Everything stays free for personal use.**

## Local Development (still works)

The local setup in `gilslearn/` is untouched. GLearn is a separate project.
For local dev on GLearn, update `.env` files back to localhost values.
