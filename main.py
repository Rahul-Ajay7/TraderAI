"""
TraderAI — Main Scheduler
Crypto:  runs 24/7  (Binance 15m)
Indian:  runs 09:15–15:30 IST weekdays (yfinance 15m)
Nifty/Sensex: sentiment filter for Indian stocks

Usage:
  python main.py           # start bot + API
  python main.py status    # data collection progress
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("[STARTUP] main.py executing...", flush=True)

import time, threading
from datetime import datetime

from db.database          import (init_db, load_candles, candle_count,
                                   save_prediction, evaluate_predictions)
from data.fetcher_crypto  import sync_crypto, sync_crypto_live, CRYPTO_SYMBOLS
from data.fetcher_indian  import (sync_indian, sync_indian_live,
                                   INDIAN_STOCKS, INDICES, is_market_open,
                                   get_nifty_trend)
from indicators.signals   import compute_signal_score
from model.kronos_predictor import predict as kronos_predict, warmup
from trader.paper_trader  import (decide, execute_paper,
                                   portfolio_status, get_state, reset,
                                   reload_positions,
                                   CRYPTO_BALANCE, INDIAN_BALANCE)
from backend.state        import state
from backend.api          import app

import uvicorn

INTERVAL_SEC = 15 * 60
EXIT_GUARD_SEC = 150   # SL/TP/trail check on open positions between cycles
STALE_AFTER_MIN = 45   # skip symbol if last candle older than this

def _is_stale(candles):
    if not candles:
        return True
    age_min = (time.time() * 1000 - candles[-1][0]) / 60000
    return age_min > STALE_AFTER_MIN

def _log_prediction(sym, market, candles, sig, lstm):
    """Stores Kronos forecast so later cycles can score it vs reality."""
    if lstm.get("source") != "kronos":
        return
    try:
        save_prediction(sym, market, candles[-1][0], sig["price"],
                        lstm.get("predicted_close_15m"),
                        lstm.get("predicted_close_1h"),
                        lstm.get("15m", "HOLD"), lstm.get("1h", "HOLD"))
    except Exception as e:
        print(f"  [PRED-LOG] {sym} failed: {e}", flush=True)

# ─── Banner ───────────────────────────────────────────────────────────────────

def banner():
    print("""
╔══════════════════════════════════════════════╗
║            T R A D E R  A I  v3             ║
║  Crypto: BTC/ETH/BNB/SOL/XRP  (24/7)       ║
║  Indian: 10 NSE + Nifty + Sensex (IST)     ║
║  Kronos-mini · No training · Paper Trade    ║
╚══════════════════════════════════════════════╝
""", flush=True)

# ─── Crypto cycle ─────────────────────────────────────────────────────────────

def run_crypto_cycle():
    sync_crypto_live()
    prices  = {}
    signals = {}

    for sym in CRYPTO_SYMBOLS:
        candles = load_candles(sym, "crypto", limit=200)
        if len(candles) < 60:
            print(f"  [CRYPTO] {sym} collecting... {len(candles)}/60", flush=True)
            continue
        if _is_stale(candles):
            print(f"  [CRYPTO] {sym} data stale — skipping", flush=True)
            continue
        sig  = compute_signal_score(candles, nifty_trend="SIDE", market="crypto")
        lstm = kronos_predict(candles)
        action, conf = decide(sig, lstm)

        closes = [c[4] for c in candles]
        chg    = (closes[-1]-closes[-2])/closes[-2]*100 if len(closes)>=2 else 0
        prices[sym]  = {"price": sig["price"], "change_pct": round(chg,2), "market": "crypto"}
        sig["pred_15m"]       = lstm.get("15m", "HOLD")
        sig["pred_30m"]       = lstm.get("30m", "HOLD")
        sig["pred_1h"]        = lstm.get("1h",  "HOLD")
        sig["pred_conf"]      = lstm.get("confidence", 0.0)
        sig["pred_close_15m"] = lstm.get("predicted_close_15m")
        sig["pred_close_1h"]  = lstm.get("predicted_close_1h")
        sig["pred_source"]    = lstm.get("source", "fallback")
        signals[sym] = sig

        lstm_tag = ""
        if lstm["source"] == "kronos":
            lstm_tag = f" | Kronos 15m:{lstm['15m']} 30m:{lstm['30m']} 1h:{lstm['1h']}"
        print(f"  [CRYPTO] {sym} price={sig['price']:.2f} score={sig['score']:+d} "
              f"sig={sig['direction']}{lstm_tag}", flush=True)
        _log_prediction(sym, "crypto", candles, sig, lstm)
        execute_paper(sym, "crypto", action, sig["price"], conf,
                      sig["score"], sig["reasons"], lstm,
                      atr_pct=sig.get("atr_pct"))
    return prices, signals

# ─── Indian cycle ─────────────────────────────────────────────────────────────

def run_indian_cycle():
    if not is_market_open():
        print("  [INDIAN] Market closed — skipping", flush=True)
        return {}, {}

    sync_indian_live()

    nifty_candles = load_candles("^NSEI", "index", limit=10)
    nifty_trend   = get_nifty_trend(nifty_candles)
    print(f"  [NIFTY] trend={nifty_trend}", flush=True)

    prices  = {}
    signals = {}

    for sym in INDIAN_STOCKS:
        candles = load_candles(sym, "indian", limit=200)
        if len(candles) < 60:
            print(f"  [INDIAN] {sym} collecting... {len(candles)}/60", flush=True)
            continue
        if _is_stale(candles):
            print(f"  [INDIAN] {sym} data stale — skipping", flush=True)
            continue
        sig  = compute_signal_score(candles, nifty_trend=nifty_trend, market="indian")
        lstm = kronos_predict(candles)
        action, conf = decide(sig, lstm)

        closes = [c[4] for c in candles]
        chg    = (closes[-1]-closes[-2])/closes[-2]*100 if len(closes)>=2 else 0
        prices[sym]  = {"price": sig["price"], "change_pct": round(chg,2), "market": "indian"}
        sig["pred_15m"]       = lstm.get("15m", "HOLD")
        sig["pred_30m"]       = lstm.get("30m", "HOLD")
        sig["pred_1h"]        = lstm.get("1h",  "HOLD")
        sig["pred_conf"]      = lstm.get("confidence", 0.0)
        sig["pred_close_15m"] = lstm.get("predicted_close_15m")
        sig["pred_close_1h"]  = lstm.get("predicted_close_1h")
        sig["pred_source"]    = lstm.get("source", "fallback")
        signals[sym] = sig

        lstm_tag = ""
        if lstm["source"] == "kronos":
            lstm_tag = f" | Kronos 15m:{lstm['15m']} 30m:{lstm['30m']} 1h:{lstm['1h']}"
        print(f"  [INDIAN] {sym} price=₹{sig['price']:.2f} score={sig['score']:+d} "
              f"sig={sig['direction']}{lstm_tag}", flush=True)
        _log_prediction(sym, "indian", candles, sig, lstm)
        execute_paper(sym, "indian", action, sig["price"], conf,
                      sig["score"], sig["reasons"], lstm,
                      atr_pct=sig.get("atr_pct"))
    return prices, signals

# ─── Exit guard ───────────────────────────────────────────────────────────────
# Entries happen once per closed 15m candle (what the backtest validated).
# Exits can't wait 15 min: price can blow far past a -1.5% stop between
# cycles. This loop only re-checks SL/TP/trail on symbols we actually hold —
# one cheap price fetch per held symbol, no signals, no Kronos.

def exit_guard():
    import trader.paper_trader as pt
    from data.fetcher_crypto import get_crypto_price
    from data.fetcher_indian import get_indian_price

    while True:
        time.sleep(EXIT_GUARD_SEC)
        try:
            sold = False
            for sym in list(pt.crypto_portfolio.keys()):
                price = get_crypto_price(sym)
                if not price:
                    continue
                action, reason = pt.check_exit(sym, "crypto", price)
                if action == "SELL":
                    print(f"  [GUARD] {sym} exit @ {price:.2f} ({reason})", flush=True)
                    # HOLD action: execute_paper re-runs check_exit and sells
                    pt.execute_paper(sym, "crypto", "HOLD", price, 0.0, 0, [], None)
                    sold = True
            if is_market_open():
                for sym in list(pt.indian_portfolio.keys()):
                    price = get_indian_price(sym)
                    if not price:
                        continue
                    action, reason = pt.check_exit(sym, "indian", price)
                    if action == "SELL":
                        print(f"  [GUARD] {sym} exit @ {price:.2f} ({reason})", flush=True)
                        pt.execute_paper(sym, "indian", "HOLD", price, 0.0, 0, [], None)
                        sold = True
            if sold:
                state["portfolio"]   = get_state()
                state["last_update"] = datetime.now().isoformat()
        except Exception as e:
            print(f"  [GUARD] error: {e}", flush=True)

# ─── Main cycle ───────────────────────────────────────────────────────────────

def run_cycle():
    t0  = time.time()
    now = datetime.now().strftime("%H:%M:%S")
    print(f"\n[{now}] ── CYCLE START ──", flush=True)

    try:
        n = evaluate_predictions()
        if n:
            print(f"  [PRED-EVAL] {n} predictions scored vs actuals", flush=True)
    except Exception as e:
        print(f"  [PRED-EVAL] failed: {e}", flush=True)

    c_prices, c_signals = run_crypto_cycle()
    i_prices, i_signals = run_indian_cycle()

    all_prices  = {**c_prices, **i_prices}
    all_signals = {**c_signals, **i_signals}

    state["prices"]      = all_prices
    state["signals"]     = all_signals
    state["portfolio"]   = get_state()
    state["market_open"] = is_market_open()
    state["last_update"] = datetime.now().isoformat()

    portfolio_status()
    print(f"  [CYCLE] took {time.time()-t0:.1f}s", flush=True)

# ─── Status ───────────────────────────────────────────────────────────────────

def show_status():
    print("\n── Crypto Data ──")
    for sym in CRYPTO_SYMBOLS:
        n = candle_count(sym, "crypto")
        bar = "█" * min(n//25, 20) + "░" * max(0, 20-n//25)
        print(f"  {sym:12s} [{bar}] {n:4d}/500")

    print("\n── Indian Data ──")
    for sym in INDIAN_STOCKS + INDICES:
        m = "index" if sym in INDICES else "indian"
        n = candle_count(sym, m)
        bar = "█" * min(n//15, 20) + "░" * max(0, 20-n//15)
        print(f"  {sym:15s} [{bar}] {n:4d}/300")

# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "status":
            show_status(); return

    banner()

    print("[INIT] DB ready", flush=True)
    init_db()

    print("[INIT] Syncing crypto (500 candles)...", flush=True)
    sync_crypto(verbose=True)

    print("[INIT] Syncing Indian stocks (60d × 15m)...", flush=True)
    sync_indian(verbose=True)

    reload_positions()
    print("[INIT] Positions reloaded from DB", flush=True)

    print("[INIT] Loading Kronos-mini model...", flush=True)
    warmup()

    def _api():
        port = int(os.environ.get("PORT", 8000))
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
    threading.Thread(target=_api, daemon=True).start()
    print(f"[INIT] API started\n", flush=True)

    threading.Thread(target=exit_guard, daemon=True).start()
    print(f"[INIT] Exit guard running every {EXIT_GUARD_SEC}s", flush=True)

    while True:
        try:
            run_cycle()
        except KeyboardInterrupt:
            print("\n[STOP] Bot stopped.")
            break
        except Exception as e:
            import traceback
            print(f"[ERROR] {e}", flush=True)
            traceback.print_exc()
        print("[SLEEP] Next cycle in 15 min...", flush=True)
        time.sleep(INTERVAL_SEC)

if __name__ == "__main__":
    main()