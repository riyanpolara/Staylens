"""Request/response contracts for POST /api/search/hybrid."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

SortOption = Literal[
    "recommended", "rating", "price_asc", "price_desc", "newest", "reviews", "distance"
]


class GeoCenter(BaseModel):
    lat: float
    lng: float


class SearchFilters(BaseModel):
    """Mirrors every existing frontend filter (see web /search URL params)."""

    price_min: float | None = Field(None, ge=0)
    price_max: float | None = Field(None, ge=0)
    bedrooms: int | None = Field(None, ge=0, description="minimum bedrooms")
    bathrooms: float | None = Field(None, ge=0, description="minimum bathrooms")
    beds: int | None = Field(None, ge=0, description="minimum beds")
    guests: int | None = Field(None, ge=1, description="minimum accommodates")
    property_type: str | None = None
    room_type: str | None = None
    amenities: list[str] = Field(default_factory=list, description="canonical slugs, AND")
    superhost: bool | None = None
    instant_book: bool | None = Field(
        None, description="accepted for API compatibility; not present in schema (no-op)"
    )
    rating_min: float | None = Field(None, ge=0, le=5)
    reviews_min: int | None = Field(None, ge=0)
    neighbourhood: str | None = None


class HybridSearchRequest(BaseModel):
    query: str = ""
    city: str | None = None
    country: str | None = None
    filters: SearchFilters = Field(default_factory=SearchFilters)
    #: [lat_min, lat_max, lng_min, lng_max]
    bbox: list[float] | None = Field(None, min_length=4, max_length=4)
    center: GeoCenter | None = None
    radius_km: float | None = Field(None, gt=0, le=500)
    sort: SortOption = "recommended"
    page: int = Field(1, ge=1)
    page_size: int = Field(24, ge=1, le=100)
    debug: bool = False


class PropertyScores(BaseModel):
    semantic: float
    text: float
    rating: float
    reviews: float
    superhost: float
    amenity: float
    popularity: float
    final: float


class SearchResultProperty(BaseModel):
    id: str
    name: str
    location: str
    city: str | None
    country: str | None
    price: float | None
    rating: float | None = Field(None, description="0–5, one decimal")
    reviews: int
    image: str | None
    latitude: float | None
    longitude: float | None
    property_type: str | None
    room_type: str | None
    accommodates: int | None
    bedrooms: int | None
    beds: int | None
    bathrooms: float | None
    superhost: bool
    distance_km: float | None
    amenity_match_percentage: int | None
    scores: PropertyScores
    explanation: list[str]


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int = Field(description="candidates considered (capped by pool size)")
    total_pages: int


class SearchMeta(BaseModel):
    query: str
    intent_detected: list[str]
    semantic_enabled: bool
    text_enabled: bool
    relaxed: bool = False
    sort: str
    weights: dict[str, float]
    timings_ms: dict[str, float] | None = None


class HybridSearchResponse(BaseModel):
    properties: list[SearchResultProperty]
    pagination: Pagination
    meta: SearchMeta


class ClickEvent(BaseModel):
    property_id: str
    name: str | None = None
    query: str | None = None
