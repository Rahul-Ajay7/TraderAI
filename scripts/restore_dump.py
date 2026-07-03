"""
Restore a TraderAI data dump into a fresh Postgres (e.g. Neon).

Usage:
  set DATABASE_URL=postgresql://...neon.tech/neondb   (PowerShell: $env:DATABASE_URL="...")
  python scripts/restore_dump.py path/to/railway_dump.sql

Creates the tables first (init_db) then replays the INSERT statements.
Idempotent: dump lines carry ON CONFLICT DO NOTHING.
"""
import os, sys, time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if len(sys.argv) < 2:
    sys.exit("usage: python scripts/restore_dump.py <dump.sql>")
DUMP = sys.argv[1]
if not os.path.isfile(DUMP):
    sys.exit(f"dump file not found: {DUMP}")
if not os.environ.get("DATABASE_URL"):
    sys.exit("DATABASE_URL env var must point at the target Postgres")

from db.database import init_db, _get_conn

print("[RESTORE] creating tables (init_db)...")
init_db()

conn, db = _get_conn()
if db != "pg":
    sys.exit("DATABASE_URL not picked up — target must be Postgres")
cur = conn.cursor()

t0, n, batch = time.time(), 0, 0
with open(DUMP, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line.startswith("INSERT INTO"):
            continue
        cur.execute(line.rstrip(";"))
        n += 1
        batch += 1
        if batch >= 1000:
            conn.commit()
            batch = 0
            print(f"  ...{n} rows ({time.time()-t0:.0f}s)", flush=True)
conn.commit()
conn.close()
print(f"[RESTORE] done: {n} rows in {time.time()-t0:.0f}s")

# verify
conn, _ = _get_conn()
cur = conn.cursor()
for t in ("candles", "trades", "predictions"):
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {cur.fetchone()[0]} rows")
conn.close()
