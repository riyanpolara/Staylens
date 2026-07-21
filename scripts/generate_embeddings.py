"""Phase 6 — Generate property embeddings for semantic search.

Builds a rich text document per property, embeds it with OpenAI
`text-embedding-3-small` (1536 dims), and upserts into the `embeddings` table.
A content hash lets re-runs skip unchanged properties (incremental & cheap).

Prerequisites
-------------
    pip install openai psycopg2-binary
    set OPENAI_API_KEY=sk-...
    set SUPABASE_DB_URL=postgresql://...:<pwd>@...pooler.supabase.com:5432/postgres

Run
---
    python scripts/generate_embeddings.py               # all missing/changed
    python scripts/generate_embeddings.py --limit 500   # first N (testing)
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
import time

MODEL = "text-embedding-3-small"
DIMS = int(os.environ.get("EMBEDDING_DIMS", "512"))  # deployment profile: 512-dim
BATCH = 100


def build_content(p: dict, amenities: list[str]) -> str:
    """Compose the text that represents a property for semantic search."""
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
    text = "\n".join(s.strip() for s in parts if s and str(s).strip())
    return text[:8000]  # keep well under the model's token limit


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--source", default=None,
                    help="only embed properties from this source, e.g. inside_airbnb "
                         "(satisfies 'embed only newly imported properties')")
    args = ap.parse_args()

    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    key = os.environ.get("OPENAI_API_KEY")
    if not dsn or not key:
        print("ERROR: set SUPABASE_DB_URL and OPENAI_API_KEY.", file=sys.stderr)
        return 2
    try:
        import psycopg2
        import psycopg2.extras
        from openai import OpenAI
    except ImportError:
        print("ERROR: pip install openai psycopg2-binary", file=sys.stderr)
        return 2

    client = OpenAI(api_key=key)
    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Pull properties + aggregated amenities + existing hash.
    limit_sql = f"LIMIT {int(args.limit)}" if args.limit else ""
    where_sql = "where p.source = %(source)s" if args.source else ""
    cur.execute(f"""
        select p.id, p.name, p.summary, p.space, p.neighborhood_overview,
               p.property_type, p.room_type::text as room_type, p.city, p.country,
               p.accommodates, p.bedrooms,
               coalesce(array_agg(a.name) filter (where a.name is not null), '{{}}') as amenities,
               e.content_hash as existing_hash
        from properties p
        left join property_amenities pa on pa.property_id = p.id
        left join amenities a on a.id = pa.amenity_id
        left join embeddings e on e.property_id = p.id
        {where_sql}
        group by p.id, e.content_hash
        {limit_sql}
    """, {"source": args.source} if args.source else None)
    rows = cur.fetchall()
    print(f"Fetched {len(rows):,} properties")

    pending = []
    for r in rows:
        content = build_content(r, list(r["amenities"]))
        h = hashlib.md5(content.encode("utf-8")).hexdigest()
        if r["existing_hash"] == h:
            continue  # unchanged → skip (saves API cost)
        pending.append((r["id"], content, h))
    print(f"{len(pending):,} need (re)embedding; {len(rows) - len(pending):,} unchanged")

    upserts = 0
    for i in range(0, len(pending), BATCH):
        chunk = pending[i:i + BATCH]
        for attempt in range(5):
            try:
                resp = client.embeddings.create(
                    model=MODEL, dimensions=DIMS,
                    input=[c[1] for c in chunk])
                break
            except Exception as exc:  # noqa: BLE001 — retry with backoff
                wait = 2 ** attempt
                print(f"  batch {i//BATCH} error: {exc}; retry in {wait}s")
                time.sleep(wait)
        else:
            print("  giving up on batch after retries", file=sys.stderr)
            conn.rollback()
            return 1

        records = [
            (pid, content, chash, "[" + ",".join(map(str, d.embedding)) + "]", MODEL)
            for (pid, content, chash), d in zip(chunk, resp.data)
        ]
        psycopg2.extras.execute_values(cur, """
            insert into embeddings (property_id, content, content_hash, embedding, model)
            values %s
            on conflict (property_id) do update
              set content = excluded.content,
                  content_hash = excluded.content_hash,
                  embedding = excluded.embedding,
                  model = excluded.model,
                  updated_at = now()
        """, records, template="(%s,%s,%s,%s::vector,%s)")
        conn.commit()
        upserts += len(records)
        print(f"  embedded {upserts:,}/{len(pending):,}")

    cur.close()
    conn.close()
    print(f"Done. Upserted {upserts:,} embeddings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
