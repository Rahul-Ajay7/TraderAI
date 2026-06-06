"""
model/kronos_predictor.py
Kronos-mini foundation model for price prediction.
No training needed — pre-trained on 45 global exchanges.
Predicts: BUY/SELL/HOLD for next 15min, 30min, 1hr
"""

import os, sys, importlib
import numpy as np

_predictor_cache = None
_load_error      = None

KRONOS_MODEL     = "NeoQuasar/Kronos-mini"
KRONOS_TOKENIZER = "NeoQuasar/Kronos-Tokenizer-2k"


def _load_kronos():
    global _predictor_cache, _load_error
    if _predictor_cache is not None:
        return _predictor_cache
    if _load_error:
        return None
    try:
        print("[KRONOS] Loading Kronos-mini from HuggingFace...")
        import torch
        import subprocess

        kronos_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "kronos_src"))

        # Clone if not present
        if not os.path.isdir(kronos_dir):
            os.makedirs(kronos_dir, exist_ok=True)
            subprocess.run([
                "git", "clone", "--depth", "1",
                "https://github.com/shiyu-coder/Kronos.git",
                kronos_dir
            ], check=True, capture_output=True)
            print("[KRONOS] Source downloaded ✓")

        # --- KEY FIX: swap sys.path so kronos_src comes first ---
        # Remove all paths that could expose our local model/ package
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        saved_path   = sys.path[:]
        sys.path     = [kronos_dir] + [
            p for p in sys.path
            if os.path.abspath(p) not in (project_root, os.path.dirname(__file__))
        ]

        # Force fresh import — 'model' may already be cached pointing to wrong path
        for mod in list(sys.modules.keys()):
            if mod == "model" or mod.startswith("model."):
                del sys.modules[mod]

        from model import Kronos, KronosTokenizer, KronosPredictor

        # Restore path
        sys.path = saved_path
        # ---------------------------------------------------------

        tokenizer = KronosTokenizer.from_pretrained(KRONOS_TOKENIZER)
        model     = Kronos.from_pretrained(KRONOS_MODEL)
        predictor = KronosPredictor(model, tokenizer, device="cpu", max_context=512)

        _predictor_cache = predictor
        print("[KRONOS] Model ready ✓")
        return predictor

    except Exception as e:
        _load_error = str(e)
        print(f"[KRONOS] Load failed: {e}")
        print("[KRONOS] Falling back to signal-only mode")
        return None


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


def _direction(current_price, predicted_close, threshold=0.003):
    change = (predicted_close - current_price) / current_price
    if change > threshold:
        return "BUY"
    elif change < -threshold:
        return "SELL"
    return "HOLD"


def predict(candles, horizon_candles={"15m": 1, "30m": 2, "1h": 4}):
    if len(candles) < 60:
        return _fallback()

    predictor = _load_kronos()
    if predictor is None:
        return _fallback()

    try:
        import pandas as pd

        df        = _candles_to_df(candles)
        lookback  = min(len(df), 500)
        pred_len  = 4

        x_df        = df.tail(lookback)[["open","high","low","close","volume","amount"]].reset_index(drop=True)
        x_timestamp = df.tail(lookback)["timestamps"].reset_index(drop=True)

        last_ts     = x_timestamp.iloc[-1]
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
            sample_count= 3,
        )

        current_price = float(df["close"].iloc[-1])
        p15 = float(pred_df["close"].iloc[0])
        p30 = float(pred_df["close"].iloc[1])
        p1h = float(pred_df["close"].iloc[3])

        move_pct   = abs(p1h - current_price) / current_price
        confidence = round(min(move_pct / 0.02, 1.0), 2)

        return {
            "15m":               _direction(current_price, p15),
            "30m":               _direction(current_price, p30),
            "1h":                _direction(current_price, p1h),
            "confidence":        confidence,
            "predicted_close_15m": round(p15, 4),
            "predicted_close_1h":  round(p1h, 4),
            "source":            "kronos"
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


def is_ready():
    return _predictor_cache is not None


def warmup():
    _load_kronos()