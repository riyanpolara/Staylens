"""Hybrid search orchestrator.

Flow (see HYBRID_SEARCH.md):
  1. intent      — NL query → structured intent, merged under explicit filters
  2. embedding   — query → 512-dim vector (cached; skipped when unavailable)
  3. retrieve    — semantic + FTS branches run in PARALLEL (two pooled conns)
  4. relax       — if intent-added amenity filters produced 0 results, retry
                   without them (explicit filters always stay)
  5. rank        — normalize signals → weighted hybrid score
  6. sort        — recommended = hybrid score; other sorts re-key the ranked set
  7. hydrate     — display fields + image + matched amenities for the page only
  8. explain     — per-property "why this matched" bullets
"""
from __future__ import annotations

import asyncio
import logging
import time

from app.config import settings
from app.models.candidate import Candidate
from app.ranking.ranking_engine import (
    amenity_match_percentage,
    build_explanation,
    active_weights,
    rank,
)
from app.repositories.db import EXECUTOR, run_query
from app.repositories.analytics_repo import analytics
from app.schemas.search_schema import (
    HybridSearchRequest,
    HybridSearchResponse,
    Pagination,
    PropertyScores,
    SearchMeta,
    SearchResultProperty,
)
from app.search import geo
from app.search.filter_engine import FilterSet, amenity_cache, build_filter_params
from app.search.intent import AMENITY_LEXICON, get_intent_parser
from app.search.text_search import build_fts_queries, fts_candidates
from app.semantic import embeddings
from app.semantic.embeddings import embed_query, to_vector_literal
from app.semantic.semantic_search import embeddings_status, semantic_candidates
from app.utils.timing import StageTimer

log = logging.getLogger("search.hybrid")

HYDRATE_SQL = """
    select p.id::text as id, p.name, p.price::float as price, p.city, p.country,
           p.suburb, p.government_area, p.property_type, p.room_type::text as room_type,
           p.accommodates, p.bedrooms, p.beds, p.bathrooms::float as bathrooms,
           p.latitude, p.longitude,
           (select c.city_name from cities c where c.id = p.city_id) as canonical_city,
           (select pi.url from property_images pi
             where pi.property_id = p.id order by pi.sort_order limit 1) as image,
           (select array_agg(a.slug)
              from property_amenities pa join amenities a on a.id = pa.amenity_id
             where pa.property_id = p.id and a.id = any(%s::uuid[])) as matched_amenities
    from properties p
    where p.id = any(%s::uuid[])
"""


def _filterset_from_request(req: HybridSearchRequest) -> FilterSet:
    f = req.filters
    bbox = None
    if req.bbox:
        bbox = geo.normalize_bbox(*req.bbox)
    center = geo.normalize_center(req.center.lat, req.center.lng) if req.center else None
    return FilterSet(
        price_min=f.price_min,
        price_max=f.price_max,
        bedrooms=f.bedrooms,
        bathrooms=f.bathrooms,
        beds=f.beds,
        guests=f.guests,
        property_type=f.property_type,
        room_type=f.room_type,
        amenities=list(f.amenities),
        superhost=f.superhost,
        instant_book=f.instant_book,
        rating_min=f.rating_min,
        reviews_min=f.reviews_min,
        city=req.city,
        country=req.country,
        neighbourhood=f.neighbourhood,
        bbox=bbox,
        center=center,
        radius_km=req.radius_km,
    )


def _to_candidate(row: dict) -> Candidate:
    return Candidate(
        id=row["id"],
        semantic=float(row.get("semantic") or 0.0),
        text=float(row.get("text_score") or 0.0),
        rating=row.get("rating"),
        reviews=int(row.get("reviews") or 0),
        reviews_per_month=row.get("reviews_per_month"),
        superhost=bool(row.get("superhost")),
        price=row.get("price"),
        distance_km=row.get("distance_km"),
        first_review=row.get("first_review"),
        amenity_matched=row.get("amenity_matched"),
    )


def _merge(sem_rows: list[dict], fts_rows: list[dict]) -> list[Candidate]:
    by_id: dict[str, Candidate] = {}
    for row in fts_rows:
        by_id[row["id"]] = _to_candidate(row)
    for row in sem_rows:
        if row["id"] in by_id:
            by_id[row["id"]].semantic = float(row.get("semantic") or 0.0)
        else:
            by_id[row["id"]] = _to_candidate(row)
    return list(by_id.values())


def _sort_key(sort: str):
    inf = float("inf")
    return {
        "rating": lambda c: (-(c.rating or 0), -c.reviews),
        "price_asc": lambda c: (c.price if c.price is not None else inf,),
        "price_desc": lambda c: (-(c.price if c.price is not None else -inf),),
        "newest": lambda c: (c.first_review or "0000",),
        "reviews": lambda c: (-c.reviews,),
        "distance": lambda c: (c.distance_km if c.distance_km is not None else inf,),
    }[sort]


def _location_label(row: dict) -> str:
    def clean(v):
        if not v:
            return None
        s = str(v).strip()
        return s if s and not s.isdigit() and "highlight" not in s.lower() else None

    area = clean(row.get("government_area")) or clean(row.get("suburb")) \
        or clean(row.get("canonical_city")) or clean(row.get("city"))
    return ", ".join(x for x in (area, row.get("country")) if x)


async def hybrid_search(req: HybridSearchRequest) -> HybridSearchResponse:
    timer = StageTimer()
    loop = asyncio.get_running_loop()

    # ---- 1. query understanding (rule-based; LLM pluggable via INTENT_PARSER)
    with timer.stage("intent_ms"):
        intent = get_intent_parser().parse(req.query)
        filters = _filterset_from_request(req).merged_with_intent(intent)

    requested_amenities = list(filters.amenities)
    scored_ids = amenity_cache.ids_for(requested_amenities) or None

    # terms consumed by structured filters are stripped from the FTS query
    consumed = [p for p, slug in AMENITY_LEXICON.items() if slug in intent.amenities]
    if intent.city:
        consumed.append(intent.city)
    if intent.country:
        consumed.append(intent.country)
    if intent.property_type:
        consumed.append(intent.property_type)
    precision_q, recall_q = build_fts_queries(req.query, consumed)

    # Semantic search is an enhancement, never a dependency: it activates only
    # when (a) an embedding provider is configured, (b) property vectors exist,
    # and (c) they were built by the same model. Otherwise the engine runs
    # FTS + filters + ranking and returns results normally.
    # TODO(embeddings-backfill): once scripts/generate_embeddings.py is ported
    # onto the provider layer, populate the embeddings table and this flag
    # flips on automatically — same endpoint, no frontend changes.
    semantic_on = (
        bool(req.query.strip())
        and embeddings.available()
        and embeddings_status.count() > 0
        and embeddings.matches_stored_model(embeddings_status.stored_model())
    )
    pool = settings.candidate_pool

    # ---- 2+3. embedding + parallel retrieval ----------------------------
    async def _semantic_branch(params: tuple) -> list[dict]:
        if not semantic_on:
            return []
        t0 = time.perf_counter()
        vec = await loop.run_in_executor(EXECUTOR, embed_query, req.query.strip().lower())
        timer.set("embedding_ms", (time.perf_counter() - t0) * 1000)
        if vec is None:
            return []
        t1 = time.perf_counter()
        rows = await loop.run_in_executor(
            EXECUTOR, semantic_candidates, to_vector_literal(vec), params, pool, scored_ids
        )
        timer.set("sql_semantic_ms", (time.perf_counter() - t1) * 1000)
        return rows

    async def _fts_branch(params: tuple, fts_q: str) -> list[dict]:
        t0 = time.perf_counter()
        rows = await loop.run_in_executor(
            EXECUTOR, fts_candidates, fts_q, params, pool, scored_ids
        )
        timer.set("sql_fts_ms", (time.perf_counter() - t0) * 1000)
        return rows

    # ---- 4. retrieval ladder: precision → recall → relax intent amenities
    params = build_filter_params(filters)
    intent_only = [s for s in intent.amenities if s not in req.filters.amenities]
    attempts: list[tuple[tuple, str, bool]] = [(params, precision_q, False)]
    if recall_q and recall_q != precision_q:
        attempts.append((params, recall_q, False))
    if intent_only:
        relaxed_filters = FilterSet(**{**filters.__dict__})
        relaxed_filters.amenities = [
            s for s in filters.amenities if s not in intent_only
        ]
        attempts.append((build_filter_params(relaxed_filters), recall_q or precision_q, True))

    candidates: list[Candidate] = []
    used_q = precision_q
    relaxed = False
    for attempt_params, fts_q, is_relaxed in attempts:
        sem_rows, fts_rows = await asyncio.gather(
            _semantic_branch(attempt_params), _fts_branch(attempt_params, fts_q)
        )
        candidates = _merge(sem_rows, fts_rows)
        if candidates:
            used_q, relaxed = fts_q, is_relaxed
            break

    # ---- 5. rank ---------------------------------------------------------
    has_text = bool(used_q)
    with timer.stage("ranking_ms"):
        rank(candidates, requested_amenities, semantic_on, has_text)
        # ---- 6. sort ------------------------------------------------------
        sort = req.sort
        if sort == "distance" and filters.center is None:
            sort = "recommended"  # distance needs a center point
        if sort != "recommended":
            candidates.sort(key=_sort_key(sort))

    total = len(candidates)
    start = (req.page - 1) * req.page_size
    page_candidates = candidates[start : start + req.page_size]

    # ---- 7. hydrate the page --------------------------------------------
    with timer.stage("hydrate_ms"):
        rows_by_id: dict[str, dict] = {}
        if page_candidates:
            ids = [c.id for c in page_candidates]
            for row in run_query(HYDRATE_SQL, (scored_ids, ids)):
                rows_by_id[row["id"]] = row

    # ---- 8. build response with explanations -----------------------------
    properties: list[SearchResultProperty] = []
    for c in page_candidates:
        row = rows_by_id.get(c.id)
        if row is None:
            continue
        matched = list(row.get("matched_amenities") or [])
        properties.append(
            SearchResultProperty(
                id=c.id,
                name=row["name"],
                location=_location_label(row),
                city=row.get("canonical_city") or row.get("city"),
                country=row.get("country"),
                price=row.get("price"),
                rating=round((c.rating or 0) / 20, 1) if c.rating is not None else None,
                reviews=c.reviews,
                image=row.get("image"),
                latitude=row.get("latitude"),
                longitude=row.get("longitude"),
                property_type=row.get("property_type"),
                room_type=row.get("room_type"),
                accommodates=row.get("accommodates"),
                bedrooms=row.get("bedrooms"),
                beds=row.get("beds"),
                bathrooms=row.get("bathrooms"),
                superhost=c.superhost,
                distance_km=round(c.distance_km, 2) if c.distance_km is not None else None,
                amenity_match_percentage=amenity_match_percentage(matched, requested_amenities),
                scores=PropertyScores(**{**c.scores, "final": c.final}),
                explanation=build_explanation(
                    c, matched, requested_amenities, filters.price_max, filters.city, req.query
                ),
            )
        )

    stages = timer.summary()
    log.info(
        "search q=%r intent=%s results=%d %s",
        req.query, intent.detected, total, stages,
    )
    analytics.record_search(req.query, filters.city, requested_amenities, stages, total)

    return HybridSearchResponse(
        properties=properties,
        pagination=Pagination(
            page=req.page,
            page_size=req.page_size,
            total=total,
            total_pages=max(1, -(-total // req.page_size)),
        ),
        meta=SearchMeta(
            query=req.query,
            intent_detected=intent.detected,
            semantic_enabled=semantic_on,
            text_enabled=has_text,
            relaxed=relaxed,
            sort=sort,
            weights=active_weights(semantic_on, has_text),
            timings_ms=stages if req.debug else None,
        ),
    )
