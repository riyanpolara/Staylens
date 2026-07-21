"""AI query understanding — natural language → structured intent.

Deterministic lexicon/regex extraction (no LLM round-trip, keeps the <300ms
budget). Extracts price bounds, amenities, property/room type, guest counts,
bedrooms and city, and reports everything it detected so the caller can log it
and build explanations. Explicit request filters always override intent.

Example:
    "Cheap apartment near beach with wifi"
      -> price_max=100, property_type=apartment, amenities=[wifi]
         (+ "near beach" stays in the semantic query text)
"""
from __future__ import annotations

import re
import threading
from dataclasses import dataclass, field

from app.config import settings
from app.repositories.db import run_query

#: query words -> canonical amenity slugs (verified against the amenities table)
AMENITY_LEXICON: dict[str, str] = {
    "wifi": "wifi", "wi-fi": "wifi", "internet": "wifi", "fast wifi": "wifi",
    "pool": "pool", "private pool": "pool", "swimming pool": "pool",
    "kitchen": "kitchen",
    "parking": "parking", "free parking": "parking",
    "pet": "pets-allowed", "pets": "pets-allowed", "pet friendly": "pets-allowed",
    "pet-friendly": "pets-allowed", "dog": "pets-allowed", "cat": "pets-allowed",
    "air conditioning": "air-conditioning", "aircon": "air-conditioning",
    "a/c": "air-conditioning", "ac": "air-conditioning",
    "tv": "tv", "television": "tv",
    "washer": "washer", "washing machine": "washer", "laundry": "washer",
    "dryer": "dryer",
    "heating": "heating",
    "fireplace": "indoor-fireplace",
    "self check-in": "self-check-in", "self checkin": "self-check-in",
    "beachfront": "beachfront",
    "ocean view": "ocean-view", "sea view": "sea-view",
}

PROPERTY_TYPES = [
    "apartment", "flat", "villa", "cabin", "house", "loft", "condo",
    "condominium", "townhouse", "bungalow", "cottage", "guesthouse", "boat",
]

ROOM_TYPES = {
    "private room": "Private room",
    "shared room": "Shared room",
    "hotel room": "Hotel room",
    "entire home": "Entire home/apt",
    "entire place": "Entire home/apt",
    "entire apartment": "Entire home/apt",
}

_PRICE_MAX = re.compile(r"(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*(\d{2,5})")
_PRICE_MIN = re.compile(r"(?:over|above|more than|at least|from)\s*\$?\s*(\d{2,5})")
_GUESTS = re.compile(r"(\d{1,2})\s*(?:guests?|people|persons?|adults?)")
_BEDROOMS = re.compile(r"(\d{1,2})\s*(?:bed\s?rooms?|br\b)")
_BEDS = re.compile(r"(\d{1,2})\s*beds?\b")


@dataclass
class Intent:
    price_min: float | None = None
    price_max: float | None = None
    amenities: list[str] = field(default_factory=list)
    property_type: str | None = None
    room_type: str | None = None
    guests: int | None = None
    bedrooms: int | None = None
    city: str | None = None
    country: str | None = None
    detected: list[str] = field(default_factory=list)  # human-readable log

    def as_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v not in (None, [], "")}


class _KnownPlaces:
    """Cities/countries loaded once from the DB for location intent."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.cities: list[str] = []
        self.countries: list[str] = []

    def load(self) -> None:
        with self._lock:
            if self.cities:
                return
            try:
                self.cities = [
                    r["city_name"] for r in run_query("select city_name from cities")
                ]
                self.countries = [
                    r["country"]
                    for r in run_query(
                        "select distinct country from properties where country is not null"
                    )
                ]
            except Exception:  # noqa: BLE001 — intent must degrade, not fail
                self.cities, self.countries = [], []


places = _KnownPlaces()


def extract_intent(query: str) -> Intent:
    intent = Intent()
    if not query:
        return intent
    q = " " + query.lower().strip() + " "

    # --- price ---------------------------------------------------------
    if m := _PRICE_MAX.search(q):
        intent.price_max = float(m.group(1))
        intent.detected.append(f"max price ${m.group(1)}")
    if m := _PRICE_MIN.search(q):
        intent.price_min = float(m.group(1))
        intent.detected.append(f"min price ${m.group(1)}")
    if intent.price_max is None and re.search(r"\b(cheap|budget|affordable)\b", q):
        intent.price_max = settings.cheap_price_max
        intent.detected.append(f"budget stay (≤${settings.cheap_price_max:.0f})")
    if intent.price_min is None and re.search(r"\b(luxur\w*|upscale|premium|high-end)\b", q):
        intent.price_min = settings.luxury_price_min
        intent.detected.append(f"luxury stay (≥${settings.luxury_price_min:.0f})")

    # --- amenities (longest phrases first so "washing machine" wins) ----
    for phrase in sorted(AMENITY_LEXICON, key=len, reverse=True):
        if re.search(rf"(?<![\w-]){re.escape(phrase)}(?![\w-])", q):
            slug = AMENITY_LEXICON[phrase]
            if slug not in intent.amenities:
                intent.amenities.append(slug)
                intent.detected.append(f"amenity: {slug}")

    # --- property / room type ------------------------------------------
    for pt in PROPERTY_TYPES:
        if re.search(rf"\b{pt}s?\b", q):
            intent.property_type = {"flat": "apartment", "condo": "condominium"}.get(pt, pt)
            intent.detected.append(f"property type: {intent.property_type}")
            break
    for phrase, canonical in ROOM_TYPES.items():
        if phrase in q:
            intent.room_type = canonical
            intent.detected.append(f"room type: {canonical}")
            break

    # --- capacity -------------------------------------------------------
    if m := _GUESTS.search(q):
        intent.guests = int(m.group(1))
        intent.detected.append(f"{intent.guests} guests")
    elif re.search(r"\bfamily\b", q):
        intent.guests = 4
        intent.detected.append("family (4+ guests)")
    elif re.search(r"\b(romantic|couple)\b", q):
        intent.guests = 2
        intent.detected.append("couple (2 guests)")
    if m := _BEDROOMS.search(q):
        intent.bedrooms = int(m.group(1))
        intent.detected.append(f"{intent.bedrooms}+ bedrooms")

    # --- location (match against known cities/countries) ----------------
    places.load()
    for city in sorted(places.cities, key=len, reverse=True):
        if re.search(rf"\b{re.escape(city.lower())}\b", q):
            intent.city = city
            intent.detected.append(f"city: {city}")
            break
    if intent.city is None:
        for country in sorted(places.countries, key=len, reverse=True):
            if re.search(rf"\b{re.escape(country.lower())}\b", q):
                intent.country = country
                intent.detected.append(f"country: {country}")
                break

    return intent


# --------------------------------------------------------------------------
# Pluggable query-understanding engine.
# The rule-based parser is the default and requires no AI provider. An LLM
# parser can be dropped in later behind the same interface — the API contract
# (Intent) does not change.
# --------------------------------------------------------------------------
class IntentParser:
    """Interface: natural-language query → structured Intent."""

    name = "rules"

    def parse(self, query: str) -> Intent:
        return extract_intent(query)


# TODO(intent-llm): implement LlmIntentParser(IntentParser) that prompts a
# configured LLM (reusing the EmbeddingProvider credentials where applicable)
# to emit the same Intent fields, then register it here behind
# INTENT_PARSER=llm. Falls back to rules on any failure.
def get_intent_parser() -> IntentParser:
    import os

    choice = os.environ.get("INTENT_PARSER", "rules").strip().lower()
    if choice not in ("rules",):
        import logging

        logging.getLogger("search.intent").warning(
            "INTENT_PARSER=%r not available yet — using rule-based parser", choice
        )
    return IntentParser()
