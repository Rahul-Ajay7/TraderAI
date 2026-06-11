"""
data/fetcher_crypto.py
Fetches 15m candles from Binance for 5 crypto symbols.
No API key needed — public endpoint.
"""
import requests, time, sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db.database import save_candles, candle_count

CRYPTO_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"]
BASE_URL = "https://data-api.binance.vision/api/v3/klines"

def fetch_crypto_candles(symbol, limit=500, retries=2):
    for attempt in range(retries + 1):
        try:
            r = requests.get(BASE_URL,
                params={"symbol": symbol, "interval": "15m", "limit": limit},
                timeout=10)
            r.raise_for_status()
            return [
                (int(c[0]), float(c[1]), float(c[2]),
                 float(c[3]), float(c[4]), float(c[5]))
                for c in r.json()
            ]
        except Exception as e:
            if attempt < retries:
                wait = 2 ** attempt
                print(f"[CRYPTO FETCH RETRY] {symbol}: {e} — retry in {wait}s")
                time.sleep(wait)
            else:
                print(f"[CRYPTO FETCH ERROR] {symbol}: {e}")
    return []

def get_crypto_price(symbol):
    try:
        r = requests.get("https://data-api.binance.vision/api/v3/ticker/price",
                         params={"symbol": symbol}, timeout=5)
        return float(r.json()["price"])
    except:
        return None

def sync_crypto(verbose=True):
    """Initial sync — 500 candles per symbol"""
    for symbol in CRYPTO_SYMBOLS:
        candles = fetch_crypto_candles(symbol, limit=500)
        if candles:
            save_candles(symbol, "crypto", candles)
            if verbose:
                print(f"[CRYPTO] {symbol} → {candle_count(symbol,'crypto')} candles")
        time.sleep(0.3)

def sync_crypto_live(verbose=False):
    """Live update — latest 3 candles only"""
    for symbol in CRYPTO_SYMBOLS:
        candles = fetch_crypto_candles(symbol, limit=3)
        if candles:
            save_candles(symbol, "crypto", candles)
            if verbose:
                print(f"[CRYPTO LIVE] {symbol} updated")
        time.sleep(0.2)
