"""Postgres access layer.

- ThreadedConnectionPool (psycopg2) shared across requests.
- Server-side PREPARE per connection for the hot search statements: fixed-shape
  SQL with null-checked parameters means Postgres caches one plan per statement.
  Falls back transparently to plain execution if PREPARE is unavailable (e.g.
  a transaction-mode pooler).
- Each pooled connection gets `SET hnsw.ef_search` once for vector recall.
"""
from __future__ import annotations

import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool

from app.config import settings

log = logging.getLogger("search.db")

#: executor used to run the two search branches in parallel
EXECUTOR = ThreadPoolExecutor(max_workers=settings.pool_max)

_pool: ThreadedConnectionPool | None = None
_pool_lock = threading.Lock()

# psycopg2 connections reject arbitrary attributes → track session state here.
# Keys are id(conn); pool connections live until closeall so ids are stable.
_ready_conns: set[int] = set()
_prepared_by_conn: dict[int, set[str]] = {}


def init_pool() -> None:
    global _pool
    with _pool_lock:
        if _pool is None:
            _pool = ThreadedConnectionPool(
                settings.pool_min, settings.pool_max, dsn=settings.db_url
            )
            log.info("db pool ready (min=%s max=%s)", settings.pool_min, settings.pool_max)


def close_pool() -> None:
    global _pool
    with _pool_lock:
        if _pool is not None:
            _pool.closeall()
            _pool = None
        _ready_conns.clear()
        _prepared_by_conn.clear()


def _prepare_connection(conn) -> None:
    """One-time session setup on a fresh pooled connection."""
    if id(conn) in _ready_conns:
        return
    with conn.cursor() as cur:
        cur.execute("SET hnsw.ef_search = %s", (settings.hnsw_ef_search,))
    conn.commit()
    _ready_conns.add(id(conn))
    _prepared_by_conn[id(conn)] = set()


@contextmanager
def connection():
    if _pool is None:
        init_pool()
    assert _pool is not None
    conn = _pool.getconn()
    try:
        _prepare_connection(conn)
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def run_prepared(name: str, sql: str, params: tuple) -> list[dict]:
    """Execute a fixed-shape statement, preferring a server-side prepared plan.

    `sql` must reference parameters as $1..$n (PREPARE syntax). When prepared
    execution is off/unsupported we rewrite $n -> %s and execute directly.
    """
    with connection() as conn:
        prepared = _prepared_by_conn.setdefault(id(conn), set())
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if settings.use_prepared:
                try:
                    if name not in prepared:
                        cur.execute(f"PREPARE {name} AS {sql}")
                        prepared.add(name)
                    placeholders = ", ".join(["%s"] * len(params))
                    cur.execute(f"EXECUTE {name} ({placeholders})", params)
                    return [dict(r) for r in cur.fetchall()]
                except psycopg2.Error as exc:
                    log.warning("prepared path failed (%s); falling back", exc.pgcode)
                    conn.rollback()
                    prepared.discard(name)
            # plain execution fallback: $n -> named placeholders ($n may repeat)
            plain = re.sub(r"\$(\d+)", lambda m: f"%(p{m.group(1)})s", sql)
            cur.execute(plain, {f"p{i + 1}": v for i, v in enumerate(params)})
            return [dict(r) for r in cur.fetchall()]


def run_query(sql: str, params: tuple = ()) -> list[dict]:
    """Plain parameterized query (%s placeholders)."""
    with connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]
