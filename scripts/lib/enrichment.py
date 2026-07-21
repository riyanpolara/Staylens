"""City enrichment maps: continent / currency / timezone / country code.

Small curated lookups covering every country + city present across the three
datasets. Used to populate the `cities` dimension with useful metadata for
continent search, local-time display and local-currency pricing.
"""
from __future__ import annotations

import re

COUNTRY_CONTINENT = {
    "united states": "North America", "canada": "North America",
    "spain": "Europe", "portugal": "Europe", "germany": "Europe",
    "united kingdom": "Europe", "turkey": "Asia", "china": "Asia",
    "hong kong": "Asia", "thailand": "Asia",
    "brazil": "South America", "australia": "Oceania",
}

COUNTRY_CURRENCY = {
    "united states": "USD", "canada": "CAD", "spain": "EUR", "portugal": "EUR",
    "germany": "EUR", "united kingdom": "GBP", "turkey": "TRY", "china": "CNY",
    "hong kong": "HKD", "thailand": "THB", "brazil": "BRL", "australia": "AUD",
}

COUNTRY_CODE = {
    "united states": "US", "canada": "CA", "spain": "ES", "portugal": "PT",
    "germany": "DE", "united kingdom": "GB", "turkey": "TR", "china": "CN",
    "hong kong": "HK", "thailand": "TH", "brazil": "BR", "australia": "AU",
}

# City-level IANA timezones (authoritative for our known cities).
CITY_TIMEZONE = {
    "istanbul": "Europe/Istanbul", "montreal": "America/Toronto",
    "barcelona": "Europe/Madrid", "sydney": "Australia/Sydney",
    "new york": "America/New_York", "rio de janeiro": "America/Sao_Paulo",
    "hong kong": "Asia/Hong_Kong", "porto": "Europe/Lisbon",
    "oahu": "Pacific/Honolulu", "maui": "Pacific/Honolulu",
    "the big island": "Pacific/Honolulu", "kauai": "Pacific/Honolulu",
    "hawaii": "Pacific/Honolulu", "berlin": "Europe/Berlin",
    "bristol": "Europe/London", "bangkok": "Asia/Bangkok",
    "austin": "America/Chicago",
}

# Country fallback timezone (used only if the city isn't in CITY_TIMEZONE).
COUNTRY_TZ = {
    "portugal": "Europe/Lisbon", "spain": "Europe/Madrid", "germany": "Europe/Berlin",
    "united kingdom": "Europe/London", "turkey": "Europe/Istanbul",
    "thailand": "Asia/Bangkok", "hong kong": "Asia/Hong_Kong", "china": "Asia/Shanghai",
    "brazil": "America/Sao_Paulo", "australia": "Australia/Sydney",
    "canada": "America/Toronto",
}


def _n(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def city_key(city_name: str | None, country: str | None) -> str:
    """Dedup key: '<city>|<country>' (case/space-insensitive)."""
    return f"{_n(city_name)}|{_n(country)}"


def continent_for(country: str | None) -> str | None:
    return COUNTRY_CONTINENT.get(_n(country))


def currency_for(city_name: str | None, country: str | None) -> str | None:
    if "hong kong" in _n(city_name):   # HK listings sometimes tagged country=China
        return "HKD"
    return COUNTRY_CURRENCY.get(_n(country))


def country_code_for(country: str | None) -> str | None:
    return COUNTRY_CODE.get(_n(country))


def timezone_for(city_name: str | None, country: str | None) -> str | None:
    return CITY_TIMEZONE.get(_n(city_name)) or COUNTRY_TZ.get(_n(country))
