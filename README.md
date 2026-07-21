# StayLens

StayLens is a modern Airbnb-inspired web application that helps users discover,
explore, and book unique stays with a clean and seamless experience. Built to
learn full-stack development, property listing management, responsive UI design,
and real-world booking workflows — extended with an **AI hybrid search engine**
(semantic + full-text + filters) over a real 6,480-property catalog.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Framer Motion |
| Search API | FastAPI (Python 3.12) · psycopg2 |
| Database | Supabase Postgres 17 · pgvector (HNSW) · earthdistance · pg_trgm |
| AI | Provider-agnostic embeddings — Gemini · OpenAI · Ollama · SentenceTransformers |
| Maps | Google Maps JavaScript API |
| ETL | Python (pandas, numpy, psycopg2) |

## Features

**Frontend (`web/`)**
- **Premium landing page** — hero carousel with ken-burns + parallax and a
  transparent overlay header, curated collections, AI-search demo, live
  recommendations, interactive world map, testimonials, animated stats
- **Airbnb-style morphing search bar** — Where / When / Who, collapsing into a
  compact pill on scroll, with an auth-aware account menu
- **Search results** — structured filters, sorting, pagination, and a Google Map
  with price-pill markers (click once for a property popup, again to open it)
- **Property details** — gallery, sticky booking card with calendar popover,
  amenities, reviews, sticky section sub-nav
- **Checkout** — booking summary, guest details, coupons, taxes, confirmation
  (Stripe-ready architecture; mock provider, no real charges)
- **Contact host** and **Edit profile**

**Hybrid Search backend (`backend/`)** — see [HYBRID_SEARCH.md](HYBRID_SEARCH.md)
- Semantic search (pgvector) **+** Postgres full-text search **+** structured
  filters **+** geo (radius / bounding box), merged into one ranked list
- Configurable weighted ranking engine with a "why this matched" explanation
  per result and an amenity match percentage
- Rule-based natural-language intent parser ("cheap apartment with wifi in
  Barcelona" → filters), no AI provider required
- Semantic search is an **enhancement, never a dependency** — with no embedding
  provider configured it degrades cleanly to FTS + filters
- Search analytics and per-stage latency logging

**Data (`scripts/`, `supabase/`)**
- ETL for two datasets (MongoDB Sample Airbnb + Inside Airbnb), normalized
  schema, idempotent migrations, and a 512-dim embedding backfill

## Repository structure

```
Staylens/
├── web/                      # Next.js frontend
│   └── src/
│       ├── app/              #   routes: /, /search, /property/[id], /checkout, /profile
│       ├── components/       #   landing, search, property, checkout, profile, maps
│       └── lib/              #   Supabase queries, hybrid-search client, pricing
├── backend/                  # FastAPI hybrid search
│   └── app/
│       ├── api/              #   POST /api/search/hybrid, /click, /analytics, /health
│       ├── search/           #   intent, filters, full-text, geo
│       ├── semantic/         #   EmbeddingProvider abstraction + pgvector
│       ├── ranking/          #   weighted ranking + explanations
│       └── repositories/     #   pooled DB access, analytics
├── scripts/                  # Python ETL + embedding backfill
├── supabase/migrations/      # 12 idempotent SQL migrations
├── sql/                      # import + verification SQL
└── docs/                     # architecture, ER diagram, data dictionary
```

> **Datasets are not committed.** The raw Inside Airbnb / Kaggle files and the
> generated CSVs total ~5 GB (far over GitHub's 100 MB per-file limit) and are
> git-ignored. Download the sources and regenerate with `scripts/run_etl.py`.

## Quick start

```bash
# 1. configure
cp .env.example .env             # SUPABASE_DB_URL, embedding provider key, …
cp .env.example web/.env.local   # + NEXT_PUBLIC_SUPABASE_URL / ANON_KEY, Maps key

# 2. frontend  → http://localhost:3000
cd web && npm install && npm run dev

# 3. hybrid search API  → http://127.0.0.1:8000/docs
cd backend && pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

The frontend calls the search API when it is running and **falls back to direct
Supabase queries** when it is not, so it works standalone.

### Enabling semantic search

Set an embedding provider and backfill the property vectors — semantic search
then switches on automatically, with no frontend change:

```bash
# .env
EMBEDDING_PROVIDER=gemini        # or openai | ollama | sentence-transformers
GEMINI_API_KEY=...

python scripts/generate_embeddings_gemini.py
```

Check status any time at `GET /api/search/health`.

## Deployment

The two halves deploy separately: **Next.js → Vercel**, **FastAPI → any container
host** (Render blueprint included). The frontend falls back to direct Supabase
queries whenever the search API is unreachable, so it is never hard-blocked.

### 1. Frontend → Vercel

Set these in **Vercel → Settings → Environment Variables**, then **redeploy**
(`NEXT_PUBLIC_*` values are inlined at build time, so changing them requires a
new build):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JS API key |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | `DEMO_MAP_ID` |
| `HYBRID_SEARCH_URL` | the search API URL from step 2 |
| `HYBRID_SEARCH_TIMEOUT_MS` | optional; raise to `20000` if the API is on a cold-starting free tier |

> **Google Maps referrer restrictions:** if the key is restricted to
> `localhost:3000/*`, it will fail on Vercel with `RefererNotAllowedMapError`.
> Add `https://<your-app>.vercel.app/*` (and any custom domain) in Google Cloud
> Console → Credentials.

### 2. Hybrid Search API → Render (or any Docker host)

`render.yaml` is a ready blueprint; `backend/Dockerfile` works on Railway, Fly.io
or Cloud Run too (build context must be the **repo root**).

```bash
docker build -f backend/Dockerfile -t staylens-search .
docker run -p 8000:8000 --env-file .env staylens-search
```

On Render: **New → Blueprint → connect this repo**, then set the secret env vars:

| Variable | Notes |
|---|---|
| `SUPABASE_DB_URL` | session pooler connection string (port 5432) |
| `GEMINI_API_KEY` | only for semantic search |
| `CORS_ORIGINS` | `https://<your-app>.vercel.app` |

Non-secret config (`EMBEDDING_PROVIDER`, `EMBEDDING_DIMS`, `LOG_DIR`,
`SEARCH_POOL_MAX`) is already declared in the blueprint. Health check:
`GET /api/search/health` — it reports database and semantic-provider status.

> **Free-tier caveat:** Render's free plan sleeps after ~15 min idle and takes
> ~50 s to wake. During a cold start the frontend's timeout trips and the page
> silently serves Supabase results instead. Use a paid instance, or a keep-alive
> ping, or raise `HYBRID_SEARCH_TIMEOUT_MS`.

Host the API in the **same region as Supabase** (`ap-southeast-1` / Singapore) —
cross-region round trips dominate query latency.

## Documentation

| Doc | Contents |
|---|---|
| [HYBRID_SEARCH.md](HYBRID_SEARCH.md) | Search architecture, ranking formula, indexes, performance |
| [docs/architecture.md](docs/architecture.md) | System + data-flow diagrams |
| [docs/er_diagram.md](docs/er_diagram.md) | Mermaid ER diagram |
| [docs/data_dictionary.md](docs/data_dictionary.md) | Every table and column |
| [docs/database.md](docs/database.md) | Migrations, import, ops, security |
