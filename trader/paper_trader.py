"""
trader/paper_trader.py
IMPROVED: 2-of-3 Kronos vote, stop-loss, take-profit, position reload from DB.
"""
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db.database import save_trade

# ── Starting balances ─────────────────────────────────────────────────────────
CRYPTO_BALANCE  = 1000.0
INDIAN_BALANCE  = 100000.0

RISK_PER_TRADE  = 0.02
MAX_OPEN_CRYPTO = 3
MAX_OPEN_INDIAN = 5
STOP_LOSS_PCT   = 0.015
TAKE_PROFIT_PCT = 0.03

# ── Portfolio state ───────────────────────────────────────────────────────────
crypto_balance   = CRYPTO_BALANCE
indian_balance   = INDIAN_BALANCE
crypto_portfolio = {}
indian_portfolio = {}

# ── Reload open positions from DB on startup ──────────────────────────────────

def reload_positions():
    """Restores open positions from DB so stop-loss survives restarts."""
    from db.database import get_open_positions
    global crypto_balance, indian_balance
    loaded = 0
    for pos in get_open_positions():
        entry = {"qty": pos["qty"], "entry": pos["entry"], "high_water": pos["entry"]}
        if pos["market"] == "crypto":
            if pos["symbol"] not in crypto_portfolio:
                crypto_portfolio[pos["symbol"]] = entry
                crypto_balance -= pos["qty"] * pos["entry"] * RISK_PER_TRADE
                loaded += 1
                print(f"  [RELOAD] {pos['symbol']} crypto qty={pos['qty']:.6f} entry={pos['entry']:.2f}")
        else:
            if pos["symbol"] not in indian_portfolio:
                indian_portfolio[pos["symbol"]] = entry
                indian_balance -= pos["qty"] * pos["entry"] * RISK_PER_TRADE
                loaded += 1
                print(f"  [RELOAD] {pos['symbol']} indian qty={pos['qty']:.4f} entry={pos['entry']:.2f}")
    if loaded == 0:
        print("  [RELOAD] No open positions found in DB")

# ── Decision logic ────────────────────────────────────────────────────────────

def decide(signal, lstm_result=None):
    sig_dir  = signal["direction"]
    sig_conf = signal["confidence"]

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
            return ("BUY",  round(combined, 2)) if combined > 0.25 else ("HOLD", combined)
        elif sig_dir in ("SELL","STRONG_SELL") and lstm_dir == "SELL":
            return ("SELL", round(combined, 2)) if combined > 0.25 else ("HOLD", combined)
        elif sig_dir == "STRONG_BUY"  and lstm_dir == "HOLD" and sig_conf > 0.45:
            return ("BUY",  round(sig_conf * 0.7, 2))
        elif sig_dir == "STRONG_SELL" and lstm_dir == "HOLD" and sig_conf > 0.45:
            return ("SELL", round(sig_conf * 0.7, 2))
        return ("HOLD", round(combined, 2))

    if sig_dir == "STRONG_BUY"  and sig_conf > 0.40: return ("BUY",  sig_conf)
    if sig_dir == "BUY"          and sig_conf > 0.35: return ("BUY",  sig_conf)
    if sig_dir == "STRONG_SELL" and sig_conf > 0.40: return ("SELL", sig_conf)
    if sig_dir == "SELL"         and sig_conf > 0.35: return ("SELL", sig_conf)
    return ("HOLD", sig_conf)

# ── Stop loss / Take profit ───────────────────────────────────────────────────

def check_exit(symbol, market, current_price):
    portfolio = crypto_portfolio if market == "crypto" else indian_portfolio
    if symbol not in portfolio:
        return None
    pos   = portfolio[symbol]
    entry = pos["entry"]
    if current_price > pos.get("high_water", entry):
        portfolio[symbol]["high_water"] = current_price
    pnl_pct = (current_price - entry) / entry
    if pnl_pct <= -STOP_LOSS_PCT:
        print(f"  [STOP-LOSS]   {symbol} {pnl_pct*100:.1f}%")
        return "SELL"
    if pnl_pct >= TAKE_PROFIT_PCT:
        print(f"  [TAKE-PROFIT] {symbol} +{pnl_pct*100:.1f}%")
        return "SELL"
    return None

# ── Execution ─────────────────────────────────────────────────────────────────

def execute_paper(symbol, market, action, price, confidence, score, reasons, lstm=None):
    global crypto_balance, indian_balance

    is_crypto = market == "crypto"
    balance   = crypto_balance if is_crypto else indian_balance
    portfolio = crypto_portfolio if is_crypto else indian_portfolio
    max_open  = MAX_OPEN_CRYPTO if is_crypto else MAX_OPEN_INDIAN
    currency  = "USDT" if is_crypto else "INR"

    preds = {}
    if lstm:
        preds = {"15m": lstm.get("15m","?"),
                 "30m": lstm.get("30m","?"),
                 "1h":  lstm.get("1h","?")}

    exit_signal = check_exit(symbol, market, price)
    if exit_signal == "SELL" and symbol in portfolio:
        action = "SELL"

    if action == "BUY" and symbol not in portfolio:
        if len(portfolio) >= max_open:
            print(f"  [SKIP] {symbol} — max {max_open} positions")
            return
        trade_amt = balance * RISK_PER_TRADE
        qty       = trade_amt / price
        portfolio[symbol] = {"qty": qty, "entry": price, "high_water": price}
        if is_crypto: crypto_balance -= trade_amt
        else:         indian_balance -= trade_amt
        save_trade(symbol, market, "BUY", qty, price, score, confidence, preds)
        print(f"  [BUY]  {symbol} qty={qty:.4f} @ {price:.2f} {currency} "
              f"| score={score:+d} conf={confidence:.2f} "
              f"SL={price*(1-STOP_LOSS_PCT):.2f} TP={price*(1+TAKE_PROFIT_PCT):.2f}")
        if preds:
            print(f"         Kronos → 15m:{preds['15m']} 30m:{preds['30m']} 1h:{preds['1h']}")

    elif action == "SELL" and symbol in portfolio:
        pos      = portfolio.pop(symbol)
        proceeds = pos["qty"] * price
        cost     = pos["qty"] * pos["entry"]
        pnl      = proceeds - cost
        pnl_pct  = pnl / cost * 100
        if is_crypto: crypto_balance += proceeds
        else:         indian_balance += proceeds
        save_trade(symbol, market, "SELL", pos["qty"], price, score, confidence, preds)
        print(f"  [SELL] {symbol} qty={pos['qty']:.4f} @ {price:.2f} {currency} "
              f"| PnL={pnl:+.2f} ({pnl_pct:+.1f}%)")

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

def get_state():
    return {
        "crypto": {
            "balance": round(crypto_balance, 2),
            "holdings": [
                {"symbol": s, "qty": round(p["qty"],6), "entry": p["entry"],
                 "sl": round(p["entry"]*(1-STOP_LOSS_PCT),2),
                 "tp": round(p["entry"]*(1+TAKE_PROFIT_PCT),2)}
                for s, p in crypto_portfolio.items()
            ],
            "total_value": round(
                crypto_balance + sum(p["qty"]*p["entry"]
                for p in crypto_portfolio.values()), 2),
            "pnl": round(
                crypto_balance + sum(p["qty"]*p["entry"]
                for p in crypto_portfolio.values()) - CRYPTO_BALANCE, 2),
        },
        "indian": {
            "balance": round(indian_balance, 2),
            "holdings": [
                {"symbol": s, "qty": round(p["qty"],4), "entry": p["entry"],
                 "sl": round(p["entry"]*(1-STOP_LOSS_PCT),2),
                 "tp": round(p["entry"]*(1+TAKE_PROFIT_PCT),2)}
                for s, p in indian_portfolio.items()
            ],
            "total_value": round(
                indian_balance + sum(p["qty"]*p["entry"]
                for p in indian_portfolio.values()), 2),
            "pnl": round(
                indian_balance + sum(p["qty"]*p["entry"]
                for p in indian_portfolio.values()) - INDIAN_BALANCE, 2),
        }
    }

def reset():
    global crypto_balance, indian_balance
    crypto_balance = CRYPTO_BALANCE
    indian_balance = INDIAN_BALANCE
    crypto_portfolio.clear()
    indian_portfolio.clear()