"""
trader/paper_trader.py
Paper trading — no real orders.
Separate balances: USDT for crypto, INR for Indian stocks.
LSTM 3-head predictions stored with each trade.
"""
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db.database import save_trade

# ── Starting balances ──────────────────────────────────────────────────────────
CRYPTO_BALANCE  = 1000.0    # USDT
INDIAN_BALANCE  = 100000.0  # INR

RISK_PER_TRADE  = 0.02      # 2% per trade
MAX_OPEN_CRYPTO = 3
MAX_OPEN_INDIAN = 5

# ── Portfolio state ────────────────────────────────────────────────────────────
crypto_balance = CRYPTO_BALANCE
indian_balance = INDIAN_BALANCE
crypto_portfolio = {}    # symbol → {qty, entry}
indian_portfolio = {}    # symbol → {qty, entry}

# ─── Decision logic ───────────────────────────────────────────────────────────

def decide(signal, lstm_result=None):
    """
    Combines signal score (60%) + LSTM 15m prediction (40%).
    Returns: (action: BUY/SELL/HOLD, confidence: float)
    """
    sig_dir  = signal["direction"]
    sig_conf = signal["confidence"]

    if lstm_result and lstm_result["source"] not in ("no_model","insufficient",""):
        lstm_dir  = lstm_result.get("15m", "HOLD")
        lstm_conf = lstm_result.get("confidence", 0.0)
        combined  = sig_conf * 0.6 + lstm_conf * 0.4

        if sig_dir in ("BUY","STRONG_BUY") and lstm_dir == "BUY":
            return ("BUY",  round(combined, 2)) if combined > 0.30 else ("HOLD", combined)
        elif sig_dir in ("SELL","STRONG_SELL") and lstm_dir == "SELL":
            return ("SELL", round(combined, 2)) if combined > 0.30 else ("HOLD", combined)
        return ("HOLD", round(combined, 2))

    # Signal-only fallback
    if sig_dir == "STRONG_BUY"  and sig_conf > 0.40: return ("BUY",  sig_conf)
    if sig_dir == "BUY"          and sig_conf > 0.35: return ("BUY",  sig_conf)
    if sig_dir == "STRONG_SELL" and sig_conf > 0.40: return ("SELL", sig_conf)
    if sig_dir == "SELL"         and sig_conf > 0.35: return ("SELL", sig_conf)
    return ("HOLD", sig_conf)

# ─── Execution ────────────────────────────────────────────────────────────────

def execute_paper(symbol, market, action, price, confidence, score, reasons, lstm=None):
    global crypto_balance, indian_balance
    global crypto_portfolio, indian_portfolio

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

    if action == "BUY" and symbol not in portfolio:
        if len(portfolio) >= max_open:
            print(f"  [SKIP] {symbol} — max {max_open} positions")
            return
        trade_amt = balance * RISK_PER_TRADE
        qty       = trade_amt / price
        portfolio[symbol] = {"qty": qty, "entry": price}
        if is_crypto: crypto_balance -= trade_amt
        else:         indian_balance -= trade_amt
        save_trade(symbol, market, "BUY", qty, price, score, confidence, preds)
        print(f"  [BUY]  {symbol} qty={qty:.4f} @ {price:.2f} {currency} "
              f"| score={score:+d} conf={confidence:.2f}")
        if preds:
            print(f"         LSTM → 15m:{preds['15m']} 30m:{preds['30m']} 1h:{preds['1h']}")
        print(f"         {' | '.join(reasons[:3])}")

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

# ─── Status ───────────────────────────────────────────────────────────────────

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
    """Called by backend API to push state to frontend"""
    return {
        "crypto": {
            "balance": round(crypto_balance, 2),
            "holdings": [
                {"symbol": s, "qty": round(p["qty"],6), "entry": p["entry"]}
                for s, p in crypto_portfolio.items()
            ],
            "total_value": round(
                crypto_balance + sum(p["qty"]*p["entry"]
                for p in crypto_portfolio.values()), 2
            ),
            "pnl": round(
                crypto_balance + sum(p["qty"]*p["entry"]
                for p in crypto_portfolio.values()) - CRYPTO_BALANCE, 2
            ),
        },
        "indian": {
            "balance": round(indian_balance, 2),
            "holdings": [
                {"symbol": s, "qty": round(p["qty"],4), "entry": p["entry"]}
                for s, p in indian_portfolio.items()
            ],
            "total_value": round(
                indian_balance + sum(p["qty"]*p["entry"]
                for p in indian_portfolio.values()), 2
            ),
            "pnl": round(
                indian_balance + sum(p["qty"]*p["entry"]
                for p in indian_portfolio.values()) - INDIAN_BALANCE, 2
            ),
        }
    }

def reset():
    global crypto_balance, indian_balance
    crypto_balance = CRYPTO_BALANCE
    indian_balance = INDIAN_BALANCE
    crypto_portfolio.clear()
    indian_portfolio.clear()