"""
TraderAI — Database
Uses PostgreSQL (Railway/Supabase) if DATABASE_URL is set, else SQLite locally.
"""
import os, sqlite3

DATABASE_URL = os.environ.get("DATABASE_URL")

# ── Connection helper ─────────────────────────────────────────────────────────

def _get_conn():
    if DATABASE_URL:
        import psycopg2
        return psycopg2.connect(DATABASE_URL), "pg"
    path = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "prices.db"))
    return sqlite3.connect(path), "sqlite"

def _ph(db):
    """Placeholder — %s for postgres, ? for sqlite."""
    return "%s" if db == "pg" else "?"

# ── Init ──────────────────────────────────────────────────────────────────────

def init_db():
    conn, db = _get_conn()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS candles (
            id        SERIAL PRIMARY KEY,
            symbol    TEXT    NOT NULL,
            market    TEXT    NOT NULL,
            open_time BIGINT  NOT NULL,
            open      REAL, high REAL, low REAL, close REAL, volume REAL,
            UNIQUE(symbol, market, open_time)
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id         SERIAL PRIMARY KEY,
            symbol     TEXT,
            market     TEXT,
            side       TEXT,
            qty        REAL,
            price      REAL,
            score      REAL,
            confidence REAL,
            pred_15m   TEXT,
            pred_30m   TEXT,
            pred_1h    TEXT,
            timestamp  TEXT DEFAULT (to_char(now(),'YYYY-MM-DD HH24:MI:SS'))
        )
    """)
    conn.commit()
    conn.close()
    print(f"[DB] Using {'PostgreSQL' if DATABASE_URL else 'SQLite'}")

# ── Save candles ──────────────────────────────────────────────────────────────

def save_candles(symbol, market, candles):
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    if db == "pg":
        for row in candles:
            c.execute(f"""
                INSERT INTO candles (symbol, market, open_time, open, high, low, close, volume)
                VALUES ({p},{p},{p},{p},{p},{p},{p},{p})
                ON CONFLICT (symbol, market, open_time) DO NOTHING
            """, (symbol, market, *row))
    else:
        c.executemany(f"""
            INSERT OR IGNORE INTO candles
            (symbol, market, open_time, open, high, low, close, volume)
            VALUES ({p},{p},{p},{p},{p},{p},{p},{p})
        """, [(symbol, market, *row) for row in candles])
    conn.commit()
    conn.close()

# ── Load candles ──────────────────────────────────────────────────────────────

def load_candles(symbol, market, limit=200):
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    c.execute(f"""
        SELECT open_time, open, high, low, close, volume
        FROM candles WHERE symbol={p} AND market={p}
        ORDER BY open_time DESC LIMIT {p}
    """, (symbol, market, limit))
    rows = c.fetchall()
    conn.close()
    return list(reversed(rows))

# ── Save trade ────────────────────────────────────────────────────────────────

def save_trade(symbol, market, side, qty, price, score, confidence, preds=None):
    if preds is None:
        preds = {}
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    c.execute(f"""
        INSERT INTO trades
        (symbol, market, side, qty, price, score, confidence, pred_15m, pred_30m, pred_1h)
        VALUES ({p},{p},{p},{p},{p},{p},{p},{p},{p},{p})
    """, (symbol, market, side, qty, price, score, confidence,
          preds.get("15m","?"), preds.get("30m","?"), preds.get("1h","?")))
    conn.commit()
    conn.close()

# ── Candle count ──────────────────────────────────────────────────────────────

def candle_count(symbol, market):
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    c.execute(f"SELECT COUNT(*) FROM candles WHERE symbol={p} AND market={p}",
              (symbol, market))
    n = c.fetchone()[0]
    conn.close()
    return n

# ── Get all trades ────────────────────────────────────────────────────────────

def get_all_trades(limit=50):
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    c.execute(f"""
        SELECT symbol, market, side, qty, price, score, confidence,
               pred_15m, pred_30m, pred_1h, timestamp
        FROM trades ORDER BY id DESC LIMIT {p}
    """, (limit,))
    rows = c.fetchall()
    conn.close()
    return [
        {"symbol": r[0], "market": r[1], "side": r[2],
         "qty": r[3], "price": r[4], "score": r[5],
         "confidence": r[6], "pred_15m": r[7],
         "pred_30m": r[8], "pred_1h": r[9], "time": r[10]}
        for r in rows
    ]

# ── Get open positions ────────────────────────────────────────────────────────

def get_open_positions():
    conn, db = _get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT b.symbol, b.market, b.qty, b.price
        FROM trades b
        WHERE b.side = 'BUY'
        AND NOT EXISTS (
            SELECT 1 FROM trades s
            WHERE s.symbol = b.symbol
            AND s.market   = b.market
            AND s.side     = 'SELL'
            AND s.id       > b.id
        )
        ORDER BY b.id DESC
    """)
    rows = c.fetchall()
    conn.close()
    return [
        {"symbol": r[0], "market": r[1], "qty": r[2], "entry": r[3]}
        for r in rows
    ]

# ── DB Path (SQLite only) ─────────────────────────────────────────────────────

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "prices.db"))