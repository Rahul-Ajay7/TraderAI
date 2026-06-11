"""
tests/test_core.py
Unit tests for decision logic, exits, and the signal scorer.
Run:  python -m pytest tests/ -q    (or python tests/test_core.py)
"""
import os, sys, math, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DB_PATH"] = os.path.join(os.path.dirname(__file__), "test.db")

from db.database import init_db
init_db()

import trader.paper_trader as pt
from trader.paper_trader import decide, check_exit, execute_paper
from indicators.signals import compute_signal_score, compute_rsi, compute_atr_pct
import numpy as np


def _candles(closes, spread=0.5, vol=100.0, start_ts=1_700_000_000_000):
    """Builds synthetic 15m OHLCV candles from a close series."""
    out = []
    for i, c in enumerate(closes):
        o = closes[i-1] if i else c
        h = max(o, c) + spread
        l = min(o, c) - spread
        out.append((start_ts + i*900_000, o, h, l, c, vol))
    return out


# ── decide() ──────────────────────────────────────────────────────────────────

def test_decide_signal_only_buy():
    sig = {"direction": "STRONG_BUY", "confidence": 0.5}
    assert decide(sig, None) == ("BUY", 0.5)

def test_decide_signal_only_hold_low_conf():
    sig = {"direction": "BUY", "confidence": 0.2}
    assert decide(sig, None)[0] == "HOLD"

def test_decide_kronos_agreement():
    sig  = {"direction": "BUY", "confidence": 0.5}
    lstm = {"source": "kronos", "15m": "BUY", "30m": "BUY", "1h": "HOLD",
            "confidence": 0.6}
    action, conf = decide(sig, lstm)
    assert action == "BUY"
    assert conf == round(0.5*0.6 + 0.6*0.4, 2)

def test_decide_kronos_disagreement_holds():
    sig  = {"direction": "BUY", "confidence": 0.5}
    lstm = {"source": "kronos", "15m": "SELL", "30m": "SELL", "1h": "SELL",
            "confidence": 0.9}
    assert decide(sig, lstm)[0] == "HOLD"

def test_decide_fallback_ignores_kronos():
    sig  = {"direction": "STRONG_BUY", "confidence": 0.5}
    lstm = {"source": "fallback", "15m": "SELL", "30m": "SELL", "1h": "SELL",
            "confidence": 0.0}
    assert decide(sig, lstm)[0] == "BUY"


# ── check_exit() ──────────────────────────────────────────────────────────────

def _open_pos(symbol="TEST", market="crypto", entry=100.0):
    pt.reset()
    pt.crypto_portfolio[symbol] = {"qty": 1.0, "entry": entry, "high_water": entry}

def test_stop_loss_fires():
    _open_pos()
    action, reason = check_exit("TEST", "crypto", 100.0 * (1 - pt.STOP_LOSS_PCT) - 0.01)
    assert (action, reason) == ("SELL", "STOP_LOSS")

def test_take_profit_fires():
    _open_pos()
    action, reason = check_exit("TEST", "crypto", 100.0 * (1 + pt.TAKE_PROFIT_PCT) + 0.01)
    assert (action, reason) == ("SELL", "TAKE_PROFIT")

def test_trailing_stop_fires_after_arm():
    _open_pos()
    check_exit("TEST", "crypto", 102.0)            # arms trail, sets high_water
    drop = 102.0 * (1 - pt.TRAIL_PCT) - 0.01
    action, reason = check_exit("TEST", "crypto", drop)
    assert (action, reason) == ("SELL", "TRAIL_STOP")

def test_no_exit_in_band():
    _open_pos()
    assert check_exit("TEST", "crypto", 100.5) == (None, None)


# ── execute_paper() guards ────────────────────────────────────────────────────

def test_buy_never_overdraws_indian():
    pt.reset()
    pt.indian_balance = 500.0                      # 2% = ₹10 → forced 1 share
    execute_paper("EXPENSIVE.NS", "indian", "BUY", 7000.0, 0.5, 5, [], None)
    assert "EXPENSIVE.NS" not in pt.indian_portfolio   # cost > balance → skipped
    assert pt.indian_balance == 500.0
    pt.reset()

def test_buy_deducts_fee():
    pt.reset()
    execute_paper("BTCUSDT", "crypto", "BUY", 100.0, 0.5, 5, [], None)
    assert "BTCUSDT" in pt.crypto_portfolio
    spent = pt.CRYPTO_BALANCE - pt.crypto_balance
    trade_amt = pt.crypto_portfolio["BTCUSDT"]["qty"] * 100.0
    assert math.isclose(spent, trade_amt * (1 + pt.FEE_CRYPTO_PCT), rel_tol=1e-9)
    pt.reset()

def test_cooldown_blocks_rebuy():
    pt.reset()
    pt._cooldowns[("BTCUSDT", "crypto")] = time.time()
    execute_paper("BTCUSDT", "crypto", "BUY", 100.0, 0.5, 5, [], None)
    assert "BTCUSDT" not in pt.crypto_portfolio
    pt.reset()


# ── reload_positions() balance math ──────────────────────────────────────────

def test_reload_deducts_full_cost(monkeypatch=None):
    import db.database as dbm
    pt.reset()
    fake = [{"symbol": "BTCUSDT", "market": "crypto", "qty": 2.0, "entry": 100.0}]
    orig = dbm.get_open_positions
    dbm.get_open_positions = lambda: fake
    try:
        pt.reload_positions()
        assert math.isclose(pt.crypto_balance, pt.CRYPTO_BALANCE - 200.0)
    finally:
        dbm.get_open_positions = orig
        pt.reset()


# ── signal scorer ─────────────────────────────────────────────────────────────

def test_signal_insufficient_data():
    r = compute_signal_score(_candles([100.0] * 10))
    assert r["direction"] == "HOLD" and r["score"] == 0

def test_signal_uptrend_not_strong_sell():
    closes = list(np.linspace(100, 130, 80))
    r = compute_signal_score(_candles(closes))
    assert r["direction"] != "STRONG_SELL"
    assert r["atr_pct"] > 0

def test_rsi_bounds():
    up   = compute_rsi(np.linspace(100, 120, 30))
    down = compute_rsi(np.linspace(120, 100, 30))
    assert up > 70 and down < 30

def test_atr_pct_scale():
    closes = [100 + (i % 2) for i in range(40)]   # oscillating ±1
    atr = compute_atr_pct(np.array([c + 0.5 for c in closes]),
                          np.array([c - 0.5 for c in closes]),
                          np.array(closes, dtype=float))
    assert 0 < atr < 0.05


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"  PASS  {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"  FAIL  {fn.__name__}: {e}")
        except Exception as e:
            failed += 1
            print(f"  ERROR {fn.__name__}: {e}")
    print(f"\n{len(fns)-failed}/{len(fns)} passed")
    sys.exit(1 if failed else 0)
