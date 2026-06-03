"""
model/kronos_predictor.py

Kronos-mini foundation model for price prediction.
Replaces lstm_crypto.py + lstm_indian.py.
No training needed — pre-trained on 45 global exchanges.

Predicts: UP/DOWN/SIDE for next 15min, 30min, 1hr
Works for: crypto + indian stocks + indices
"""

import os, sys
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# ── Cache ──────────────────────────────────────────────────────────────────────
_predictor_cache = None
_load_error      = None

KRONOS_MODEL     = "NeoQuasar/Kronos-mini"
KRONOS_TOKENIZER = "NeoQuasar/Kronos-Tokenizer-2k"

# ── Load model (once) ─────────────────────────────────────────────────────────

def _load_kronos():
    global _predictor_cache, _load_error
    if _predictor_cache is not None:
        return _predictor_cache
    if _load_error:
        return None
    try:
        print("[KRONOS] Loading Kronos-mini from HuggingFace...")
        from huggingface_hub import hf_hub_download
        import torch

        # Download Kronos source files from repo
        import subprocess
        kronos_dir = os.path.join(os.path.dirname(__file__), "kronos_src")
        if not os.path.exists(kronos_dir):
            os.makedirs(kronos_dir, exist_ok=True)
            # Clone only the model files needed
            subprocess.run([
                "git", "clone", "--depth", "1",
                "https://github.com/shiyu-coder/Kronos.git",
                kronos_dir
            ], check=True, capture_output=True)
            print("[KRONOS] Source downloaded ✓")

        sys.path.insert(0, kronos_dir)
        from model import Kronos, KronosTokenizer, KronosPredictor

        tokenizer = KronosTokenizer.from_pretrained(KRONOS_TOKENIZER)
        model     = Kronos.from_pretrained(KRONOS_MODEL)
        predictor = KronosPredictor(model, tokenizer,
                                    device="cpu", max_context=512)
        _predictor_cache = predictor
        print("[KRONOS] Model ready ✓")
        return predictor

    except Exception as e:
        _load_error = str(e)
        print(f"[KRONOS] Load failed: {e}")
        print("[KRONOS] Falling back to signal-only mode")
        return None

# ── Convert candles to DataFrame ──────────────────────────────────────────────

def _candles_to_df(candles):
    import pandas as pd
    rows = []
    for c in candles:
        rows.append({
            "timestamps": pd.Timestamp(c[0], unit="ms"),
            "open":   float(c[1]),
            "high":   float(c[2]),
            "low":    float(c[3]),
            "close":  float(c[4]),
            "volume": float(c[5]),
        })
    df = pd.DataFrame(rows)
    df["amount"] = df["close"] * df["volume"]
    return df

# ── Direction from predicted candles ──────────────────────────────────────────

def _direction(current_price, predicted_close, threshold=0.003):
    change = (predicted_close - current_price) / current_price
    if change > threshold:
        return "BUY"
    elif change < -threshold:
        return "SELL"
    return "HOLD"

# ── Main predict function ──────────────────────────────────────────────────────

def predict(candles, horizon_candles={"15m": 1, "30m": 2, "1h": 4}):
    """
    Input:  list of 15m candles (open_time, open, high, low, close, volume)
    Output: {
        "15m": BUY/SELL/HOLD,
        "30m": BUY/SELL/HOLD,
        "1h":  BUY/SELL/HOLD,
        "confidence": float,
        "predicted_close_15m": float,
        "source": "kronos" or "fallback"
    }
    """
    if len(candles) < 60:
        return _fallback()

    predictor = _load_kronos()
    if predictor is None:
        return _fallback()

    try:
        import pandas as pd

        df = _candles_to_df(candles)
        lookback  = min(len(df), 500)   # Kronos-mini context = 2048, use 500
        pred_len  = 4                   # predict 4 candles = 1hr ahead

        x_df        = df.tail(lookback)[["open","high","low","close","volume","amount"]].reset_index(drop=True)
        x_timestamp = df.tail(lookback)["timestamps"].reset_index(drop=True)

        # Generate future timestamps (15min intervals)
        last_ts = x_timestamp.iloc[-1]
        y_timestamp = pd.Series([
            last_ts + pd.Timedelta(minutes=15*(i+1))
            for i in range(pred_len)
        ])

        pred_df = predictor.predict(
            df          = x_df,
            x_timestamp = x_timestamp,
            y_timestamp = y_timestamp,
            pred_len    = pred_len,
            T           = 0.8,
            top_p       = 0.9,
            sample_count= 3,    # average 3 samples for stability
        )

        current_price = float(df["close"].iloc[-1])
        p15 = float(pred_df["close"].iloc[0])   # +15min
        p30 = float(pred_df["close"].iloc[1])   # +30min
        p1h = float(pred_df["close"].iloc[3])   # +1hr

        # confidence = how strong the predicted move is
        move_pct = abs(p1h - current_price) / current_price
        confidence = round(min(move_pct / 0.02, 1.0), 2)  # 2% move = full conf

        return {
            "15m":                _direction(current_price, p15),
            "30m":                _direction(current_price, p30),
            "1h":                 _direction(current_price, p1h),
            "confidence":         confidence,
            "predicted_close_15m": round(p15, 4),
            "predicted_close_1h":  round(p1h, 4),
            "source":             "kronos"
        }

    except Exception as e:
        print(f"[KRONOS] Prediction error: {e}")
        return _fallback()

def _fallback():
    return {
        "15m": "HOLD", "30m": "HOLD", "1h": "HOLD",
        "confidence": 0.0,
        "predicted_close_15m": None,
        "predicted_close_1h":  None,
        "source": "fallback"
    }

# ── Status check ──────────────────────────────────────────────────────────────

def is_ready():
    return _predictor_cache is not None

def warmup():
    """Call once at startup to pre-load model"""
    _load_kronos()