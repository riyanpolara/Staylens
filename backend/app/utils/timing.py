"""Stage timing — every search logs per-stage latency."""
from __future__ import annotations

import time
from contextlib import contextmanager


class StageTimer:
    """Collects named stage durations in milliseconds."""

    def __init__(self) -> None:
        self._t0 = time.perf_counter()
        self.stages: dict[str, float] = {}

    @contextmanager
    def stage(self, name: str):
        start = time.perf_counter()
        try:
            yield
        finally:
            self.stages[name] = round((time.perf_counter() - start) * 1000, 2)

    def set(self, name: str, ms: float) -> None:
        self.stages[name] = round(ms, 2)

    @property
    def total_ms(self) -> float:
        return round((time.perf_counter() - self._t0) * 1000, 2)

    def summary(self) -> dict[str, float]:
        return {**self.stages, "total_ms": self.total_ms}
