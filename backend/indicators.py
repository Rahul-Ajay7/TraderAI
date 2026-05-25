import numpy as np


def rsi(prices: list, period: int = 14) -> float:
    if len(prices) < period + 1:
        return 50.0
    deltas = np.diff(prices[-(period + 1):])
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains) if np.mean(gains) > 0 else 1e-10
    avg_loss = np.mean(losses) if np.mean(losses) > 0 else 1e-10
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def ema(prices: list, period: int) -> float:
    if len(prices) < period:
        return prices[-1] if prices else 0
    k = 2 / (period + 1)
    val = prices[-period]
    for p in prices[-period + 1:]:
        val = p * k + val * (1 - k)
    return round(val, 6)


def macd(prices: list) -> dict:
    if len(prices) < 26:
        return {"signal": "neutral", "macd": 0, "histogram": 0}
    ema12 = ema(prices, 12)
    ema26 = ema(prices, 26)
    macd_line = ema12 - ema26
    signal_line = macd_line * 0.9
    histogram = macd_line - signal_line
    signal = "bullish" if histogram > 0 else "bearish" if histogram < 0 else "neutral"
    return {"signal": signal, "macd": round(macd_line, 6), "histogram": round(histogram, 6)}


def bollinger_bands(prices: list, period: int = 20) -> dict:
    if len(prices) < period:
        return {"position": "inside", "upper": 0, "lower": 0, "middle": 0}
    window = prices[-period:]
    middle = np.mean(window)
    std = np.std(window)
    upper = middle + 2 * std
    lower = middle - 2 * std
    current = prices[-1]
    position = "above" if current > upper else "below" if current < lower else "inside"
    return {
        "position": position,
        "upper": round(upper, 4),
        "middle": round(middle, 4),
        "lower": round(lower, 4),
        "current": round(current, 4),
    }


def moving_average(prices: list, period: int) -> float:
    if len(prices) < period:
        return prices[-1] if prices else 0
    return round(np.mean(prices[-period:]), 4)


def compute_all(prices: list) -> dict:
    return {
        "rsi": rsi(prices),
        "macd": macd(prices),
        "bb": bollinger_bands(prices),
        "ma20": moving_average(prices, 20),
        "ma50": moving_average(prices, 50),
        "current_price": prices[-1] if prices else 0,
        "price_change_1h": round(((prices[-1] - prices[-2]) / prices[-2]) * 100, 3) if len(prices) >= 2 else 0,
    }
