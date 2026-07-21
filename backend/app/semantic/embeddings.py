"""Query-embedding facade.

Sits on the EmbeddingProvider abstraction (providers.py). Responsibilities:
  - resolve the provider once (env-driven), cache query vectors (LRU),
  - guard against provider/property-vector mismatch: query vectors are only
    comparable to property vectors embedded by the same model, so semantic
    search stays off when embeddings.model in the DB differs,
  - degrade to None on any failure — the hybrid engine then runs FTS-only.

TODO(embeddings-llm): when an LLM provider is added for query understanding,
it can share the provider credentials resolved here.
"""
from __future__ import annotations

import logging
import threading
from functools import lru_cache

from app.semantic.providers import EmbeddingProvider, resolve_provider

log = logging.getLogger("search.embeddings")

_provider: EmbeddingProvider | None = None
_resolved = False
_lock = threading.Lock()


def get_provider() -> EmbeddingProvider | None:
    global _provider, _resolved
    with _lock:
        if not _resolved:
            _provider = resolve_provider()
            _resolved = True
        return _provider


def available() -> bool:
    """A provider is configured (property-vector match checked separately)."""
    return get_provider() is not None


def provider_info() -> dict:
    p = get_provider()
    return {"provider": p.name, "model": p.model_id} if p else {"provider": None, "model": None}


def matches_stored_model(stored_model: str | None) -> bool:
    """Query and property vectors must come from the same embedding model."""
    p = get_provider()
    if p is None or stored_model is None:
        return False
    ok = stored_model == p.model_id
    if not ok:
        log.warning(
            "embeddings.model=%r ≠ provider model %r — semantic search disabled "
            "(re-run the property embedding backfill with this provider)",
            stored_model, p.model_id,
        )
    return ok


@lru_cache(maxsize=512)
def embed_query(text: str) -> tuple[float, ...] | None:
    """Embed a normalized query string; cached across requests."""
    p = get_provider()
    if p is None or not text.strip():
        return None
    vec = p.embed(text.strip())
    return tuple(vec) if vec else None


def to_vector_literal(vec: tuple[float, ...]) -> str:
    """pgvector text literal: '[0.1,0.2,…]'."""
    return "[" + ",".join(f"{v:.7f}" for v in vec) + "]"
