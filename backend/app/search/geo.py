"""Geographic helpers — bbox/radius validation (SQL does the heavy lifting
via the earthdistance extension + the existing GiST ll_to_earth index)."""
from __future__ import annotations


def valid_lat(v: float) -> bool:
    return -90.0 <= v <= 90.0


def valid_lng(v: float) -> bool:
    return -180.0 <= v <= 180.0


def normalize_bbox(
    lat_min: float, lat_max: float, lng_min: float, lng_max: float
) -> tuple[float, float, float, float] | None:
    """Order-insensitive bbox; None when out of range."""
    lat_lo, lat_hi = sorted((lat_min, lat_max))
    lng_lo, lng_hi = sorted((lng_min, lng_max))
    if not (valid_lat(lat_lo) and valid_lat(lat_hi) and valid_lng(lng_lo) and valid_lng(lng_hi)):
        return None
    return (lat_lo, lat_hi, lng_lo, lng_hi)


def normalize_center(lat: float, lng: float) -> tuple[float, float] | None:
    return (lat, lng) if valid_lat(lat) and valid_lng(lng) else None
