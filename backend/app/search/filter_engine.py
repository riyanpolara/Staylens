"""Structured filters — one fixed-shape SQL fragment shared by both branches.

Every filter is a null-checked parameter (`($n IS NULL OR …)`) so the SQL text
never changes → a single server-side prepared plan per statement. Parameter
positions $2–$23 are identical in the semantic and FTS statements ($1 is the
branch-specific query embedding / tsquery text; $24 is the LIMIT).
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Any

from app.search.intent import Intent
from app.repositories.db import run_query


@dataclass
class FilterSet:
    price_min: float | None = None
    price_max: float | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    beds: int | None = None
    guests: int | None = None
    property_type: str | None = None
    room_type: str | None = None
    amenities: list[str] = field(default_factory=list)   # canonical slugs (AND)
    superhost: bool | None = None
    instant_book: bool | None = None  # accepted; no column in schema → no-op
    rating_min: float | None = None   # 0–5 scale (converted to DB 0–100)
    reviews_min: int | None = None
    city: str | None = None
    country: str | None = None
    neighbourhood: str | None = None
    bbox: tuple[float, float, float, float] | None = None  # lat_min, lat_max, lng_min, lng_max
    center: tuple[float, float] | None = None              # lat, lng
    radius_km: float | None = None

    def merged_with_intent(self, intent: Intent) -> "FilterSet":
        """Explicit filters win; intent fills the gaps."""
        out = FilterSet(**{**self.__dict__})
        out.amenities = list(self.amenities)
        if out.price_min is None:
            out.price_min = intent.price_min
        if out.price_max is None:
            out.price_max = intent.price_max
        if out.property_type is None:
            out.property_type = intent.property_type
        if out.room_type is None:
            out.room_type = intent.room_type
        if out.guests is None:
            out.guests = intent.guests
        if out.bedrooms is None:
            out.bedrooms = intent.bedrooms
        if out.city is None:
            out.city = intent.city
        if out.country is None:
            out.country = intent.country
        for slug in intent.amenities:
            if slug not in out.amenities:
                out.amenities.append(slug)
        return out


#: WHERE fragment — parameter positions $2..$23 (fixed shape, see PREPARE note)
FILTER_SQL = """
      and ($2::numeric  is null or p.price >= $2)
      and ($3::numeric  is null or p.price <= $3)
      and ($4::int      is null or p.bedrooms  >= $4)
      and ($5::numeric  is null or p.bathrooms >= $5)
      and ($6::int      is null or p.beds >= $6)
      and ($7::int      is null or p.accommodates >= $7)
      and ($8::text     is null or p.property_type ilike $8)
      and ($9::text     is null or p.room_type::text ilike $9)
      and ($10::uuid[]  is null or (
            select count(distinct pa.amenity_id) from property_amenities pa
            where pa.property_id = p.id and pa.amenity_id = any($10::uuid[])
          ) = cardinality($10::uuid[]))
      and ($11::boolean is null or coalesce(h.is_superhost, false) = $11)
      and ($12::int     is null or p.review_scores_rating >= $12)
      and ($13::int     is null or p.number_of_reviews >= $13)
      and ($14::text    is null or p.city ilike $14 or exists (
            select 1 from cities c where c.id = p.city_id and c.city_name ilike $14))
      and ($15::text    is null or p.country ilike $15)
      and ($16::text    is null or p.suburb ilike $16 or p.government_area ilike $16)
      and ($17::float8  is null or (p.latitude  between $17 and $18
                                and p.longitude between $19 and $20))
      and ($21::float8  is null or (
            p.latitude is not null
            and earth_box(ll_to_earth($21, $22), $23::float8)
                @> ll_to_earth(p.latitude, p.longitude)
            and earth_distance(ll_to_earth($21, $22),
                               ll_to_earth(p.latitude, p.longitude)) <= $23::float8))
"""

#: SELECT expression for distance (km) — NULL when no center was provided
DISTANCE_SQL = """
      case when $21::float8 is not null and p.latitude is not null
           then earth_distance(ll_to_earth($21, $22),
                               ll_to_earth(p.latitude, p.longitude)) / 1000.0
      end as distance_km
"""


class _AmenityCache:
    """slug → amenity id, loaded once (amenities table is static)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_slug: dict[str, str] = {}
        self._names: dict[str, str] = {}

    def load(self) -> None:
        with self._lock:
            if self._by_slug:
                return
            for r in run_query("select id::text as id, slug, name from amenities"):
                self._by_slug[r["slug"]] = r["id"]
                self._names[r["slug"]] = r["name"]

    def ids_for(self, slugs: list[str]) -> list[str]:
        self.load()
        return [self._by_slug[s] for s in slugs if s in self._by_slug]

    def name_for(self, slug: str) -> str:
        self.load()
        return self._names.get(slug, slug.replace("-", " ").title())


amenity_cache = _AmenityCache()


def build_filter_params(f: FilterSet) -> tuple[Any, ...]:
    """Values for $2..$23, in the exact FILTER_SQL order."""
    amenity_ids = amenity_cache.ids_for(f.amenities) or None
    like = lambda v: f"%{v}%" if v else None  # noqa: E731
    bbox = f.bbox or (None, None, None, None)
    center = f.center or (None, None)
    radius_m = f.radius_km * 1000.0 if (f.radius_km and f.center) else None
    if radius_m is None:
        center = (None, None)
    return (
        f.price_min,                                       # $2
        f.price_max,                                       # $3
        f.bedrooms,                                        # $4
        f.bathrooms,                                       # $5
        f.beds,                                            # $6
        f.guests,                                          # $7
        like(f.property_type),                             # $8
        like(f.room_type),                                 # $9
        amenity_ids,                                       # $10
        f.superhost,                                       # $11
        int(f.rating_min * 20) if f.rating_min is not None else None,  # $12 (0–5 → 0–100)
        f.reviews_min,                                     # $13
        like(f.city),                                      # $14
        like(f.country),                                   # $15
        like(f.neighbourhood),                             # $16
        bbox[0], bbox[1], bbox[2], bbox[3],                # $17–$20
        center[0], center[1], radius_m,                    # $21–$23
    )
