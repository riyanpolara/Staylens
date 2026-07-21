"""Search analytics — in-process aggregates + JSONL audit log.

No schema changes: aggregates live in memory (reset on restart) and every
search/click is appended to backend/logs/*.jsonl for offline analysis.
"""
from __future__ import annotations

import json
import threading
import time
from collections import Counter, deque
from pathlib import Path

from app.config import settings


class AnalyticsRepo:
    def __init__(self, log_dir: Path) -> None:
        self._lock = threading.Lock()
        self.cities: Counter[str] = Counter()
        self.amenities: Counter[str] = Counter()
        self.clicks: Counter[str] = Counter()
        self.click_names: dict[str, str] = {}
        self.latencies: deque[float] = deque(maxlen=1000)
        self.searches = 0
        log_dir.mkdir(parents=True, exist_ok=True)
        self._search_log = log_dir / "searches.jsonl"
        self._click_log = log_dir / "clicks.jsonl"

    def record_search(
        self,
        query: str,
        city: str | None,
        amenities: list[str],
        stages: dict[str, float],
        results: int,
    ) -> None:
        with self._lock:
            self.searches += 1
            if city:
                self.cities[city.title()] += 1
            for slug in amenities:
                self.amenities[slug] += 1
            self.latencies.append(stages.get("total_ms", 0.0))
        self._append(
            self._search_log,
            {
                "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "query": query,
                "city": city,
                "amenities": amenities,
                "results": results,
                **stages,
            },
        )

    def record_click(self, property_id: str, name: str | None, query: str | None) -> None:
        with self._lock:
            self.clicks[property_id] += 1
            if name:
                self.click_names[property_id] = name
        self._append(
            self._click_log,
            {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), "property_id": property_id, "query": query},
        )

    def snapshot(self) -> dict:
        with self._lock:
            lat = list(self.latencies)
            return {
                "total_searches": self.searches,
                "avg_latency_ms": round(sum(lat) / len(lat), 1) if lat else None,
                "p95_latency_ms": round(sorted(lat)[int(len(lat) * 0.95) - 1], 1) if len(lat) >= 20 else None,
                "top_cities": [{"city": c, "searches": n} for c, n in self.cities.most_common(10)],
                "top_amenities": [{"amenity": a, "searches": n} for a, n in self.amenities.most_common(10)],
                "top_clicked": [
                    {"property_id": pid, "name": self.click_names.get(pid), "clicks": n}
                    for pid, n in self.clicks.most_common(10)
                ],
            }

    @staticmethod
    def _append(path: Path, record: dict) -> None:
        try:
            with path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        except OSError:
            pass  # analytics must never break search


analytics = AnalyticsRepo(settings.log_dir)
