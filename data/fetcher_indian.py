"""
data/fetcher_indian.py
Fetches 15m candles from Yahoo Finance for:
  - 10 NSE stocks (.NS suffix)
  - Nifty 50 (^NSEI)
  - Sensex (^BSESN)
yfinance gives 60 days of 15m history free — enough to train today.
"""
import sys, os, time
from datetime import datetime
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db.database import save_candles, candle_count

INDIAN_STOCKS = [
    "RELIANCE.NS", "TCS.NS",        "INFY.NS",
    "HDFCBANK.NS", "ICICIBANK.NS",  "WIPRO.NS",
    "HINDUNILVR.NS","BAJFINANCE.NS","SBIN.NS",
    "ADANIENT.NS"
]
INDICES = ["^NSEI", "^BSESN"]
ALL_INDIAN = INDIAN_STOCKS + INDICES

# NSE market hours IST
MARKET_OPEN  = (9, 15)
MARKET_CLOSE = (15, 30)

def is_market_open():
    now = datetime.now()
    if now.weekday() >= 5:       # Sat/Sun
        return False
    t = (now.hour, now.minute)
    return MARKET_OPEN <= t <= MARKET_CLOSE

def _market_label(symbol):
    return "index" if symbol in INDICES else "indian"

def fetch_indian_candles(symbol, period="60d", interval="15m"):
    try:
        import yfinance as yf
        df = yf.Ticker(symbol).history(period=period, interval=interval)
        if df.empty:
            return []
        candles = []
        for ts, row in df.iterrows():
            candles.append((
                int(ts.timestamp() * 1000),
                float(row["Open"]),
                float(row["High"]),
                float(row["Low"]),
                float(row["Close"]),
                float(row["Volume"]),
            ))
        return candles
    except Exception as e:
        print(f"[INDIAN FETCH ERROR] {symbol}: {e}")
        return []

def get_indian_price(symbol):
    try:
        import yfinance as yf
        return float(yf.Ticker(symbol).fast_info["last_price"])
    except:
        return None

def get_nifty_trend(candles_nifty):
    """Returns UP/DOWN/SIDE based on last 4 candles of Nifty"""
    if len(candles_nifty) < 4:
        return "SIDE"
    closes = [c[4] for c in candles_nifty[-4:]]
    change = (closes[-1] - closes[0]) / closes[0] * 100
    if change > 0.3:
        return "UP"
    elif change < -0.3:
        return "DOWN"
    return "SIDE"

def sync_indian(verbose=True):
    """Initial sync — 60 days of 15m candles"""
    for symbol in ALL_INDIAN:
        candles = fetch_indian_candles(symbol, period="60d", interval="15m")
        if candles:
            market = _market_label(symbol)
            save_candles(symbol, market, candles)
            if verbose:
                print(f"[INDIAN] {symbol} → {candle_count(symbol, market)} candles")
        time.sleep(0.5)   # yfinance rate limit

def sync_indian_live(verbose=False):
    """Live update during market hours — latest candles only"""
    if not is_market_open():
        return
    for symbol in ALL_INDIAN:
        candles = fetch_indian_candles(symbol, period="1d", interval="15m")
        if candles:
            market = _market_label(symbol)
            save_candles(symbol, market, candles)
            if verbose:
                print(f"[INDIAN LIVE] {symbol} updated")
        time.sleep(0.3)