"""
backtest/sweep.py
Parameter sweep over exit rules and entry gates, walk-forward on DB candles.

Signals are precomputed once per symbol (the expensive part), then each
config replays the trade simulation instantly. Same execution semantics as
backtest/backtest.py: act at next candle open, intra-candle SL/TP/trail
against high/low, fees, whole shares for Indian names.

Usage:
  python backtest/sweep.py [--market crypto|indian]
"""
import os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from db.database import load_candles
from indicators.signals import compute_signal_score, compute_ema
from trader.paper_trader import decide

WINDOW = 200

CONFIGS = {
    #                 sl     tp     arm    trail  trend  atr_exits
    "base":          dict(sl=0.015, tp=0.030, arm=0.010, trail=0.012, trend=False, atr=False),
    "trend_gate":    dict(sl=0.015, tp=0.030, arm=0.010, trail=0.012, trend=True,  atr=False),
    "sl_tight":      dict(sl=0.010, tp=0.030, arm=0.010, trail=0.012, trend=False, atr=False),
    "tp_wide":       dict(sl=0.015, tp=0.045, arm=0.010, trail=0.020, trend=False, atr=False),
    "trend+tpwide":  dict(sl=0.015, tp=0.045, arm=0.010, trail=0.020, trend=True,  atr=False),
    "trend+sltight": dict(sl=0.010, tp=0.030, arm=0.010, trail=0.012, trend=True,  atr=False),
    "atr_exits":     dict(sl=None,  tp=None,  arm=0.010, trail=0.012, trend=False, atr=True),
    "trend+atr":     dict(sl=None,  tp=None,  arm=0.010, trail=0.012, trend=True,  atr=True),
}
ATR_SL_MULT = 2.0
ATR_TP_MULT = 4.0


def precompute(symbol, market):
    candles = load_candles(symbol, market, limit=5000)
    if len(candles) < WINDOW + 20:
        return None
    sigs = []
    closes = np.array([c[4] for c in candles], dtype=float)
    for i in range(WINDOW, len(candles) - 1):
        window = candles[i - WINDOW:i + 1]
        sig = compute_signal_score(window, nifty_trend="SIDE", market=market)
        action, _ = decide(sig, None)
        w = closes[i - WINDOW:i + 1]
        sigs.append({
            "action":   action,
            "atr_pct":  sig.get("atr_pct", 0.01) or 0.01,
            "trend_up": compute_ema(w, 20) > compute_ema(w, 50),
        })
    return candles, sigs


def simulate(candles, sigs, market, cfg):
    start_balance = 1000.0 if market == "crypto" else 100000.0
    fee_pct = 0.001 if market == "crypto" else 0.0012
    whole   = market != "crypto"
    cash    = start_balance
    pos     = None
    equity  = []
    trades  = []

    for k, s in enumerate(sigs):
        i   = WINDOW + k
        nxt = candles[i + 1]
        n_open, n_high, n_low, n_close = nxt[1], nxt[2], nxt[3], nxt[4]

        if pos:
            if n_high > pos["hw"]:
                pos["hw"] = n_high
            exit_price = None
            if n_low <= pos["sl"]:
                exit_price = pos["sl"]
            elif n_high >= pos["tp"]:
                exit_price = pos["tp"]
            elif (pos["hw"] >= pos["entry"] * (1 + cfg["arm"])
                  and n_low <= pos["hw"] * (1 - cfg["trail"])):
                exit_price = pos["hw"] * (1 - cfg["trail"])
            if exit_price:
                proceeds = pos["qty"] * exit_price
                fee = proceeds * fee_pct
                trades.append(proceeds - pos["qty"] * pos["entry"] - fee)
                cash += proceeds - fee
                pos = None

        if s["action"] == "BUY" and pos is None:
            if not cfg["trend"] or s["trend_up"]:
                qty = (cash * 0.95) / n_open
                if whole:
                    qty = max(1, int(qty))
                cost = qty * n_open
                fee  = cost * fee_pct
                if cost + fee <= cash:
                    sl_pct = ATR_SL_MULT * s["atr_pct"] if cfg["atr"] else cfg["sl"]
                    tp_pct = ATR_TP_MULT * s["atr_pct"] if cfg["atr"] else cfg["tp"]
                    cash -= cost + fee
                    pos = {"qty": qty, "entry": n_open, "hw": n_open,
                           "sl": n_open * (1 - sl_pct), "tp": n_open * (1 + tp_pct)}
        elif s["action"] == "SELL" and pos is not None:
            proceeds = pos["qty"] * n_open
            fee = proceeds * fee_pct
            trades.append(proceeds - pos["qty"] * pos["entry"] - fee)
            cash += proceeds - fee
            pos = None

        equity.append(cash + (pos["qty"] * n_close if pos else 0))

    if pos:
        proceeds = pos["qty"] * candles[-1][4]
        fee = proceeds * fee_pct
        trades.append(proceeds - pos["qty"] * pos["entry"] - fee)
        cash += proceeds - fee

    eq = np.array(equity)
    peak = np.maximum.accumulate(eq)
    return {
        "return_pct": (eq[-1] - start_balance) / start_balance * 100,
        "max_dd":     float(np.max((peak - eq) / peak)) * 100 if len(eq) else 0,
        "trades":     len(trades),
        "wins":       sum(1 for t in trades if t > 0),
    }


def main():
    from data.fetcher_crypto import CRYPTO_SYMBOLS
    from data.fetcher_indian import INDIAN_STOCKS

    ap = argparse.ArgumentParser()
    ap.add_argument("--market", choices=["crypto", "indian"])
    args = ap.parse_args()

    targets = []
    if args.market in (None, "crypto"):
        targets += [(s, "crypto") for s in CRYPTO_SYMBOLS]
    if args.market in (None, "indian"):
        targets += [(s, "indian") for s in INDIAN_STOCKS]

    print("Precomputing signals...")
    data, bh = {}, {}
    for sym, market in targets:
        out = precompute(sym, market)
        if out is None:
            continue
        data[(sym, market)] = out
        candles = out[0]
        bh[(sym, market)] = ((candles[-1][4] - candles[WINDOW + 1][1])
                             / candles[WINDOW + 1][1] * 100)
        print(f"  {sym} ready ({len(out[1])} bars)")

    print(f"\n{'config':14s} {'avg_ret%':>9s} {'beats_bh':>9s} {'avg_trd':>8s} "
          f"{'win%':>6s} {'avg_DD%':>8s}")
    print("-" * 60)
    results = {}
    for name, cfg in CONFIGS.items():
        rets, dds, trd, wins, tot, beats = [], [], 0, 0, 0, 0
        for key, (candles, sigs) in data.items():
            r = simulate(candles, sigs, key[1], cfg)
            rets.append(r["return_pct"])
            dds.append(r["max_dd"])
            trd  += r["trades"]
            wins += r["wins"]
            tot  += r["trades"]
            if r["return_pct"] > bh[key]:
                beats += 1
        results[name] = np.mean(rets)
        print(f"{name:14s} {np.mean(rets):+8.2f}% {beats:>5d}/{len(data):<3d} "
              f"{trd/len(data):7.1f} {100*wins/max(tot,1):5.1f}% {np.mean(dds):7.2f}%")

    avg_bh = np.mean(list(bh.values()))
    print("-" * 60)
    print(f"{'buy&hold':14s} {avg_bh:+8.2f}%")
    best = max(results, key=results.get)
    print(f"\nBest by avg return: {best} ({results[best]:+.2f}%)")


if __name__ == "__main__":
    main()
