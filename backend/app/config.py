"""Central configuration.

Everything tunable lives here; ranking weights are overridable via the
SEARCH_WEIGHTS env var (JSON), e.g.
    SEARCH_WEIGHTS={"semantic":0.5,"text":0.2,"rating":0.1,...}
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # repo root (…/Staylens)


def _load_dotenv() -> None:
    """Minimal .env loader — reuses the repo root .env (SUPABASE_DB_URL etc.)."""
    for env_file in (ROOT / ".env", ROOT / "web" / ".env.local"):
        if not env_file.exists():
            continue
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()

#: Default hybrid ranking weights (spec). Must sum to 1.0; renormalized at
#: runtime when a signal is unavailable (e.g. no embeddings yet).
DEFAULT_WEIGHTS: dict[str, float] = {
    "semantic": 0.45,
    "text": 0.20,
    "rating": 0.10,
    "reviews": 0.10,
    "superhost": 0.05,
    "amenity": 0.05,
    "popularity": 0.05,
}


def _weights_from_env() -> dict[str, float]:
    raw = os.environ.get("SEARCH_WEIGHTS")
    if not raw:
        return dict(DEFAULT_WEIGHTS)
    try:
        override = json.loads(raw)
        merged = {**DEFAULT_WEIGHTS, **{k: float(v) for k, v in override.items()}}
        total = sum(merged.values())
        return {k: v / total for k, v in merged.items()} if total > 0 else dict(DEFAULT_WEIGHTS)
    except (ValueError, TypeError):
        return dict(DEFAULT_WEIGHTS)


@dataclass(frozen=True)
class Settings:
    db_url: str = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL") or ""
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")

    embedding_model: str = "text-embedding-3-small"
    embedding_dims: int = int(os.environ.get("EMBEDDING_DIMS", "512"))

    #: candidates fetched from EACH branch before merging/ranking
    candidate_pool: int = int(os.environ.get("SEARCH_CANDIDATE_POOL", "150"))
    #: HNSW recall knob (per-connection)
    hnsw_ef_search: int = int(os.environ.get("HNSW_EF_SEARCH", "80"))

    pool_min: int = 2
    pool_max: int = int(os.environ.get("SEARCH_POOL_MAX", "6"))
    use_prepared: bool = os.environ.get("SEARCH_USE_PREPARED", "1") not in ("0", "false")

    weights: dict[str, float] = field(default_factory=_weights_from_env)

    #: intent extraction heuristics (currency units)
    cheap_price_max: float = float(os.environ.get("INTENT_CHEAP_MAX", "100"))
    luxury_price_min: float = float(os.environ.get("INTENT_LUXURY_MIN", "300"))

    #: review-count normalization caps (log scale)
    reviews_cap: int = 500
    popularity_cap: float = 10.0  # reviews_per_month

    cors_origins: tuple[str, ...] = ("http://localhost:3000", "http://127.0.0.1:3000")
    log_dir: Path = ROOT / "backend" / "logs"


settings = Settings()
