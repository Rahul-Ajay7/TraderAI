"""
TraderAI — Database
Uses PostgreSQL (Railway) if DATABASE_URL is set, else SQLite locally.

Tables:
  candles      — OHLCV per symbol/market
  trades       — every BUY/SELL with pnl, fee, exit_reason, status (OPEN/CLOSED)
  predictions  — Kronos forecasts + actual outcomes (filled in later cycles)
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
    return "%s" if db == "pg" else "?"

def _add_column(c, db, table, col, coltype):
    """Idempotent ALTER TABLE ADD COLUMN.
    PG: IF NOT EXISTS (a failed ALTER would abort the whole transaction).
    SQLite: try/except — no IF NOT EXISTS support, but errors don't poison txn."""
    if db == "pg":
        c.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {coltype}")
    else:
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {coltype}")
        except Exception:
            pass  # column already exists

# ── Init ──────────────────────────────────────────────────────────────────────

def init_db():
    conn, db = _get_conn()
    c = conn.cursor()

    if db == "pg":
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
                timestamp  TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id              SERIAL PRIMARY KEY,
                symbol          TEXT,
                market          TEXT,
                pred_time       BIGINT,
                price_now       REAL,
                pred_close_15m  REAL,
                pred_close_1h   REAL,
                dir_15m         TEXT,
                dir_1h          TEXT,
                actual_15m      REAL,
                actual_1h       REAL,
                evaluated       INTEGER DEFAULT 0
            )
        """)
    else:
        c.execute("""
            CREATE TABLE IF NOT EXISTS candles (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol    TEXT    NOT NULL,
                market    TEXT    NOT NULL,
                open_time INTEGER NOT NULL,
                open      REAL, high REAL, low REAL, close REAL, volume REAL,
                UNIQUE(symbol, market, open_time)
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
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
                timestamp  TEXT DEFAULT (datetime('now'))
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol          TEXT,
                market          TEXT,
                pred_time       INTEGER,
                price_now       REAL,
                pred_close_15m  REAL,
                pred_close_1h   REAL,
                dir_15m         TEXT,
                dir_1h          TEXT,
                actual_15m      REAL,
                actual_1h       REAL,
                evaluated       INTEGER DEFAULT 0
            )
        """)

    # Migrations for pre-existing trades tables
    _add_column(c, db, "trades", "status",      "TEXT DEFAULT 'OPEN'")
    _add_column(c, db, "trades", "pnl",         "REAL")
    _add_column(c, db, "trades", "fee",         "REAL DEFAULT 0")
    _add_column(c, db, "trades", "exit_reason", "TEXT")

    conn.commit()
    conn.close()
    print(f"[DB] Using {'PostgreSQL' if DATABASE_URL else 'SQLite'}", flush=True)

# ── Save candles ──────────────────────────────────────────────────────────────

def save_candles(symbol, market, candles):
    if not candles:
        return
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    if db == "pg":
        from psycopg2.extras import execute_batch
        execute_batch(c, f"""
            INSERT INTO candles (symbol, market, open_time, open, high, low, close, volume)
            VALUES ({p},{p},{p},{p},{p},{p},{p},{p})
            ON CONFLICT (symbol, market, open_time) DO NOTHING
        """, [(symbol, market, *row) for row in candles], page_size=500)
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

def save_trade(symbol, market, side, qty, price, score, confidence, preds=None,
               pnl=None, fee=0.0, exit_reason=None):
    if preds is None:
        preds = {}
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    status = "OPEN" if side == "BUY" else "CLOSED"
    c.execute(f"""
        INSERT INTO trades
        (symbol, market, side, qty, price, score, confidence,
         pred_15m, pred_30m, pred_1h, status, pnl, fee, exit_reason)
        VALUES ({p},{p},{p},{p},{p},{p},{p},{p},{p},{p},{p},{p},{p},{p})
    """, (symbol, market, side, qty, price, score, confidence,
          preds.get("15m","?"), preds.get("30m","?"), preds.get("1h","?"),
          status, pnl, fee, exit_reason))
    if side == "SELL":
        # close the matching open BUY rows for this symbol
        c.execute(f"""
            UPDATE trades SET status='CLOSED'
            WHERE symbol={p} AND market={p} AND side='BUY' AND status='OPEN'
        """, (symbol, market))
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
               pred_15m, pred_30m, pred_1h, timestamp, pnl, fee, exit_reason
        FROM trades ORDER BY id DESC LIMIT {p}
    """, (limit,))
    rows = c.fetchall()
    conn.close()
    return [
        {"symbol": r[0], "market": r[1], "side": r[2],
         "qty": r[3], "price": r[4], "score": r[5],
         "confidence": r[6], "pred_15m": r[7],
         "pred_30m": r[8], "pred_1h": r[9], "time": r[10],
         "pnl": r[11], "fee": r[12], "exit_reason": r[13]}
        for r in rows
    ]

# ── Get open positions ────────────────────────────────────────────────────────

def get_open_positions():
    conn, db = _get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT symbol, market, qty, price
        FROM trades
        WHERE side='BUY' AND status='OPEN'
        ORDER BY id DESC
    """)
    rows = c.fetchall()
    conn.close()
    return [
        {"symbol": r[0], "market": r[1], "qty": r[2], "entry": r[3]}
        for r in rows
    ]

# ── Close all positions (used by /api/reset) ──────────────────────────────────

def close_all_positions():
    """Marks every open BUY as closed so reload_positions() won't resurrect them."""
    conn, db = _get_conn()
    c = conn.cursor()
    c.execute("UPDATE trades SET status='CLOSED', exit_reason='RESET' WHERE status='OPEN'")
    n = c.rowcount
    conn.commit()
    conn.close()
    return n

# ── Trade statistics ──────────────────────────────────────────────────────────

def trade_stats():
    """Realized PnL stats from SELL rows that carry pnl."""
    conn, db = _get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT market, COUNT(*),
               SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END),
               COALESCE(SUM(pnl), 0),
               COALESCE(SUM(fee), 0)
        FROM trades WHERE side='SELL' AND pnl IS NOT NULL
        GROUP BY market
    """)
    rows = c.fetchall()
    conn.close()
    out = {}
    for market, total, wins, pnl_sum, fee_sum in rows:
        out[market] = {
            "closed_trades": total,
            "wins": wins,
            "win_rate": round(wins / total, 3) if total else 0,
            "realized_pnl": round(pnl_sum, 2),
            "fees_paid": round(fee_sum, 2),
        }
    return out

# ── Predictions logging / evaluation ─────────────────────────────────────────

def save_prediction(symbol, market, pred_time, price_now,
                    pred_close_15m, pred_close_1h, dir_15m, dir_1h):
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    c.execute(f"""
        INSERT INTO predictions
        (symbol, market, pred_time, price_now, pred_close_15m, pred_close_1h,
         dir_15m, dir_1h, evaluated)
        VALUES ({p},{p},{p},{p},{p},{p},{p},{p},0)
    """, (symbol, market, pred_time, price_now,
          pred_close_15m, pred_close_1h, dir_15m, dir_1h))
    conn.commit()
    conn.close()

def evaluate_predictions():
    """Fills actual_15m/actual_1h once future candles exist. Returns rows updated."""
    conn, db = _get_conn()
    c = conn.cursor()
    p = _ph(db)
    c.execute("""
        SELECT id, symbol, market, pred_time FROM predictions
        WHERE evaluated = 0
    """)
    pending = c.fetchall()
    updated = 0
    for pid, symbol, market, pred_time in pending:
        # candle that OPENS at/after pred_time + horizon covers the horizon close
        t15 = pred_time + 15*60*1000
        t1h = pred_time + 60*60*1000
        c.execute(f"""
            SELECT close FROM candles
            WHERE symbol={p} AND market={p} AND open_time >= {p}
            ORDER BY open_time ASC LIMIT 1
        """, (symbol, market, t15))
        r15 = c.fetchone()
        c.execute(f"""
            SELECT close FROM candles
            WHERE symbol={p} AND market={p} AND open_time >= {p}
            ORDER BY open_time ASC LIMIT 1
        """, (symbol, market, t1h))
        r1h = c.fetchone()
        if r15 and r1h:
            c.execute(f"""
                UPDATE predictions SET actual_15m={p}, actual_1h={p}, evaluated=1
                WHERE id={p}
            """, (r15[0], r1h[0], pid))
            updated += 1
    conn.commit()
    conn.close()
    return updated

def prediction_stats():
    """Direction hit-rate + MAE for evaluated predictions."""
    conn, db = _get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT symbol, price_now, pred_close_15m, pred_close_1h,
               dir_15m, dir_1h, actual_15m, actual_1h
        FROM predictions WHERE evaluated = 1
    """)
    rows = c.fetchall()
    conn.close()
    if not rows:
        return {"evaluated": 0}

    def _dir(now, future, threshold=0.003):
        chg = (future - now) / now
        return "BUY" if chg > threshold else "SELL" if chg < -threshold else "HOLD"

    hit15 = hit1h = 0
    mae15 = mae1h = 0.0
    for sym, now, p15, p1h, d15, d1h, a15, a1h in rows:
        if d15 == _dir(now, a15): hit15 += 1
        if d1h == _dir(now, a1h): hit1h += 1
        mae15 += abs(p15 - a15) / now
        mae1h += abs(p1h - a1h) / now
    n = len(rows)
    return {
        "evaluated":    n,
        "hit_rate_15m": round(hit15 / n, 3),
        "hit_rate_1h":  round(hit1h / n, 3),
        "mae_pct_15m":  round(mae15 / n * 100, 3),
        "mae_pct_1h":   round(mae1h / n * 100, 3),
    }

# ── DB Path (SQLite only) ─────────────────────────────────────────────────────

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "prices.db"))
