"""EmbeddingProvider abstraction — semantic search is an enhancement, never a
dependency.

Configured via env:
    EMBEDDING_PROVIDER = auto | none | openai | gemini | ollama | sentence-transformers
      auto (default): first provider whose configuration is present
      none:           semantic search off (FTS + filters + ranking still work)

    openai:                OPENAI_API_KEY   [OPENAI_EMBEDDING_MODEL=text-embedding-3-small]
    gemini:                GEMINI_API_KEY or GOOGLE_API_KEY [GEMINI_EMBEDDING_MODEL=text-embedding-004]
    ollama:                OLLAMA_HOST=http://localhost:11434 [OLLAMA_EMBEDDING_MODEL=nomic-embed-text]
    sentence-transformers: ST_EMBEDDING_MODEL=all-MiniLM-L6-v2 (local, no API)

All vectors are fitted to the DB profile (vector(512)) by truncation or
zero-padding + L2 renormalization. IMPORTANT: query vectors are only comparable
to property vectors produced by the SAME provider/model — the facade
(embeddings.py) verifies this against embeddings.model and disables semantic
search on mismatch instead of returning garbage.

TODO(embeddings-backfill): scripts/generate_embeddings.py currently embeds
properties with OpenAI only; port it onto this provider layer so any provider
can (re)build the property vectors.
"""
from __future__ import annotations

import json
import logging
import math
import os
import urllib.request
from abc import ABC, abstractmethod

from app.config import settings

log = logging.getLogger("search.providers")


def _fit(vec: list[float], dims: int) -> list[float]:
    """Truncate or zero-pad to `dims`, then L2-normalize."""
    v = list(vec[:dims]) + [0.0] * max(0, dims - len(vec))
    norm = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / norm for x in v]


class EmbeddingProvider(ABC):
    """One method: text → vector (or None on failure — search must go on)."""

    name: str = "abstract"
    model_id: str = ""

    @abstractmethod
    def _embed_raw(self, text: str) -> list[float] | None: ...

    def embed(self, text: str) -> list[float] | None:
        try:
            raw = self._embed_raw(text)
        except Exception as exc:  # noqa: BLE001 — degrade, never fail the search
            log.warning("%s embedding failed: %s", self.name, exc)
            return None
        return _fit(raw, settings.embedding_dims) if raw else None


class OpenAIProvider(EmbeddingProvider):
    name = "openai"

    def __init__(self) -> None:
        self.model_id = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        from openai import OpenAI  # lazy — optional dependency

        self._client = OpenAI(api_key=settings.openai_api_key, timeout=10.0)

    def _embed_raw(self, text: str) -> list[float] | None:
        resp = self._client.embeddings.create(
            model=self.model_id, dimensions=settings.embedding_dims, input=[text]
        )
        return list(resp.data[0].embedding)


class GeminiProvider(EmbeddingProvider):
    name = "gemini"

    def __init__(self) -> None:
        # gemini-embedding-001 supports outputDimensionality=512 (matches the DB
        # vector(512) profile). Auth via the X-goog-api-key header.
        self.model_id = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
        self._key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")

    def _embed_raw(self, text: str) -> list[float] | None:
        # REST call — no SDK dependency required
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_id}:embedContent"
        )
        body = json.dumps({
            "model": f"models/{self.model_id}",
            "content": {"parts": [{"text": text}]},
            "outputDimensionality": settings.embedding_dims,
        }).encode()
        req = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json", "X-goog-api-key": self._key},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        return data.get("embedding", {}).get("values")


class OllamaProvider(EmbeddingProvider):
    name = "ollama"

    def __init__(self) -> None:
        self.model_id = os.environ.get("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
        self._host = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")

    def _embed_raw(self, text: str) -> list[float] | None:
        body = json.dumps({"model": self.model_id, "prompt": text}).encode()
        req = urllib.request.Request(
            f"{self._host}/api/embeddings",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        return data.get("embedding")


class SentenceTransformersProvider(EmbeddingProvider):
    name = "sentence-transformers"

    def __init__(self) -> None:
        self.model_id = os.environ.get("ST_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        from sentence_transformers import SentenceTransformer  # lazy — heavy optional dep

        self._model = SentenceTransformer(self.model_id)

    def _embed_raw(self, text: str) -> list[float] | None:
        return self._model.encode([text], normalize_embeddings=True)[0].tolist()


def _configured(name: str) -> bool:
    return {
        "openai": bool(settings.openai_api_key),
        "gemini": bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")),
        "ollama": bool(os.environ.get("OLLAMA_HOST") or os.environ.get("OLLAMA_EMBEDDING_MODEL")),
        "sentence-transformers": bool(os.environ.get("ST_EMBEDDING_MODEL")),
    }.get(name, False)


_REGISTRY: dict[str, type[EmbeddingProvider]] = {
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
    "ollama": OllamaProvider,
    "sentence-transformers": SentenceTransformersProvider,
    # TODO(providers): register additional providers here (Cohere, Voyage, …)
}


def resolve_provider() -> EmbeddingProvider | None:
    """Build the configured provider; None → semantic search disabled."""
    choice = os.environ.get("EMBEDDING_PROVIDER", "auto").strip().lower()
    if choice == "none":
        return None
    order = [choice] if choice in _REGISTRY else list(_REGISTRY) if choice == "auto" else []
    if not order and choice != "auto":
        log.warning("unknown EMBEDDING_PROVIDER=%r — semantic search disabled", choice)
        return None
    for name in order:
        if not _configured(name):
            continue
        try:
            provider = _REGISTRY[name]()
            log.info("embedding provider: %s (%s)", provider.name, provider.model_id)
            return provider
        except Exception as exc:  # noqa: BLE001 — missing optional dep, bad key, …
            log.warning("provider %s unavailable: %s", name, exc)
    log.info("no embedding provider configured — semantic search disabled")
    return None
