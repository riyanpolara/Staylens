"""Semantic search branch — pgvector cosine over the existing embeddings table.

Reuses the 512-dim HNSW index (idx_embeddings_hnsw). The statement mirrors the
FTS branch's fixed filter shape so both share the prepared-plan strategy.
Embedded document per property covers name, description/summary/space,
neighbourhood, property/room type, city/country and amenities (see
scripts/generate_embeddings.py::build_content).
"""
from __future__ import annotations

import threading

from app.repositories.db import run_prepared, run_query
from app.search.filter_engine import DISTANCE_SQL, FILTER_SQL

SEMANTIC_STATEMENT = f"""
    select o.*,
           case when $25::uuid[] is not null then coalesce((
                select count(distinct pa.amenity_id) from property_amenities pa
                where pa.property_id = o.id::uuid and pa.amenity_id = any($25::uuid[])), 0)
           end as amenity_matched
    from (
        select p.id::text as id,
               (1 - (e.embedding <=> $1::vector))::float as semantic,
               0.0::float as text_score,
               p.price::float as price,
               p.review_scores_rating as rating,
               p.number_of_reviews as reviews,
               p.reviews_per_month::float as reviews_per_month,
               coalesce(h.is_superhost, false) as superhost,
               p.first_review::text as first_review,
               {DISTANCE_SQL}
        from embeddings e
        join properties p on p.id = e.property_id
        left join hosts h on h.id = p.host_id
        where p.is_active
          {FILTER_SQL}
        order by e.embedding <=> $1::vector
        limit $24
    ) o
"""


class _EmbeddingsStatus:
    """Cached embeddings-table state — the semantic branch auto-disables while
    the table is empty or was built by a different embedding model."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._count: int | None = None
        self._model: str | None = None

    def _load(self) -> None:
        if self._count is None:
            try:
                rows = run_query(
                    "select count(*) as n, min(model) as model from embeddings"
                )
                self._count = rows[0]["n"]
                self._model = rows[0]["model"]
            except Exception:  # noqa: BLE001
                self._count, self._model = 0, None

    def count(self) -> int:
        with self._lock:
            self._load()
            return self._count or 0

    def stored_model(self) -> str | None:
        with self._lock:
            self._load()
            return self._model

    def refresh(self) -> None:
        with self._lock:
            self._count = None
            self._model = None


embeddings_status = _EmbeddingsStatus()


def semantic_candidates(
    vector_literal: str,
    filter_params: tuple,
    limit: int,
    scored_amenity_ids: list[str] | None,
) -> list[dict]:
    return run_prepared(
        "staylens_semantic",
        SEMANTIC_STATEMENT,
        (vector_literal, *filter_params, limit, scored_amenity_ids),
    )
