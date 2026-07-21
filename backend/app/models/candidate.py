"""Internal candidate row shared between the two retrieval branches."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Candidate:
    id: str
    semantic: float = 0.0        # cosine similarity 0–1 (0 when branch missed)
    text: float = 0.0            # raw ts_rank (normalized later)
    rating: int | None = None    # review_scores_rating 0–100
    reviews: int = 0
    reviews_per_month: float | None = None
    superhost: bool = False
    price: float | None = None
    distance_km: float | None = None
    first_review: str | None = None
    amenity_matched: int | None = None  # count of requested amenities present
    #: filled by the ranking engine
    scores: dict[str, float] = field(default_factory=dict)
    final: float = 0.0
