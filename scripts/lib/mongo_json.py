"""Helpers for reading the MongoDB Sample Airbnb export.

The file `listingsAndReviews.json` is newline-delimited JSON (one listing per
line) encoded in MongoDB **Extended JSON v2**, meaning scalar values are wrapped
in type hint objects like ``{"$numberInt": "8"}`` or ``{"$date": {...}}``.

`unwrap()` recursively strips those wrappers so downstream profiling / ETL can
work with plain Python types (int, float, datetime, list, dict, str, bool).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Iterator

_EXT_SCALAR_KEYS = {
    "$oid",
    "$date",
    "$numberInt",
    "$numberLong",
    "$numberDouble",
    "$numberDecimal",
}


def _to_decimal(raw: str) -> Decimal | None:
    try:
        return Decimal(str(raw))
    except (InvalidOperation, ValueError, TypeError):
        return None


def unwrap(value: Any) -> Any:
    """Recursively convert MongoDB Extended JSON into plain Python values."""
    if isinstance(value, dict):
        keys = set(value.keys())
        if keys & _EXT_SCALAR_KEYS and keys <= _EXT_SCALAR_KEYS:
            if "$oid" in value:
                return value["$oid"]
            if "$numberInt" in value:
                return int(value["$numberInt"])
            if "$numberLong" in value:
                return int(value["$numberLong"])
            if "$numberDouble" in value:
                try:
                    return float(value["$numberDouble"])
                except (ValueError, TypeError):
                    return None
            if "$numberDecimal" in value:
                return _to_decimal(value["$numberDecimal"])
            if "$date" in value:
                return _parse_date(value["$date"])
        return {k: unwrap(v) for k, v in value.items()}
    if isinstance(value, list):
        return [unwrap(v) for v in value]
    return value


def _parse_date(raw: Any) -> datetime | None:
    """Handle both {"$date": {"$numberLong": "ms"}} and ISO string forms."""
    if isinstance(raw, dict) and "$numberLong" in raw:
        ms = int(raw["$numberLong"])
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(raw / 1000, tz=timezone.utc)
    if isinstance(raw, str):
        txt = raw.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(txt)
        except ValueError:
            return None
    return None


def iter_listings(path: str) -> Iterator[dict]:
    """Yield unwrapped listing dicts, one per NDJSON line."""
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            yield unwrap(json.loads(line))


def load_all(path: str) -> list[dict]:
    return list(iter_listings(path))
