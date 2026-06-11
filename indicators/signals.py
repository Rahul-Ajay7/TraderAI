"""
indicators/signals.py
IMPROVED: Added ADX (trend strength), candlestick pattern detection,
divergence check, and smarter S/R scoring.
"""
import numpy as np

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _closes(c): return np.array([x[4] for x in c], dtype=float)
def _highs(c):  return np.array([x[2] for x in c], dtype=float)
def _lows(c):   return np.array([x[3] for x in c], dtype=float)
def _opens(c):  return np.array([x[1] for x in c], dtype=float)
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
    return mid + 2*std, mid, mid - 2*std

# ─── ADX (trend strength) — NEW ───────────────────────────────────────────────

def compute_adx(highs, lows, closes, period=14):
    """ADX > 25 = trending, < 20 = ranging. Returns adx, +DI, -DI"""
    if len(closes) < period + 2:
        return 20.0, 0.0, 0.0
    tr_list, pdm_list, ndm_list = [], [], []
    for i in range(1, len(closes)):
        tr  = max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1]))
        pdm = max(highs[i]-highs[i-1], 0) if highs[i]-highs[i-1] > lows[i-1]-lows[i] else 0
        ndm = max(lows[i-1]-lows[i], 0)   if lows[i-1]-lows[i] > highs[i]-highs[i-1] else 0
        tr_list.append(tr); pdm_list.append(pdm); ndm_list.append(ndm)
    atr  = np.mean(tr_list[-period:]) + 1e-9
    pdi  = 100 * np.mean(pdm_list[-period:]) / atr
    ndi  = 100 * np.mean(ndm_list[-period:]) / atr
    dx   = 100 * abs(pdi - ndi) / (pdi + ndi + 1e-9)
    # Smooth DX over period
    adx = np.mean([
        100 * abs(
            100*np.mean(pdm_list[-(period+j):-(j) or None]) /
            (np.mean(tr_list[-(period+j):-(j) or None])+1e-9) -
            100*np.mean(ndm_list[-(period+j):-(j) or None]) /
            (np.mean(tr_list[-(period+j):-(j) or None])+1e-9)
        ) / (
            100*np.mean(pdm_list[-(period+j):-(j) or None]) /
            (np.mean(tr_list[-(period+j):-(j) or None])+1e-9) +
            100*np.mean(ndm_list[-(period+j):-(j) or None]) /
            (np.mean(tr_list[-(period+j):-(j) or None])+1e-9) + 1e-9
        )
        for j in range(min(period, len(tr_list)-period))
    ]) * 100 if len(tr_list) > period*2 else dx
    return round(adx, 1), round(pdi, 1), round(ndi, 1)

# ─── Candlestick Patterns — NEW ───────────────────────────────────────────────

def detect_candle_pattern(opens, highs, lows, closes):
    """Detects last 3 candles for common reversal patterns."""
    if len(closes) < 3:
        return None, 0
    o, h, l, c = opens[-3:], highs[-3:], lows[-3:], closes[-3:]
    body  = [abs(c[i]-o[i]) for i in range(3)]
    range_ = [h[i]-l[i]+1e-9 for i in range(3)]

    # Doji — indecision
    if body[2] / range_[2] < 0.1:
        return "Doji", 0

    # Hammer — bullish reversal (long lower wick, small body at top)
    lower_wick = o[2] - l[2] if c[2] > o[2] else c[2] - l[2]
    upper_wick = h[2] - c[2] if c[2] > o[2] else h[2] - o[2]
    if lower_wick > body[2]*2 and upper_wick < body[2]*0.5 and c[1] < o[1]:
        return "Hammer", 2

    # Shooting Star — bearish reversal (long upper wick)
    if upper_wick > body[2]*2 and lower_wick < body[2]*0.5 and c[1] > o[1]:
        return "ShootingStar", -2

    # Bullish Engulfing
    if c[1] < o[1] and c[2] > o[2] and c[2] > o[1] and o[2] < c[1]:
        return "BullEngulf", 2

    # Bearish Engulfing
    if c[1] > o[1] and c[2] < o[2] and c[2] < o[1] and o[2] > c[1]:
        return "BearEngulf", -2

    # Morning Star — 3-candle bullish
    if c[0] < o[0] and body[1] < body[0]*0.3 and c[2] > o[2] and c[2] > (o[0]+c[0])/2:
        return "MorningStar", 3

    # Evening Star — 3-candle bearish
    if c[0] > o[0] and body[1] < body[0]*0.3 and c[2] < o[2] and c[2] < (o[0]+c[0])/2:
        return "EveningStar", -3

    return None, 0

# ─── RSI Divergence — NEW ─────────────────────────────────────────────────────

def check_rsi_divergence(closes, lookback=20):
    """
    Bullish divergence: price makes lower low, RSI makes higher low → +2
    Bearish divergence: price makes higher high, RSI makes lower high → -2
    """
    if len(closes) < lookback + 14:
        return 0, None
    recent   = closes[-lookback:]
    rsi_vals = [compute_rsi(closes[:-(lookback-i) or len(closes)]) for i in range(lookback)]

    price_low_now  = recent[-1] < min(recent[:-1])
    price_high_now = recent[-1] > max(recent[:-1])
    rsi_low_now    = rsi_vals[-1] > min(rsi_vals[:-1])   # higher low = bullish
    rsi_high_now   = rsi_vals[-1] < max(rsi_vals[:-1])   # lower high = bearish

    if price_low_now and rsi_low_now:
        return 2, "Bullish RSI divergence"
    if price_high_now and rsi_high_now:
        return -2, "Bearish RSI divergence"
    return 0, None

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
    atr   = np.mean(atrs[-period:])
    mid   = (highs[-1] + lows[-1]) / 2
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

# ─── VWAP ─────────────────────────────────────────────────────────────────────

def compute_vwap(candles):
    tp  = np.array([(c[2]+c[3]+c[4])/3 for c in candles])
    vol = np.array([c[5] for c in candles])
    return np.sum(tp * vol) / (np.sum(vol) + 1e-9)

# ─── ATR % ────────────────────────────────────────────────────────────────────

def compute_atr_pct(highs, lows, closes, period=14):
    """ATR as fraction of price — used for vol-scaled sizing + Kronos threshold."""
    if len(closes) < period + 1:
        return 0.0
    trs = [
        max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1]))
        for i in range(1, len(closes))
    ]
    return float(np.mean(trs[-period:]) / (closes[-1] + 1e-9))

# ─── MAIN SCORER ──────────────────────────────────────────────────────────────

def compute_signal_score(candles_15m, nifty_trend="SIDE", market="crypto"):
    if len(candles_15m) < 60:
        return {
            "score": 0, "direction": "HOLD", "confidence": 0,
            "reasons": ["insufficient data"], "price": 0, "atr_pct": 0.0
        }

    score   = 0.0
    reasons = []

    c   = _closes(candles_15m)
    h   = _highs(candles_15m)
    l   = _lows(candles_15m)
    o   = _opens(candles_15m)
    v   = _vols(candles_15m)
    price = c[-1]

    # Regime first — ADX decides which indicator family gets full weight.
    # Trending market: fade mean-reversion signals. Ranging: fade trend signals.
    adx, pdi, ndi = compute_adx(h, l, c)
    trending  = adx > 25
    ranging   = adx < 20
    mr_w      = 0.5 if trending else 1.0   # mean-reversion weight (RSI, BB)
    trend_w   = 0.5 if ranging  else 1.0   # trend-following weight (EMA, MACD, Supertrend)

    # 1. RSI (mean-reversion)
    rsi = compute_rsi(c)
    if rsi < 30:
        score += 2*mr_w; reasons.append(f"RSI={rsi:.1f} oversold")
    elif rsi < 40:
        score += 1*mr_w; reasons.append(f"RSI={rsi:.1f} approaching oversold")
    elif rsi > 70:
        score -= 2*mr_w; reasons.append(f"RSI={rsi:.1f} overbought")
    elif rsi > 60:
        score -= 1*mr_w; reasons.append(f"RSI={rsi:.1f} approaching overbought")

    # 2. EMA 9/21 crossover (trend)
    ema9    = compute_ema(c, 9)
    ema21   = compute_ema(c, 21)
    ema50   = compute_ema(c, 50)
    ema9_p  = compute_ema(c[:-1], 9)
    ema21_p = compute_ema(c[:-1], 21)
    if ema9 > ema21 and ema9_p <= ema21_p:
        score += 2*trend_w; reasons.append("Golden cross EMA9/21")
    elif ema9 < ema21 and ema9_p >= ema21_p:
        score -= 2*trend_w; reasons.append("Death cross EMA9/21")
    elif ema9 > ema21:
        score += 1*trend_w; reasons.append("EMA9 > EMA21 bullish")
    else:
        score -= 1*trend_w; reasons.append("EMA9 < EMA21 bearish")

    # 3. Price vs EMA50 (trend)
    if price > ema50:
        score += 1*trend_w; reasons.append("Above EMA50")
    else:
        score -= 1*trend_w; reasons.append("Below EMA50")

    # 4. MACD (trend)
    try:
        macd, macd_sig = compute_macd(c)
        if macd > macd_sig:
            score += 1*trend_w; reasons.append("MACD bullish")
        else:
            score -= 1*trend_w; reasons.append("MACD bearish")
    except:
        pass

    # 5. Bollinger Bands (mean-reversion)
    bb_upper, bb_mid, bb_lower = compute_bb(c)
    if price <= bb_lower:
        score += 2*mr_w; reasons.append("At BB lower — bounce zone")
    elif price >= bb_upper:
        score -= 2*mr_w; reasons.append("At BB upper — overbought")

    # 6. Support / Resistance
    sr = find_sr_levels(h, l)
    near = price_near_level(price, sr)
    if near:
        if price >= near:
            score += 2; reasons.append(f"At support {near:.2f}")
        else:
            score -= 1; reasons.append(f"At resistance {near:.2f}")

    # 7. Supertrend (trend)
    trend, *_ = compute_supertrend(h, l, c)
    if trend == "UP":
        score += 1*trend_w; reasons.append("Supertrend UP")
    else:
        score -= 1*trend_w; reasons.append("Supertrend DOWN")

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

    # 11. ADX — directional bonus in strong trend
    if trending:
        if pdi > ndi:
            score += 1; reasons.append(f"ADX={adx} strong uptrend")
        else:
            score -= 1; reasons.append(f"ADX={adx} strong downtrend")
    else:
        reasons.append(f"ADX={adx} ranging market")

    # 12. Candlestick patterns (NEW)
    pattern, pat_score = detect_candle_pattern(o, h, l, c)
    if pattern and pat_score != 0:
        score += pat_score
        reasons.append(f"Pattern: {pattern}")

    # 13. RSI Divergence (NEW)
    div_score, div_reason = check_rsi_divergence(c)
    if div_score != 0 and div_reason:
        score += div_score
        reasons.append(div_reason)

    # 14. Nifty sentiment filter (Indian only)
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

    # Deliberately conservative scale. In signal-only mode decide() needs
    # conf > 0.35-0.40, so /16 means only score >= 6.5 ever trades — few trades.
    # Backtested alternatives (2026-06): /8 → 4x trades, avg -28% crypto (0/5
    # beat buy&hold); /12 → -14% (2/5); /16 → -6% (5/5). Fees punish frequency;
    # do not loosen without beating /16 in backtest/backtest.py first.
    confidence = round(min(abs(score) / 16, 1.0), 2)

    return {
        "score":      score,
        "direction":  direction,
        "confidence": confidence,
        "reasons":    reasons,
        "price":      price,
        "atr_pct":    round(compute_atr_pct(h, l, c), 5),
        "rsi":        round(rsi, 1),
        "ema9":       round(ema9, 4),
        "ema21":      round(ema21, 4),
        "bb_upper":   round(bb_upper, 4),
        "bb_lower":   round(bb_lower, 4),
        "vwap":       round(vwap, 4),
        "supertrend": trend,
        "adx":        adx,
        "sr_levels":  [round(x, 2) for x in sr[-5:]],
        "pattern":    pattern,
    }