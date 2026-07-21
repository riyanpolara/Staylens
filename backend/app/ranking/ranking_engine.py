"""Hybrid ranking engine.

final = Σ weight_i × signal_i, every signal normalized to 0–1 first.

Default weights (configurable via SEARCH_WEIGHTS env, see app.config):
    0.45 semantic + 0.20 text + 0.10 rating + 0.10 reviews
    + 0.05 superhost + 0.05 amenity + 0.05 popularity

When a signal is unavailable for the whole result set (no embeddings yet, or a
filter-only browse with no query) its weight is dropped and the remaining
weights are renormalized, so scores stay comparable within a response.
"""
from __future__ import annotations

import math

from app.config import settings
from app.models.candidate import Candidate
from app.search.filter_engine import amenity_cache


def _log_norm(value: float | None, cap: float) -> float:
    if not value or value <= 0:
        return 0.0
    return min(1.0, math.log1p(value) / math.log1p(cap))


def active_weights(has_semantic: bool, has_text: bool) -> dict[str, float]:
    w = dict(settings.weights)
    if not has_semantic:
        w.pop("semantic", None)
    if not has_text:
        w.pop("text", None)
    total = sum(w.values())
    return {k: v / total for k, v in w.items()} if total else w


def rank(
    candidates: list[Candidate],
    requested_amenities: list[str],
    has_semantic: bool,
    has_text: bool,
) -> list[Candidate]:
    """Score + sort (descending) by the weighted hybrid score."""
    weights = active_weights(has_semantic, has_text)
    max_text = max((c.text for c in candidates), default=0.0) or 1.0
    n_requested = len(requested_amenities)

    for c in candidates:
        matched = c.amenity_matched or 0
        c.scores = {
            "semantic": max(0.0, min(1.0, c.semantic)),
            "text": max(0.0, min(1.0, c.text / max_text)),
            "rating": (c.rating or 0) / 100.0,
            "reviews": _log_norm(c.reviews, settings.reviews_cap),
            "superhost": 1.0 if c.superhost else 0.0,
            "amenity": (matched / n_requested) if n_requested else 1.0,
            "popularity": _log_norm(c.reviews_per_month, settings.popularity_cap),
        }
        c.final = round(sum(weights.get(k, 0.0) * v for k, v in c.scores.items()), 6)

    candidates.sort(key=lambda c: c.final, reverse=True)
    return candidates


def amenity_match_percentage(matched: list[str], requested: list[str]) -> int | None:
    if not requested:
        return None
    return round(100 * len(matched) / len(requested))


def build_explanation(
    c: Candidate,
    matched: list[str],
    requested: list[str],
    price_max: float | None,
    city: str | None,
    query: str,
) -> list[str]:
    """Human-readable 'why this matched' bullets."""
    lines: list[str] = []
    for slug in matched:
        lines.append(f"✓ {amenity_cache.name_for(slug)}")
    missing = [s for s in requested if s not in matched]
    for slug in missing:
        lines.append(f"✗ {amenity_cache.name_for(slug)} not listed")
    if c.scores.get("semantic", 0) > 0:
        pct = round(c.scores["semantic"] * 100)
        if pct >= 40:
            lines.append(f"✓ {pct}% semantic similarity to “{query.strip()}”")
    elif c.scores.get("text", 0) >= 0.4 and query.strip():
        lines.append("✓ Strong keyword match for your search")
    if c.rating is not None and c.rating >= 90:
        lines.append(f"✓ Rating {c.rating / 20:.1f}")
    if c.reviews >= 50:
        lines.append(f"✓ {c.reviews} reviews")
    if c.superhost:
        lines.append("✓ Superhost")
    if price_max is not None and c.price is not None and c.price <= price_max:
        lines.append("✓ Price within budget")
    if city:
        lines.append(f"✓ In {city.title()}")
    if c.distance_km is not None:
        lines.append(f"✓ {c.distance_km:.1f} km from your location")
    return lines
