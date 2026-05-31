"""
indicators/signals.py
All technical indicators — 15m candles only.
Nifty/Sensex trend used as sentiment filter for Indian stocks.
"""
import numpy as np

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _closes(c): return np.array([x[4] for x in c], dtype=float)
def _highs(c):  return np.array([x[2] for x in c], dtype=float)
def _lows(c):   return np.array([x[3] for x in c], dtype=float)
def _vols(c):   return np.array([x[5] for x in c], dtype=float)

# ─── RSI ──────────────────────────────────────────────────────────────────────

def compute_rsi(closes, period=14):
    if len(closes) < period + 1:
        return 50.0
    deltas = np.diff(closes)
    gains  = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    ag = np.mean(gains[-period:])
    al = np.mean(losses[-period:])
    if al == 0:
        return 100.0
    return 100 - (100 / (1 + ag / al))

# ─── EMA ──────────────────────────────────────────────────────────────────────

def compute_ema(closes, period):
    if len(closes) < period:
        period = len(closes)
    k = 2 / (period + 1)
    ema = closes[0]
    for p in closes[1:]:
        ema = p * k + ema * (1 - k)
    return ema

# ─── MACD ─────────────────────────────────────────────────────────────────────

def compute_macd(closes):
    ema12 = compute_ema(closes, 12)
    ema26 = compute_ema(closes, 26)
    macd  = ema12 - ema26
    macd_series = [
        compute_ema(closes[:-i or len(closes)], 12) -
        compute_ema(closes[:-i or len(closes)], 26)
        for i in range(9, 0, -1)
    ]
    signal = compute_ema(np.array(macd_series), 9)
    return macd, signal

# ─── Bollinger Bands ──────────────────────────────────────────────────────────

def compute_bb(closes, period=20):
    r   = closes[-period:]
    mid = np.mean(r)
    std = np.std(r)
    return mid + 2*std, mid, mid - 2*std   # upper, mid, lower

# ─── Support / Resistance ─────────────────────────────────────────────────────

def find_sr_levels(highs, lows, lookback=50, tol=0.005):
    levels = []
    h = highs[-lookback:]
    l = lows[-lookback:]
    for i in range(2, len(h) - 2):
        if h[i] > h[i-1] and h[i] > h[i-2] and h[i] > h[i+1] and h[i] > h[i+2]:
            levels.append(h[i])
        if l[i] < l[i-1] and l[i] < l[i-2] and l[i] < l[i+1] and l[i] < l[i+2]:
            levels.append(l[i])
    merged = []
    for lvl in sorted(levels):
        if not merged or abs(lvl - merged[-1]) / merged[-1] > tol:
            merged.append(lvl)
    return merged

def price_near_level(price, levels, tol=0.005):
    for lvl in levels:
        if abs(price - lvl) / lvl <= tol:
            return lvl
    return None

# ─── Supertrend ───────────────────────────────────────────────────────────────

def compute_supertrend(highs, lows, closes, period=10, mult=3.0):
    atrs = [
        max(highs[i] - lows[i],
            abs(highs[i] - closes[i-1]),
            abs(lows[i]  - closes[i-1]))
        for i in range(1, len(closes))
    ]
    atr  = np.mean(atrs[-period:])
    mid  = (highs[-1] + lows[-1]) / 2
    lower = mid - mult * atr
    trend = "UP" if closes[-1] > lower else "DOWN"
    return trend, lower, mid + mult * atr

# ─── Fibonacci ────────────────────────────────────────────────────────────────

def compute_fibonacci(highs, lows, lookback=100):
    h = np.max(highs[-lookback:])
    l = np.min(lows[-lookback:])
    d = h - l
    return {k: h - v*d for k, v in
            [("0.236",0.236),("0.382",0.382),
             ("0.500",0.500),("0.618",0.618),("0.786",0.786)]}

# ─── Volume spike ─────────────────────────────────────────────────────────────

def is_volume_spike(vols, threshold=1.5):
    avg = np.mean(vols[-20:-1]) if len(vols) > 20 else np.mean(vols[:-1])
    return vols[-1] > avg * threshold

# ─── VWAP (intraday) ──────────────────────────────────────────────────────────

def compute_vwap(candles):
    tp  = np.array([(c[2]+c[3]+c[4])/3 for c in candles])
    vol = np.array([c[5] for c in candles])
    return np.sum(tp * vol) / (np.sum(vol) + 1e-9)

# ─── MAIN SCORER ──────────────────────────────────────────────────────────────

def compute_signal_score(candles_15m, nifty_trend="SIDE", market="crypto"):
    """
    Input:  60+ × 15m candles, optional Nifty trend for Indian stocks
    Output: dict with score, direction, confidence, reasons, indicators
    """
    if len(candles_15m) < 60:
        return {
            "score": 0, "direction": "HOLD", "confidence": 0,
            "reasons": ["insufficient data"], "price": 0
        }

    score   = 0
    reasons = []

    c   = _closes(candles_15m)
    h   = _highs(candles_15m)
    l   = _lows(candles_15m)
    v   = _vols(candles_15m)
    price = c[-1]

    # 1. RSI
    rsi = compute_rsi(c)
    if rsi < 30:
        score += 2; reasons.append(f"RSI={rsi:.1f} oversold")
    elif rsi > 70:
        score -= 2; reasons.append(f"RSI={rsi:.1f} overbought")

    # 2. EMA 9/21 crossover
    ema9      = compute_ema(c, 9)
    ema21     = compute_ema(c, 21)
    ema50     = compute_ema(c, 50)
    ema9_p    = compute_ema(c[:-1], 9)
    ema21_p   = compute_ema(c[:-1], 21)
    if ema9 > ema21 and ema9_p <= ema21_p:
        score += 2; reasons.append("Golden cross EMA9/21")
    elif ema9 < ema21 and ema9_p >= ema21_p:
        score -= 2; reasons.append("Death cross EMA9/21")
    elif ema9 > ema21:
        score += 1; reasons.append("EMA9 > EMA21 bullish")
    else:
        score -= 1; reasons.append("EMA9 < EMA21 bearish")

    # 3. Price vs EMA50
    if price > ema50:
        score += 1; reasons.append("Above EMA50")
    else:
        score -= 1; reasons.append("Below EMA50")

    # 4. MACD
    try:
        macd, macd_sig = compute_macd(c)
        if macd > macd_sig:
            score += 1; reasons.append("MACD bullish")
        else:
            score -= 1; reasons.append("MACD bearish")
    except:
        pass

    # 5. Bollinger Bands
    bb_upper, bb_mid, bb_lower = compute_bb(c)
    if price <= bb_lower:
        score += 2; reasons.append("At BB lower — bounce zone")
    elif price >= bb_upper:
        score -= 2; reasons.append("At BB upper — overbought")

    # 6. Support / Resistance
    sr = find_sr_levels(h, l)
    near = price_near_level(price, sr)
    if near:
        if price >= near:
            score += 2; reasons.append(f"At support {near:.2f}")
        else:
            score -= 1; reasons.append(f"At resistance {near:.2f}")

    # 7. Supertrend
    trend, *_ = compute_supertrend(h, l, c)
    if trend == "UP":
        score += 1; reasons.append("Supertrend UP")
    else:
        score -= 1; reasons.append("Supertrend DOWN")

    # 8. Volume spike
    if is_volume_spike(v):
        score += 1 if score > 0 else -1
        reasons.append("Volume spike")

    # 9. VWAP
    vwap = compute_vwap(candles_15m)
    if price > vwap:
        score += 1; reasons.append("Above VWAP")
    else:
        score -= 1; reasons.append("Below VWAP")

    # 10. Fibonacci
    fib = compute_fibonacci(h, l)
    for name, lvl in fib.items():
        if abs(price - lvl) / lvl < 0.008:
            if float(name) >= 0.5:
                score += 1; reasons.append(f"Fib {name} support")
            break

    # 11. Nifty sentiment filter (Indian stocks only)
    if market == "indian":
        if nifty_trend == "DOWN":
            score -= 2; reasons.append("Nifty falling — market headwind")
        elif nifty_trend == "UP":
            score += 1; reasons.append("Nifty rising — market tailwind")

    # ── Direction ──
    score = round(score)
    if score >= 5:      direction = "STRONG_BUY"
    elif score >= 2:    direction = "BUY"
    elif score <= -5:   direction = "STRONG_SELL"
    elif score <= -2:   direction = "SELL"
    else:               direction = "HOLD"

    confidence = round(min(abs(score) / 14, 1.0), 2)

    return {
        "score":      score,
        "direction":  direction,
        "confidence": confidence,
        "reasons":    reasons,
        "price":      price,
        "rsi":        round(rsi, 1),
        "ema9":       round(ema9, 4),
        "ema21":      round(ema21, 4),
        "bb_upper":   round(bb_upper, 4),
        "bb_lower":   round(bb_lower, 4),
        "vwap":       round(vwap, 4),
        "supertrend": trend,
        "sr_levels":  [round(x, 2) for x in sr[-5:]],
    }