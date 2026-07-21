# StayLens Hybrid Search Engine

A production-grade hybrid search backend (FastAPI + Supabase PostgreSQL +
pgvector) that combines **semantic search**, **PostgreSQL full-text search**,
**structured filters**, **geographic filtering** and a **weighted ranking
engine** into one ranked result list — with a per-property explanation of why
it matched.

**Provider-independent by design**: the engine is fully functional with no AI
provider configured (FTS + filters + ranking). Semantic search activates
automatically when an embedding provider is configured — same endpoint, no
frontend changes.

---

## Architecture

```
backend/app/
├── api/
│   └── search_router.py     POST /api/search/hybrid · /click · GET /analytics · /health
├── schemas/
│   └── search_schema.py     Pydantic request/response contracts
├── services/
│   └── hybrid_search.py     Orchestrator: intent → retrieve ∥ → relax → rank → hydrate → explain
├── search/
│   ├── intent.py            Rule-based AI query understanding (LLM-pluggable)
│   ├── filter_engine.py     Fixed-shape null-checked filter SQL ($2..$23)
│   ├── text_search.py       FTS branch (GIN index, precision→recall queries)
│   └── geo.py               bbox / radius validation (earthdistance in SQL)
├── semantic/
│   ├── providers.py         EmbeddingProvider ABC: OpenAI · Gemini · Ollama · SentenceTransformers
│   ├── embeddings.py        Provider facade + LRU query cache + model-match guard
│   └── semantic_search.py   pgvector branch (HNSW cosine)
├── ranking/
│   └── ranking_engine.py    Normalization, weighted blend, explanations
├── repositories/
│   ├── db.py                Pooled psycopg2 + per-connection PREPARE (+fallback)
│   └── analytics_repo.py    In-memory aggregates + JSONL audit logs
├── models/candidate.py      Internal candidate row
├── utils/timing.py          Per-stage latency
└── config.py                Env-driven settings incl. ranking weights
```

No schema changes were made. The engine reuses the existing tables
(`properties`, `hosts`, `amenities`, `property_amenities`, `property_images`,
`cities`, `embeddings`) and the existing indexes.

## Search Flow

```
POST /api/search/hybrid
  1. intent      rule-based parser: "Cheap apartment with wifi in Barcelona"
                 → {price_max:100, property_type:apartment, amenities:[wifi], city:Barcelona}
                 explicit request filters ALWAYS override intent
  2. embedding   query → 512-dim vector (LRU-cached; skipped when no provider)
  3. retrieve    IN PARALLEL on two pooled connections:
                   semantic: HNSW cosine top-K, hard filters applied
                   FTS:      GIN websearch top-K, hard filters applied
  4. relax       retrieval ladder — each step only when the previous found 0:
                   a. precision FTS (AND semantics)
                   b. recall FTS (OR semantics)
                   c. drop intent-derived amenity filters (meta.relaxed=true)
  5. merge       union by property id (semantic + text scores per candidate)
  6. rank        normalize signals 0–1 → weighted hybrid score
  7. sort        recommended = hybrid score; rating/price/newest/reviews/distance re-key
  8. paginate    page over the ranked candidate set
  9. hydrate     ONE query for the page only: display fields, primary image,
                 matched amenities
 10. explain     per-property "why this matched" bullets
```

## Ranking Formula

```
score = 0.45·semantic + 0.20·text + 0.10·rating + 0.10·reviews
      + 0.05·superhost + 0.05·amenity + 0.05·popularity
```

| Signal     | Source                              | Normalization                    |
|------------|-------------------------------------|----------------------------------|
| semantic   | 1 − cosine distance (pgvector)      | native 0–1, clamped              |
| text       | ts_rank (name+summary short doc)    | ÷ max ts_rank in candidate set   |
| rating     | review_scores_rating (0–100)        | ÷ 100                            |
| reviews    | number_of_reviews                   | log1p(n) / log1p(500), capped    |
| superhost  | hosts.is_superhost                  | 0 / 1                            |
| amenity    | matched ÷ requested amenities       | 1.0 when none requested          |
| popularity | reviews_per_month                   | log1p(rpm) / log1p(10), capped   |

- Weights are configurable: `SEARCH_WEIGHTS={"semantic":0.5,...}` (env, JSON).
- When a signal is unavailable for the whole set (no embeddings, or a
  filter-only browse), its weight is dropped and the rest are **renormalized**
  — the response `meta.weights` always shows the effective weights.

**Amenity match**: requested (explicit + intent) vs available amenities →
`amenity_match_percentage` per property (e.g. wifi ✓ pool ✓ kitchen ✓
parking ✗ → 75%), counted in SQL on the candidate set, matched slugs resolved
in the hydrate step for explanations.

**Explanations** (per property): matched/missing amenities, semantic-similarity
percentage (when active), keyword-match note, rating, review count, superhost,
price-within-budget, city, distance.

## AI Query Understanding

`search/intent.py` — deterministic lexicon/regex parser (no API latency):

- price: `under/below/less than $N`, `cheap|budget` → ≤$100, `luxury|premium` → ≥$300
- amenities: wifi, pool, kitchen, parking, pets, A/C, TV, washer, dryer,
  heating, fireplace, self check-in, beachfront, ocean/sea view
- property type: apartment/flat, villa, cabin, house, loft, condo, …
- room type: private/shared/hotel room, entire home
- guests: `N guests`, `family` → 4+, `romantic|couple` → 2
- bedrooms/beds: `N bedrooms`, `N beds`
- location: matched against `cities` + property countries loaded at startup

Consumed terms are stripped from the FTS query; descriptive remainder ("near
beach", "quiet") flows into FTS and the semantic embedding. Zero-result
protection: intent-derived amenity filters are auto-relaxed (never the
explicit ones). Swappable behind `IntentParser` — `INTENT_PARSER=llm` is
reserved for an LLM implementation with the identical `Intent` contract
(TODO marker in code).

## Embedding Providers

`EMBEDDING_PROVIDER = auto | none | openai | gemini | ollama | sentence-transformers`

| Provider | Config | Notes |
|---|---|---|
| OpenAI | `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL` (default text-embedding-3-small) | native 512-dim support |
| Gemini | `GEMINI_API_KEY`/`GOOGLE_API_KEY`, `GEMINI_EMBEDDING_MODEL` (text-embedding-004) | REST, no SDK needed |
| Ollama | `OLLAMA_HOST` (default :11434), `OLLAMA_EMBEDDING_MODEL` (nomic-embed-text) | local, REST |
| SentenceTransformers | `ST_EMBEDDING_MODEL` (all-MiniLM-L6-v2) | fully local, `pip install sentence-transformers` |

All vectors are fitted to the DB profile `vector(512)` (truncate/pad +
L2-renormalize). **Safety guard**: query vectors are only comparable to
property vectors from the same model — the engine checks `embeddings.model`
and keeps semantic search off on mismatch instead of returning garbage.
`GET /api/search/health` reports provider, stored model, row count and whether
semantic is active.

Enabling semantic search later:
1. set the provider env (e.g. `OPENAI_API_KEY=…`),
2. backfill property vectors: `python scripts/generate_embeddings.py`
   (currently OpenAI-based; TODO(embeddings-backfill) in code: port onto the
   provider layer),
3. done — the next search request uses it automatically.

## API

`POST /api/search/hybrid`

```jsonc
{
  "query": "Pet friendly apartment in Barcelona",
  "city": null,                       // optional explicit overrides
  "filters": {
    "price_min": 0, "price_max": 300,
    "bedrooms": 2, "bathrooms": 1, "beds": 2, "guests": 4,
    "property_type": "apartment", "room_type": "Entire home/apt",
    "amenities": ["wifi", "kitchen"],
    "superhost": true, "instant_book": null,   // instant_book: accepted, no-op (no column)
    "rating_min": 4.5, "reviews_min": 10, "neighbourhood": null
  },
  "bbox": [41.35, 41.42, 2.10, 2.22],          // or:
  "center": {"lat": 41.3874, "lng": 2.1686}, "radius_km": 3,
  "sort": "recommended",  // rating | price_asc | price_desc | newest | reviews | distance
  "page": 1, "page_size": 24, "debug": true
}
```

Response: `properties[]` (card fields + `scores` + `amenity_match_percentage`
+ `explanation[]` + `distance_km`), `pagination`, `meta` (detected intent,
effective weights, semantic/text status, relaxation flag, stage timings with
`debug:true`).

Also: `POST /api/search/click` (click tracking), `GET /api/search/analytics`
(top cities / amenities / clicked properties, avg + p95 latency),
`GET /api/search/health`.

Run: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --port 8000`

## Indexes (all pre-existing — no schema changes needed)

| Index | Type | Role |
|---|---|---|
| `idx_properties_fts` | GIN on `to_tsvector(name‖summary‖space‖description‖neighborhood_overview)` | FTS predicate (bitmap scan) |
| `idx_embeddings_hnsw` | HNSW `vector_cosine_ops` (m=16, ef=64) | semantic top-K |
| `idx_properties_geo` | GiST `ll_to_earth(lat,lng)` | radius search |
| `idx_prop_amen_amenity` | btree (amenity_id, property_id) | amenity AND-filter |
| price / room_type / property_type / accommodates btrees | btree | structured filters |

## Performance

Design measures:
- **GIN index**: the FTS predicate is written in the exact indexed-expression
  form; query/browse modes are separate statements so no `OR $1=''` disables
  the index (verified: `Bitmap Index Scan on idx_properties_fts`).
- **HNSW** for vector top-K; `SET hnsw.ef_search=80` per connection.
- **Parallel SQL**: both branches run concurrently on separate pooled
  connections (`asyncio.gather` + thread executor).
- **Prepared statements**: fixed-shape SQL with null-checked params → one
  server-side plan per statement per connection (auto-fallback for
  transaction-mode poolers).
- **Cheap ranking doc**: per-matched-row `ts_rank` runs on name+summary only;
  amenity-match counting runs in the outer query on ≤150 rows.
- **Page-only hydration**: images/amenity names fetched for the page, not the pool.
- **Embedding LRU cache**: repeated queries skip the embedding API entirely.

Measured (6,480 active properties):
- server-side execution: **~170 ms worst case** (broad OR query, 2,372 matches),
  <60 ms for typical filtered queries → within the <300 ms target when the API
  is deployed in the DB's region (Supabase ap-southeast-1).
- from the dev machine the wall clock adds ~110–220 ms network RTT per round
  trip (measured `SELECT 1`: 106–224 ms) — deployment consideration, not
  engine cost.
- relaxation ladder adds one round trip per fallback step (only on zero-result
  steps).

## Logging & Analytics

Every search logs: query, detected intent, result count, and per-stage
latency (`intent_ms`, `embedding_ms`, `sql_semantic_ms`, `sql_fts_ms`,
`ranking_ms`, `hydrate_ms`, `total_ms`) — to the app log and
`backend/logs/searches.jsonl`. Clicks land in `clicks.jsonl`.
`GET /api/search/analytics` aggregates: most searched cities, most searched
amenities, average/p95 latency, top clicked properties.

## Future Improvements

- **Embeddings backfill via providers** — port `scripts/generate_embeddings.py`
  onto `EmbeddingProvider` so any provider can build property vectors
  (TODO(embeddings-backfill)).
- **LLM intent parser** — `INTENT_PARSER=llm` behind the same `Intent`
  contract (TODO(intent-llm)); rule parser stays as fallback.
- **Stored tsvector column** (requires schema change): would remove the
  per-row short-doc `ts_rank` cost entirely.
- **RRF (reciprocal rank fusion)** as an alternative merge strategy to the
  weighted blend.
- **Persistent analytics** (search_logs table) once schema changes are allowed.
- **Deep pagination in browse mode**: candidate pools cap `total` at ~300;
  add a count query + keyset pagination for full catalog browsing.
- **Availability filtering** by dates once a bookings/calendar table lands.
- **Learning-to-rank**: use click analytics to tune weights.
