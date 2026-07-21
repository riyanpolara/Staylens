"""Backfill property embeddings with Google Gemini (gemini-embedding-001 @ 512d).

Mirrors scripts/generate_embeddings.py (same content document, same content-hash
skip, same embeddings table) but uses Gemini's batchEmbedContents REST endpoint
— no SDK required. Vectors are L2-normalized (recommended for <3072 dims) and
stored with model='gemini-embedding-001' so the hybrid backend's model-match
guard enables semantic search automatically.

Env:  SUPABASE_DB_URL, GEMINI_API_KEY   (both read from repo .env)
Run:  python scripts/generate_embeddings_gemini.py [--limit N] [--batch 100]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request

MODEL = "gemini-embedding-001"
DIMS = int(os.environ.get("EMBEDDING_DIMS", "512"))
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:batchEmbedContents"


def load_env() -> None:
    for name in (".env", "web/.env.local"):
        if not os.path.exists(name):
            continue
        for line in open(name, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def build_content(p: dict, amenities: list[str]) -> str:
    parts = [
        p.get("name") or "",
        f"{p.get('room_type') or ''} · {p.get('property_type') or ''}",
        f"in {p.get('city') or ''}, {p.get('country') or ''}",
        p.get("summary") or "",
        p.get("space") or "",
        p.get("neighborhood_overview") or "",
        f"Sleeps {p.get('accommodates') or '?'}, {p.get('bedrooms') or '?'} bedroom(s).",
        ("Amenities: " + ", ".join(amenities)) if amenities else "",
    ]
    return "\n".join(s.strip() for s in parts if s and str(s).strip())[:8000]


def l2(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def embed_batch(key: str, texts: list[str]) -> list[list[float]]:
    body = json.dumps({
        "requests": [
            {
                "model": f"models/{MODEL}",
                "content": {"parts": [{"text": t}]},
                "outputDimensionality": DIMS,
            }
            for t in texts
        ]
    }).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json", "X-goog-api-key": key},
    )
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
            return [l2(e["values"]) for e in data["embeddings"]]
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 500, 503):
                wait = min(60, 2 ** attempt * 2)
                print(f"    {exc.code} rate/again — sleeping {wait}s", flush=True)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("batch failed after retries")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--batch", type=int, default=100)
    args = ap.parse_args()

    load_env()
    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not dsn or not key:
        print("ERROR: set SUPABASE_DB_URL and GEMINI_API_KEY", file=sys.stderr)
        return 2

    import psycopg2
    import psycopg2.extras

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    limit_sql = f"LIMIT {int(args.limit)}" if args.limit else ""
    # Prioritize well-reviewed active listings first (best demo coverage).
    cur.execute(f"""
        select p.id, p.name, p.summary, p.space, p.neighborhood_overview,
               p.property_type, p.room_type::text as room_type, p.city, p.country,
               p.accommodates, p.bedrooms,
               coalesce(array_agg(a.name) filter (where a.name is not null), '{{}}') as amenities,
               e.content_hash as existing_hash, e.model as existing_model
        from properties p
        left join property_amenities pa on pa.property_id = p.id
        left join amenities a on a.id = pa.amenity_id
        left join embeddings e on e.property_id = p.id
        where p.is_active
        group by p.id, e.content_hash, e.model
        order by max(p.number_of_reviews) desc nulls last
        {limit_sql}
    """)
    rows = cur.fetchall()
    print(f"Fetched {len(rows):,} active properties")

    pending = []
    for r in rows:
        content = build_content(r, list(r["amenities"]))
        h = hashlib.md5(content.encode("utf-8")).hexdigest()
        if r["existing_hash"] == h and r["existing_model"] == MODEL:
            continue  # already embedded by this model, unchanged
        pending.append((r["id"], content, h))
    print(f"{len(pending):,} need embedding; {len(rows) - len(pending):,} already current")

    done = 0
    t0 = time.time()
    for i in range(0, len(pending), args.batch):
        chunk = pending[i:i + args.batch]
        vectors = embed_batch(key, [c[1] for c in chunk])
        records = [
            (pid, content, chash, "[" + ",".join(f"{x:.7f}" for x in vec) + "]", MODEL)
            for (pid, content, chash), vec in zip(chunk, vectors)
        ]
        psycopg2.extras.execute_values(cur, """
            insert into embeddings (property_id, content, content_hash, embedding, model)
            values %s
            on conflict (property_id) do update
              set content = excluded.content, content_hash = excluded.content_hash,
                  embedding = excluded.embedding, model = excluded.model, updated_at = now()
        """, records, template="(%s,%s,%s,%s::vector,%s)")
        conn.commit()
        done += len(records)
        rate = done / max(time.time() - t0, 1e-6)
        print(f"  embedded {done:,}/{len(pending):,}  ({rate:.0f}/s)", flush=True)

    cur.close()
    conn.close()
    print(f"Done. Upserted {done:,} Gemini embeddings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
