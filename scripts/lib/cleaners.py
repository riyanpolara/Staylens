"""Reusable field-cleaning helpers shared by the ETL scripts.

Every function is null-safe (returns ``None`` on empty/unparseable input) and
pure, so they are easy to unit-test and reason about.
"""
from __future__ import annotations

import re
import unicodedata
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

# Deterministic namespace so uuid5 keys are stable across ETL re-runs.
STAYLENS_NS = uuid.UUID("5c9f5d9e-3e7a-4b2a-9d1e-000000000001")

# Static FX table (→ USD). Extend as new source currencies appear. The MongoDB
# sample dataset carries no per-listing currency, so it defaults to USD (no-op);
# the helper exists so currency normalization is real when a code IS supplied.
FX_TO_USD = {
    "USD": 1.0, "EUR": 1.08, "GBP": 1.27, "CAD": 0.74, "AUD": 0.66,
    "TRY": 0.031, "HKD": 0.128, "BRL": 0.19, "CNY": 0.14, "PT": 1.08,
    "THB": 0.028,
}

_TRUE = {"true", "t", "yes", "y", "1"}
_FALSE = {"false", "f", "no", "n", "0"}
_WS = re.compile(r"\s+")


def det_uuid(*parts: object) -> str:
    """Deterministic UUIDv5 from natural-key parts (stable FK generation)."""
    return str(uuid.uuid5(STAYLENS_NS, ":".join(str(p) for p in parts)))


def clean_text(value: object) -> str | None:
    """Trim, collapse runs of whitespace, and map empty → None."""
    if value is None:
        return None
    s = str(value).replace("\r\n", "\n").strip()
    if s in ("", ".", "-", "n/a", "N/A", "NULL", "null"):
        return None
    return s


def collapse_ws(value: object) -> str | None:
    s = clean_text(value)
    return _WS.sub(" ", s) if s is not None else None


def parse_money(value: object) -> float | None:
    """'$1,056 ' / Decimal / '' → float. Negative or absurd → None."""
    if value is None or (isinstance(value, float) and value != value):
        return None
    if isinstance(value, (int, float, Decimal)):
        num = float(value)
    else:
        s = str(value).strip()
        if not s:
            return None
        s = re.sub(r"[^0-9.\-]", "", s)  # drop $, commas, spaces, currency letters
        if s in ("", "-", ".", "-."):
            return None
        try:
            num = float(s)
        except ValueError:
            return None
    if num < 0:
        return None
    return round(num, 2)


def to_usd(amount: float | None, currency: str | None) -> float | None:
    """Normalize a monetary amount to USD using the static FX table."""
    if amount is None:
        return None
    rate = FX_TO_USD.get((currency or "USD").upper(), 1.0)
    return round(amount * rate, 2)


def parse_bool(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    s = str(value).strip().lower()
    if s in _TRUE:
        return True
    if s in _FALSE:
        return False
    return None


def parse_int(value: object, lo: int | None = None, hi: int | None = None) -> int | None:
    """Parse int; clamp/reject out-of-range (used to drop int32 sentinels)."""
    if value is None or (isinstance(value, float) and value != value):
        return None
    try:
        n = int(float(str(value).strip()))
    except (ValueError, TypeError):
        return None
    if lo is not None and n < lo:
        return None
    if hi is not None and n > hi:
        return None
    return n


def parse_percent(value: object) -> int | None:
    """'93%' / 93 / '93' → 93 (clamped 0..100)."""
    if value is None:
        return None
    try:
        n = int(round(float(str(value).replace("%", "").strip())))
    except (ValueError, TypeError):
        return None
    return max(0, min(100, n))


def parse_decimal(value: object, places: int = 1) -> float | None:
    if value is None:
        return None
    try:
        d = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None
    return round(float(d), places)


def parse_date_mdy(value: object) -> date | None:
    """Kaggle 'M/D/YYYY' → date."""
    s = clean_text(value)
    if not s:
        return None
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def to_date(value: object) -> date | None:
    """datetime / ISO string → date."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = clean_text(value)
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def slugify(value: object) -> str | None:
    s = clean_text(value)
    if not s:
        return None
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or None


def normalize_room_type(value: object) -> str | None:
    """Map free text to the room_type_enum domain."""
    s = clean_text(value)
    if not s:
        return None
    key = s.lower()
    mapping = {
        "entire home/apt": "Entire home/apt",
        "entire home": "Entire home/apt",
        "entire place": "Entire home/apt",
        "private room": "Private room",
        "shared room": "Shared room",
        "hotel room": "Hotel room",
    }
    return mapping.get(key, s)


# Known typo / alias fixes for Kaggle neighbourhood group
NEIGH_GROUP_FIX = {
    "brookln": "Brooklyn",
    "brooklyn": "Brooklyn",
    "manhatan": "Manhattan",
    "manhattan": "Manhattan",
    "queens": "Queens",
    "bronx": "Bronx",
    "staten island": "Staten Island",
}


def normalize_neigh_group(value: object) -> str | None:
    s = clean_text(value)
    if not s:
        return None
    return NEIGH_GROUP_FIX.get(s.lower(), s)


def pg_array(items: list | None) -> str:
    """Render a Python list as a Postgres array literal for COPY, e.g. {a,b}."""
    if not items:
        return "{}"
    out = []
    for it in items:
        el = str(it).replace("\\", "\\\\").replace('"', '\\"')
        out.append(f'"{el}"')
    return "{" + ",".join(out) + "}"
