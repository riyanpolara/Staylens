"""StayLens Hybrid Search API.

Run:
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.search_router import router as search_router
from app.config import settings
from app.repositories.db import close_pool, init_pool
from app.search.filter_engine import amenity_cache
from app.search.intent import places
from app.semantic import embeddings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
log = logging.getLogger("search.app")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # DB init + cache warmup are best-effort: a transient pooler error must not
    # kill the process — the pool retries lazily on the first request and
    # /api/search/health reports the live database status.
    try:
        init_pool()
        amenity_cache.load()
        places.load()
    except Exception:  # noqa: BLE001
        log.warning("db init/warmup failed; will retry lazily", exc_info=True)
    log.info(
        "hybrid search up (weights=%s, embedding=%s)",
        settings.weights, embeddings.provider_info(),
    )
    yield
    close_pool()


app = FastAPI(title="StayLens Hybrid Search", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)


@app.get("/", include_in_schema=False)
def index() -> dict:
    """Service index — the real endpoints live under /api/search/*."""
    return {
        "service": "StayLens Hybrid Search",
        "docs": "/docs",
        "endpoints": {
            "search": "POST /api/search/hybrid",
            "click": "POST /api/search/click",
            "analytics": "GET /api/search/analytics",
            "health": "GET /api/search/health",
        },
        "example": {
            "url": "POST /api/search/hybrid",
            "body": {"query": "Pet friendly apartment in Barcelona", "debug": True},
        },
    }
