"""
backtest/backtest.py
Walk-forward backtest of the signal strategy over candles already in the DB.

Signal-only (no Kronos — CPU inference too slow to replay thousands of candles;
this measures the indicator strategy that gates every trade anyway).

Entry/exit at next candle OPEN (no look-ahead). Stop-loss/take-profit/trailing
checked against each candle's high/low. Fees + whole-share rules match live.

Usage:
  python backtest/backtest.py                     # all symbols, both markets
  python backtest/backtest.py --market crypto
  python backtest/backtest.py --symbol BTCUSDT
"""
import os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from db.database import load_candles
from indicators.signals import compute_signal_score
from trader.paper_trader import (decide, STOP_LOSS_PCT, TAKE_PROFIT_PCT,
                                  TRAIL_ARM_PCT, TRAIL_PCT,
                                  FEE_CRYPTO_PCT, FEE_INDIAN_PCT)

WINDOW = 200   # candles fed to the scorer, same as live


def backtest_symbol(symbol, market, start_balance=None, verbose=False):
    if start_balance is None:
        start_balance = 1000.0 if market == "crypto" else 100000.0
    candles = load_candles(symbol, market, limit=5000)
    if len(candles) < WINDOW + 20:
        return None

    fee_pct  = FEE_CRYPTO_PCT if market == "crypto" else FEE_INDIAN_PCT
    whole    = market != "crypto"
    cash     = start_balance
    pos      = None            # {"qty","entry","high_water"}
    equity   = []
    trades   = []

    for i in range(WINDOW, len(candles) - 1):
        window = candles[i - WINDOW:i + 1]        # data through candle i close
        nxt    = candles[i + 1]                   # we act on the NEXT candle
        n_open, n_high, n_low, n_close = nxt[1], nxt[2], nxt[3], nxt[4]

        # ── manage open position against next candle's range ──
        if pos:
            if n_high > pos["high_water"]:
                pos["high_water"] = n_high
            exit_price = None
            reason     = None
            sl = pos["entry"] * (1 - STOP_LOSS_PCT)
            tp = pos["entry"] * (1 + TAKE_PROFIT_PCT)
            if n_low <= sl:
                exit_price, reason = sl, "SL"
            elif n_high >= tp:
                exit_price, reason = tp, "TP"
            elif (pos["high_water"] >= pos["entry"] * (1 + TRAIL_ARM_PCT)
                  and n_low <= pos["high_water"] * (1 - TRAIL_PCT)):
                exit_price, reason = pos["high_water"] * (1 - TRAIL_PCT), "TRAIL"
            if exit_price:
                proceeds = pos["qty"] * exit_price
                fee      = proceeds * fee_pct
                pnl      = proceeds - pos["qty"] * pos["entry"] - fee
                cash    += proceeds - fee
                trades.append({"pnl": pnl, "reason": reason})
                if verbose:
                    print(f"  {reason:5s} exit @ {exit_price:.2f} pnl={pnl:+.2f}")
                pos = None

        # ── new signal on candle i close, executed at next open ──
        sig = compute_signal_score(window, nifty_trend="SIDE", market=market)
        action, conf = decide(sig, None)

        if action == "BUY" and pos is None:
            trade_amt = cash * 0.95               # near-full to make stats readable
            qty       = trade_amt / n_open
            if whole:
                qty = max(1, int(qty))
            cost = qty * n_open
            fee  = cost * fee_pct
            if cost + fee <= cash:
                cash -= cost + fee
                pos   = {"qty": qty, "entry": n_open, "high_water": n_open}
        elif action == "SELL" and pos is not None:
            proceeds = pos["qty"] * n_open
            fee      = proceeds * fee_pct
            pnl      = proceeds - pos["qty"] * pos["entry"] - fee
            cash    += proceeds - fee
            trades.append({"pnl": pnl, "reason": "SIGNAL"})
            pos = None

        mark = cash + (pos["qty"] * n_close if pos else 0)
        equity.append(mark)

    # close any open position at the last close
    if pos:
        last_close = candles[-1][4]
        proceeds   = pos["qty"] * last_close
        fee        = proceeds * fee_pct
        cash      += proceeds - fee
        trades.append({"pnl": proceeds - pos["qty"]*pos["entry"] - fee,
                       "reason": "EOD"})

    if not equity:
        return None

    eq        = np.array(equity)
    final     = eq[-1]
    rets      = np.diff(eq) / eq[:-1]
    sharpe    = (np.mean(rets) / (np.std(rets) + 1e-12)) * np.sqrt(96 * 252) \
                if len(rets) > 1 else 0.0   # 96 15m-candles/day annualized
    peak      = np.maximum.accumulate(eq)
    drawdown  = float(np.max((peak - eq) / peak)) if len(eq) else 0.0
    wins      = sum(1 for t in trades if t["pnl"] > 0)

    # buy-and-hold baseline over the same span
    bh_entry  = candles[WINDOW + 1][1]
    bh_exit   = candles[-1][4]
    bh_ret    = (bh_exit - bh_entry) / bh_entry * 100

    return {
        "symbol":       symbol,
        "market":       market,
        "candles":      len(candles),
        "trades":       len(trades),
        "wins":         wins,
        "win_rate":     round(wins / len(trades), 3) if trades else 0,
        "return_pct":   round((final - start_balance) / start_balance * 100, 2),
        "buyhold_pct":  round(bh_ret, 2),
        "max_dd_pct":   round(drawdown * 100, 2),
        "sharpe":       round(float(sharpe), 2),
        "exit_reasons": {r: sum(1 for t in trades if t["reason"] == r)
                         for r in ("SL", "TP", "TRAIL", "SIGNAL", "EOD")},
    }


def main():
    from data.fetcher_crypto import CRYPTO_SYMBOLS
    from data.fetcher_indian import INDIAN_STOCKS

    ap = argparse.ArgumentParser()
    ap.add_argument("--market", choices=["crypto", "indian"])
    ap.add_argument("--symbol")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    targets = []
    if args.symbol:
        market = args.market or ("crypto" if args.symbol.endswith("USDT") else "indian")
        targets = [(args.symbol, market)]
    else:
        if args.market in (None, "crypto"):
            targets += [(s, "crypto") for s in CRYPTO_SYMBOLS]
        if args.market in (None, "indian"):
            targets += [(s, "indian") for s in INDIAN_STOCKS]

    print(f"\n{'symbol':14s} {'trades':>6s} {'win%':>6s} {'strat%':>8s} "
          f"{'b&h%':>8s} {'maxDD%':>7s} {'sharpe':>7s}")
    print("-" * 62)
    results = []
    for sym, market in targets:
        r = backtest_symbol(sym, market, verbose=args.verbose)
        if r is None:
            print(f"{sym:14s}  not enough candles")
            continue
        results.append(r)
        print(f"{r['symbol']:14s} {r['trades']:6d} {r['win_rate']*100:5.1f}% "
              f"{r['return_pct']:+7.2f}% {r['buyhold_pct']:+7.2f}% "
              f"{r['max_dd_pct']:6.2f}% {r['sharpe']:7.2f}")

    if results:
        avg_s = np.mean([r["return_pct"] for r in results])
        avg_b = np.mean([r["buyhold_pct"] for r in results])
        beat  = sum(1 for r in results if r["return_pct"] > r["buyhold_pct"])
        print("-" * 62)
        print(f"avg strategy {avg_s:+.2f}%  vs  buy&hold {avg_b:+.2f}%   "
              f"(beats b&h on {beat}/{len(results)} symbols)")
        print("\nVerdict guide: strategy must beat buy&hold AFTER fees with "
              "lower drawdown,\notherwise just holding wins.\n")


if __name__ == "__main__":
    main()
