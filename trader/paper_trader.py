"""
trader/paper_trader.py
IMPROVED v2:
  - 2-of-3 Kronos vote, stop-loss, take-profit, trailing stop
  - trading fees modeled (Binance 0.1%, Indian ~0.12%)
  - volatility-scaled position sizing (ATR)
  - daily loss limit, post-stop-loss cooldown
  - position reload from DB (correct balance math)
"""
import os, sys, time, threading
from datetime import date
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db.database import save_trade, close_all_positions

# ── Starting balances ─────────────────────────────────────────────────────────
CRYPTO_BALANCE  = 1000.0
INDIAN_BALANCE  = 100000.0

RISK_PER_TRADE  = 0.02
MAX_OPEN_CRYPTO = 3
MAX_OPEN_INDIAN = 5
# Exit config from backtest/sweep.py (2026-07, "trail_loose" winner). Live
# analysis of 81 trades showed STOP_LOSS was the #1 bleeder — stops too tight
# shook trades out before the move. Wider stop + wider TP + looser trail:
# crypto -1.74% -> +0.53% (win 33->47%), indian -1.84% -> -0.31% (beats b&h
# 7/10), both after fees. Do not tighten without re-beating this in sweep.py.
STOP_LOSS_PCT   = 0.020
TAKE_PROFIT_PCT = 0.050

# Trailing stop: arms once price is up TRAIL_ARM_PCT, exits on TRAIL_PCT pullback
TRAIL_ARM_PCT   = 0.015
TRAIL_PCT       = 0.030

# Round-trip realistic costs (taker fee / brokerage+STT+slippage)
FEE_CRYPTO_PCT  = 0.001
FEE_INDIAN_PCT  = 0.0012

# Daily circuit breaker: stop opening new positions after this realized loss
DAILY_LOSS_LIMIT_PCT = 0.05

# No re-buy of a symbol for this long after a stop-loss exit
COOLDOWN_SEC    = 60 * 60

# Volatility sizing: target ATR% — size shrinks for wilder symbols
TARGET_ATR_PCT  = 0.006
VOL_SIZE_MIN    = 0.5
VOL_SIZE_MAX    = 1.5

# ── Portfolio state ───────────────────────────────────────────────────────────
crypto_balance   = CRYPTO_BALANCE
indian_balance   = INDIAN_BALANCE
crypto_portfolio = {}
indian_portfolio = {}

_cooldowns       = {}                  # (symbol, market) → unix ts of SL exit
_last_price      = {}                  # (symbol, market) → latest seen price (mark-to-market)
_daily_pnl       = {"crypto": 0.0, "indian": 0.0}
_daily_pnl_date  = date.today()

def _roll_daily():
    global _daily_pnl, _daily_pnl_date
    if date.today() != _daily_pnl_date:
        _daily_pnl      = {"crypto": 0.0, "indian": 0.0}
        _daily_pnl_date = date.today()

def _fee(market, notional):
    pct = FEE_CRYPTO_PCT if market == "crypto" else FEE_INDIAN_PCT
    return notional * pct

# ── Reload open positions from DB on startup ──────────────────────────────────

def reload_positions():
    """Restores open positions from DB so stop-loss survives restarts."""
    from db.database import get_open_positions
    global crypto_balance, indian_balance
    loaded = 0
    for pos in get_open_positions():
        entry = {"qty": pos["qty"], "entry": pos["entry"], "high_water": pos["entry"]}
        cost  = pos["qty"] * pos["entry"]          # full cost, not 2% of it
        if pos["market"] == "crypto":
            if pos["symbol"] not in crypto_portfolio:
                crypto_portfolio[pos["symbol"]] = entry
                crypto_balance -= cost
                loaded += 1
                print(f"  [RELOAD] {pos['symbol']} crypto qty={pos['qty']:.6f} entry={pos['entry']:.2f}")
        else:
            if pos["symbol"] not in indian_portfolio:
                indian_portfolio[pos["symbol"]] = entry
                indian_balance -= cost
                loaded += 1
                print(f"  [RELOAD] {pos['symbol']} indian qty={pos['qty']:.4f} entry={pos['entry']:.2f}")
    if loaded == 0:
        print("  [RELOAD] No open positions found in DB")

# ── Decision logic ────────────────────────────────────────────────────────────

def decide(signal, lstm_result=None):
    sig_dir  = signal["direction"]
    sig_conf = signal["confidence"]
    # Long entries only in an uptrend (EMA20 > EMA50). Default True so callers
    # without the field (tests, old payloads) keep old behavior.
    trend_ok = signal.get("trend_up", True)

    if lstm_result and lstm_result["source"] not in ("no_model","insufficient","fallback",""):
        votes    = [lstm_result.get("15m","HOLD"),
                    lstm_result.get("30m","HOLD"),
                    lstm_result.get("1h","HOLD")]
        buy_v    = votes.count("BUY")
        sell_v   = votes.count("SELL")
        lstm_dir = "BUY" if buy_v >= 2 else "SELL" if sell_v >= 2 else "HOLD"
        lstm_conf = lstm_result.get("confidence", 0.0)

        if buy_v == 3 or sell_v == 3:
            lstm_conf = min(lstm_conf * 1.3, 1.0)

        combined = sig_conf * 0.6 + lstm_conf * 0.4

        if sig_dir in ("BUY","STRONG_BUY") and lstm_dir == "BUY":
            return ("BUY",  round(combined, 2)) if combined > 0.25 and trend_ok else ("HOLD", combined)
        elif sig_dir in ("SELL","STRONG_SELL") and lstm_dir == "SELL":
            return ("SELL", round(combined, 2)) if combined > 0.25 else ("HOLD", combined)
        elif sig_dir == "STRONG_BUY"  and lstm_dir == "HOLD" and sig_conf > 0.45 and trend_ok:
            return ("BUY",  round(sig_conf * 0.7, 2))
        elif sig_dir == "STRONG_SELL" and lstm_dir == "HOLD" and sig_conf > 0.45:
            return ("SELL", round(sig_conf * 0.7, 2))
        return ("HOLD", round(combined, 2))

    if sig_dir == "STRONG_BUY"  and sig_conf > 0.40 and trend_ok: return ("BUY",  sig_conf)
    if sig_dir == "BUY"          and sig_conf > 0.35 and trend_ok: return ("BUY",  sig_conf)
    if sig_dir == "STRONG_SELL" and sig_conf > 0.40: return ("SELL", sig_conf)
    if sig_dir == "SELL"         and sig_conf > 0.35: return ("SELL", sig_conf)
    return ("HOLD", sig_conf)

# ── Stop loss / Take profit / Trailing stop ───────────────────────────────────

def check_exit(symbol, market, current_price):
    """Returns (action, reason) — action None when no exit triggered."""
    _last_price[(symbol, market)] = current_price   # mark-to-market for P&L
    portfolio = crypto_portfolio if market == "crypto" else indian_portfolio
    if symbol not in portfolio:
        return None, None
    pos   = portfolio[symbol]
    entry = pos["entry"]
    if current_price > pos.get("high_water", entry):
        portfolio[symbol]["high_water"] = current_price
    high_water = portfolio[symbol]["high_water"]
    pnl_pct = (current_price - entry) / entry

    if pnl_pct <= -STOP_LOSS_PCT:
        print(f"  [STOP-LOSS]   {symbol} {pnl_pct*100:.1f}%")
        return "SELL", "STOP_LOSS"
    if pnl_pct >= TAKE_PROFIT_PCT:
        print(f"  [TAKE-PROFIT] {symbol} +{pnl_pct*100:.1f}%")
        return "SELL", "TAKE_PROFIT"
    # Trailing stop: only once trade has been in profit by TRAIL_ARM_PCT
    if high_water >= entry * (1 + TRAIL_ARM_PCT):
        if current_price <= high_water * (1 - TRAIL_PCT):
            locked = (current_price - entry) / entry
            print(f"  [TRAIL-STOP]  {symbol} {locked*100:+.1f}% (peak +{(high_water/entry-1)*100:.1f}%)")
            return "SELL", "TRAIL_STOP"
    return None, None

# ── Execution ─────────────────────────────────────────────────────────────────

# The 15-min cycle thread and the fast exit-guard thread both execute trades;
# serialize so a position can't be sold twice or balance updated concurrently.
_exec_lock = threading.Lock()

def execute_paper(*args, **kwargs):
    with _exec_lock:
        return _execute_paper(*args, **kwargs)

def _execute_paper(symbol, market, action, price, confidence, score, reasons,
                   lstm=None, atr_pct=None):
    global crypto_balance, indian_balance
    _roll_daily()

    is_crypto = market == "crypto"
    balance   = crypto_balance if is_crypto else indian_balance
    portfolio = crypto_portfolio if is_crypto else indian_portfolio
    max_open  = MAX_OPEN_CRYPTO if is_crypto else MAX_OPEN_INDIAN
    currency  = "USDT" if is_crypto else "INR"
    start_bal = CRYPTO_BALANCE if is_crypto else INDIAN_BALANCE

    preds = {}
    if lstm:
        preds = {"15m": lstm.get("15m","?"),
                 "30m": lstm.get("30m","?"),
                 "1h":  lstm.get("1h","?")}

    exit_signal, exit_reason = check_exit(symbol, market, price)
    if exit_signal == "SELL" and symbol in portfolio:
        action = "SELL"
    elif action == "SELL":
        exit_reason = "SIGNAL"

    if action == "BUY" and symbol not in portfolio:
        if len(portfolio) >= max_open:
            print(f"  [SKIP] {symbol} — max {max_open} positions")
            return
        # Daily circuit breaker
        if _daily_pnl[market] <= -start_bal * DAILY_LOSS_LIMIT_PCT:
            print(f"  [SKIP] {symbol} — daily loss limit hit ({_daily_pnl[market]:+.2f})")
            return
        # Cooldown after recent stop-loss
        cd = _cooldowns.get((symbol, market), 0)
        if time.time() - cd < COOLDOWN_SEC:
            print(f"  [SKIP] {symbol} — cooldown after stop-loss")
            return

        trade_amt = balance * RISK_PER_TRADE
        # Volatility scaling: wilder symbol → smaller position
        if atr_pct and atr_pct > 0:
            vol_factor = max(VOL_SIZE_MIN, min(VOL_SIZE_MAX, TARGET_ATR_PCT / atr_pct))
            trade_amt *= vol_factor
        qty = trade_amt / price
        if not is_crypto:
            qty       = max(1, int(qty))   # whole shares only
            trade_amt = qty * price         # actual cost
        fee = _fee(market, trade_amt)
        if trade_amt + fee > balance:
            print(f"  [SKIP] {symbol} — cost {trade_amt+fee:.2f} exceeds balance {balance:.2f}")
            return
        portfolio[symbol] = {"qty": qty, "entry": price, "high_water": price}
        if is_crypto: crypto_balance -= (trade_amt + fee)
        else:         indian_balance -= (trade_amt + fee)
        save_trade(symbol, market, "BUY", qty, price, score, confidence, preds, fee=fee)
        print(f"  [BUY]  {symbol} qty={qty:.4f} @ {price:.2f} {currency} "
              f"| score={score:+d} conf={confidence:.2f} fee={fee:.2f} "
              f"SL={price*(1-STOP_LOSS_PCT):.2f} TP={price*(1+TAKE_PROFIT_PCT):.2f}")
        if preds:
            print(f"         Kronos → 15m:{preds['15m']} 30m:{preds['30m']} 1h:{preds['1h']}")

    elif action == "SELL" and symbol in portfolio:
        pos      = portfolio.pop(symbol)
        proceeds = pos["qty"] * price
        cost     = pos["qty"] * pos["entry"]
        fee      = _fee(market, proceeds)
        pnl      = proceeds - cost - fee
        pnl_pct  = pnl / cost * 100
        if is_crypto: crypto_balance += (proceeds - fee)
        else:         indian_balance += (proceeds - fee)
        _daily_pnl[market] += pnl
        if exit_reason == "STOP_LOSS":
            _cooldowns[(symbol, market)] = time.time()
        save_trade(symbol, market, "SELL", pos["qty"], price, score, confidence, preds,
                   pnl=round(pnl, 4), fee=fee, exit_reason=exit_reason or "SIGNAL")
        print(f"  [SELL] {symbol} qty={pos['qty']:.4f} @ {price:.2f} {currency} "
              f"| PnL={pnl:+.2f} ({pnl_pct:+.1f}%) fee={fee:.2f} reason={exit_reason or 'SIGNAL'}")

    else:
        print(f"  [HOLD] {symbol} score={score:+d} dir={action}")

# ── Status ────────────────────────────────────────────────────────────────────

def portfolio_status():
    print(f"\n{'─'*55}")
    print(f"  [CRYPTO] Balance: ${crypto_balance:.2f} USDT")
    for sym, pos in crypto_portfolio.items():
        print(f"    Open: {sym} qty={pos['qty']:.6f} entry={pos['entry']:.2f}")
    print(f"  [INDIAN] Balance: ₹{indian_balance:.2f} INR")
    for sym, pos in indian_portfolio.items():
        print(f"    Open: {sym} qty={pos['qty']:.4f} entry={pos['entry']:.2f}")
    if not crypto_portfolio and not indian_portfolio:
        print("  No open positions")
    print(f"{'─'*55}\n")

def _market_state(portfolio, balance, start_bal, market, qty_dp):
    holdings = []
    mtm = 0.0
    for s, p in portfolio.items():
        px = _last_price.get((s, market), p["entry"])
        mtm += p["qty"] * px
        holdings.append({
            "symbol": s, "qty": round(p["qty"], qty_dp), "entry": p["entry"],
            "price": round(px, 2),
            "pnl": round((px - p["entry"]) * p["qty"], 2),          # unrealized
            "sl": round(p["entry"]*(1-STOP_LOSS_PCT), 2),
            "tp": round(p["entry"]*(1+TAKE_PROFIT_PCT), 2),
        })
    total = balance + mtm
    return {
        "balance": round(balance, 2),
        "holdings": holdings,
        "total_value": round(total, 2),
        "pnl": round(total - start_bal, 2),   # realized (in cash) + unrealized (mtm)
    }

def get_state():
    return {
        "crypto": _market_state(crypto_portfolio, crypto_balance, CRYPTO_BALANCE, "crypto", 6),
        "indian": _market_state(indian_portfolio, indian_balance, INDIAN_BALANCE, "indian", 4),
    }

def reset():
    """Resets balances AND closes DB positions so restart can't resurrect them."""
    global crypto_balance, indian_balance
    crypto_balance = CRYPTO_BALANCE
    indian_balance = INDIAN_BALANCE
    crypto_portfolio.clear()
    indian_portfolio.clear()
    _cooldowns.clear()
    _daily_pnl["crypto"] = 0.0
    _daily_pnl["indian"] = 0.0
    n = close_all_positions()
    print(f"[RESET] Balances restored, {n} DB positions marked CLOSED")
