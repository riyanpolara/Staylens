"""PostgreSQL full-text search branch.

Performance shape (target <300ms):
  - The MATCH predicate uses the exact expression behind the existing GIN
    index `idx_properties_fts` (name, summary, space, description,
    neighborhood_overview) → bitmap index scan.
  - RANKING inside the inner query uses a cheap short document (name+summary)
    so per-matched-row cost stays tiny; the expensive per-row work
    (amenity-match counting) happens in the OUTER query on ≤ LIMIT rows only.
  - Precision first: the primary tsquery is websearch AND semantics; the
    orchestrator falls back to OR-recall when AND yields nothing.

Amenity names and host_about contribute through the amenity engine and the
semantic document rather than FTS ranking (documented in HYBRID_SEARCH.md).
"""
from __future__ import annotations

from app.repositories.db import run_prepared
from app.search.filter_engine import DISTANCE_SQL, FILTER_SQL

#: must stay semantically identical to idx_properties_fts's indexed expression
FTS_DOC = (
    "coalesce(p.name,'') || ' ' || coalesce(p.summary,'') || ' ' || "
    "coalesce(p.space,'') || ' ' || coalesce(p.description,'') || ' ' || "
    "coalesce(p.neighborhood_overview,'')"
)

#: cheap ranking document — short fields only (per-matched-row cost)
FTS_RANK_DOC = "coalesce(p.name,'') || ' ' || coalesce(p.summary,'')"

_SELECT_COMMON = f"""
               p.price::float as price,
               p.review_scores_rating as rating,
               p.number_of_reviews as reviews,
               p.reviews_per_month::float as reviews_per_month,
               coalesce(h.is_superhost, false) as superhost,
               p.first_review::text as first_review,
               {DISTANCE_SQL}
"""

_AMENITY_MATCHED = """
    select o.*,
           case when $25::uuid[] is not null then coalesce((
                select count(distinct pa.amenity_id) from property_amenities pa
                where pa.property_id = o.id::uuid and pa.amenity_id = any($25::uuid[])), 0)
           end as amenity_matched
"""

#: query mode — the @@ predicate is written in the exact index-matchable form
#: (no OR around it) so the GIN bitmap scan is used; ranking runs on the cheap
#: short doc for matched rows only.
FTS_QUERY_STATEMENT = f"""
    {_AMENITY_MATCHED}
    from (
        select p.id::text as id,
               0.0::float as semantic,
               ts_rank(to_tsvector('english', {FTS_RANK_DOC}),
                       (select websearch_to_tsquery('english', $1))) as text_score,
               {_SELECT_COMMON}
        from properties p
        left join hosts h on h.id = p.host_id
        where p.is_active
          and to_tsvector('english', {FTS_DOC})
              @@ websearch_to_tsquery('english', $1)
          {FILTER_SQL}
        order by text_score desc,
                 p.review_scores_rating desc nulls last,
                 p.number_of_reviews desc
        limit $24
    ) o
"""

#: browse mode (no query text) — pure filter listing, zero tsvector work.
#: $1 is unused but kept so FILTER_SQL's $2..$23 numbering is shared.
FTS_BROWSE_STATEMENT = f"""
    {_AMENITY_MATCHED}
    from (
        select p.id::text as id,
               0.0::float as semantic,
               0.0::float as text_score,
               {_SELECT_COMMON}
        from properties p
        left join hosts h on h.id = p.host_id
        where p.is_active
          and ($1::text is null or true)
          {FILTER_SQL}
        order by p.review_scores_rating desc nulls last,
                 p.number_of_reviews desc
        limit $24
    ) o
"""


def build_fts_queries(query: str, consumed_terms: list[str]) -> tuple[str, str]:
    """(precision_query, recall_query) after stripping intent-consumed terms.

    precision: websearch AND semantics ("beach house" → beach & house)
    recall:    OR-combined, used as fallback when precision finds nothing
    """
    q = query.lower()
    for term in sorted(consumed_terms, key=len, reverse=True):
        q = q.replace(term.lower(), " ")
    words = [w for w in q.replace(",", " ").split() if len(w) > 2]
    stop = {"with", "near", "the", "and", "for", "place", "home", "stay", "close"}
    words = list(dict.fromkeys(w for w in words if w not in stop))
    return " ".join(words), " OR ".join(words)


def fts_candidates(
    query_text: str,
    filter_params: tuple,
    limit: int,
    scored_amenity_ids: list[str] | None,
) -> list[dict]:
    if query_text.strip():
        return run_prepared(
            "staylens_fts_q",
            FTS_QUERY_STATEMENT,
            (query_text, *filter_params, limit, scored_amenity_ids),
        )
    return run_prepared(
        "staylens_fts_browse",
        FTS_BROWSE_STATEMENT,
        (None, *filter_params, limit, scored_amenity_ids),
    )
