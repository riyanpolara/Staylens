"""Search API routes."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.repositories.analytics_repo import analytics
from app.schemas.search_schema import ClickEvent, HybridSearchRequest, HybridSearchResponse
from app.semantic import embeddings
from app.semantic.semantic_search import embeddings_status
from app.services.hybrid_search import hybrid_search

log = logging.getLogger("search.api")
router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("/hybrid", response_model=HybridSearchResponse)
async def search_hybrid(req: HybridSearchRequest) -> HybridSearchResponse:
    try:
        return await hybrid_search(req)
    except Exception:  # noqa: BLE001
        log.exception("hybrid search failed")
        raise HTTPException(status_code=500, detail="search failed") from None


@router.post("/click", status_code=204)
def track_click(event: ClickEvent) -> None:
    analytics.record_click(event.property_id, event.name, event.query)


@router.get("/analytics")
def search_analytics() -> dict:
    return analytics.snapshot()


def _safe_db_target() -> str:
    """host:port the service is actually configured to reach (no credentials)."""
    import re

    from app.config import settings

    m = re.search(r"@([^/?]+)", settings.db_url or "")
    if not m:
        return "unset"
    target = m.group(1)
    kind = "pooler" if "pooler.supabase.com" in target else "direct (IPv6-only!)"
    return f"{target} [{kind}]"


@router.get("/health")
def health() -> dict:
    from app.repositories.db import run_query

    try:
        run_query("select 1")
        db_status = "ok"
    except Exception as exc:  # noqa: BLE001
        db_status = f"unavailable: {str(exc).splitlines()[0][:200]}"

    rows = embeddings_status.count() if db_status == "ok" else 0
    stored = embeddings_status.stored_model() if db_status == "ok" else None
    enabled = embeddings.available() and rows > 0 and embeddings.matches_stored_model(stored)
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "db_target": _safe_db_target(),
        "semantic": {
            **embeddings.provider_info(),
            "embeddings_rows": rows,
            "stored_model": stored,
            "enabled": enabled,
        },
    }
