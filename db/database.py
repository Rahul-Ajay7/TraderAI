"""
TraderAI — SQLite Database
Tables: candles, trades
market column separates: crypto / indian / index
"""
import sqlite3, os

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "prices.db"))

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
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
    conn.commit()
    conn.close()

def save_candles(symbol, market, candles):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executemany("""
        INSERT OR IGNORE INTO candles
        (symbol, market, open_time, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, [(symbol, market, *row) for row in candles])
    conn.commit()
    conn.close()

def load_candles(symbol, market, limit=200):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT open_time, open, high, low, close, volume
        FROM candles WHERE symbol=? AND market=?
        ORDER BY open_time DESC LIMIT ?
    """, (symbol, market, limit))
    rows = c.fetchall()
    conn.close()
    return list(reversed(rows))

def save_trade(symbol, market, side, qty, price, score, confidence, preds=None):
    if preds is None:
        preds = {}
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO trades
        (symbol, market, side, qty, price, score, confidence, pred_15m, pred_30m, pred_1h)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (symbol, market, side, qty, price, score, confidence,
          preds.get("15m", "?"), preds.get("30m", "?"), preds.get("1h", "?")))
    conn.commit()
    conn.close()

def candle_count(symbol, market):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM candles WHERE symbol=? AND market=?",
              (symbol, market))
    n = c.fetchone()[0]
    conn.close()
    return n

def get_all_trades(limit=50):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT symbol, market, side, qty, price, score, confidence,
               pred_15m, pred_30m, pred_1h, timestamp
        FROM trades ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = c.fetchall()
    conn.close()
    return [
        {
            "symbol": r[0], "market": r[1], "side": r[2],
            "qty": r[3], "price": r[4], "score": r[5],
            "confidence": r[6], "pred_15m": r[7],
            "pred_30m": r[8], "pred_1h": r[9], "time": r[10]
        }
        for r in rows
    ]

def get_open_positions():
    """Returns open positions — BUY trades with no matching SELL."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT b.symbol, b.market, b.qty, b.price
        FROM trades b
        WHERE b.side = 'BUY'
        AND NOT EXISTS (
            SELECT 1 FROM trades s
            WHERE s.symbol = b.symbol
            AND s.market  = b.market
            AND s.side    = 'SELL'
            AND s.id      > b.id
        )
        ORDER BY b.id DESC
    """)
    rows = c.fetchall()
    conn.close()
    return [
        {"symbol": r[0], "market": r[1], "qty": r[2], "entry": r[3]}
        for r in rows
    ]