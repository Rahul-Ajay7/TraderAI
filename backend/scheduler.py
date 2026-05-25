import os
import random
import requests
import asyncio
from collections import defaultdict
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

from db import SessionLocal, Portfolio, Holding, Trade, AILog, PriceHistory
from risk import (within_risk, check_stop_loss, check_take_profit,
                  update_trailing_stop, check_trailing_stop,
                  max_drawdown_breached, position_size)
from agent import get_batch_decisions, build_batch_prompt
from indicators import compute_all

CRYPTO_IDS = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "DOGE": "dogecoin"}
STOCK_SYMBOLS = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "WIPRO.NS"]
ALL_SYMBOLS = list(CRYPTO_IDS.keys()) + ["RELIANCE", "TCS", "INFY", "HDFCBANK", "WIPRO"]

price_history: dict = defaultdict(list)
last_prices: dict = {}
prev_prices: dict = {}

FALLBACK = {
    "BTC": 77000.0, "ETH": 2100.0, "SOL": 85.0, "DOGE": 0.105,
    "RELIANCE": 1336.0, "TCS": 2283.0, "INFY": 1142.0,
    "HDFCBANK": 769.0, "WIPRO": 192.0,
}


def jitter(symbol: str) -> float:
    base = last_prices.get(symbol) or FALLBACK.get(symbol, 100.0)
    return round(base * (1 + random.uniform(-0.006, 0.006)), 6)


def fetch_crypto_prices() -> dict:
    try:
        ids = ",".join(CRYPTO_IDS.values())
        r = requests.get(
            f"https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd",
            timeout=15
        )
        r.raise_for_status()
        data = r.json()
        return {sym: data[cid]["usd"] for sym, cid in CRYPTO_IDS.items() if cid in data}
    except Exception as e:
        print(f"[CRYPTO ERROR] {e}")
        return {sym: jitter(sym) for sym in CRYPTO_IDS}


def fetch_stock_price(symbol: str) -> float:
    bare = symbol.replace(".NS", "")
    try:
        r = requests.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            timeout=8
        )
        return r.json()["chart"]["result"][0]["meta"]["regularMarketPrice"]
    except Exception:
        return jitter(bare)


def get_all_prices() -> dict:
    crypto = fetch_crypto_prices()
    stocks = {s.replace(".NS", ""): fetch_stock_price(s) for s in STOCK_SYMBOLS}
    return {**crypto, **stocks}


def update_price_history(symbol: str, price: float):
    price_history[symbol].append(price)
    if len(price_history[symbol]) > 60:
        price_history[symbol] = price_history[symbol][-60:]


def build_portfolio_state(db) -> dict:
    portfolio = db.query(Portfolio).first()
    holdings = db.query(Holding).all()
    return {
        "cash_balance": portfolio.cash_balance if portfolio else 10000,
        "holdings": [
            {"symbol": h.symbol, "quantity": h.quantity,
             "avg_buy_price": h.avg_buy_price, "current_price": h.current_price}
            for h in holdings
        ],
    }


def execute_buy(db, symbol, price, quantity, reason, strategy, confidence):
    holding = db.query(Holding).filter_by(symbol=symbol).first()
    if holding:
        total = holding.quantity * holding.avg_buy_price + quantity * price
        holding.avg_buy_price = total / (holding.quantity + quantity)
        holding.quantity += quantity
        holding.current_price = price
        holding.trailing_stop = update_trailing_stop(holding.trailing_stop, price)
    else:
        ts = price * 0.97
        holding = Holding(symbol=symbol, quantity=quantity, avg_buy_price=price,
                          current_price=price, trailing_stop=ts)
        db.add(holding)
    portfolio = db.query(Portfolio).first()
    portfolio.cash_balance -= quantity * price
    db.add(Trade(symbol=symbol, action="BUY", quantity=quantity, price=price,
                 reason=reason, strategy=strategy, confidence=confidence))
    db.commit()
    print(f"[BUY] {symbol} qty={quantity:.6f} @ {price:.4f} conf={confidence}")


def execute_sell(db, holding, price, reason, strategy="risk"):
    portfolio = db.query(Portfolio).first()
    portfolio.cash_balance += holding.quantity * price
    db.add(Trade(symbol=holding.symbol, action="SELL", quantity=holding.quantity,
                 price=price, reason=reason, strategy=strategy, confidence=1.0))
    db.delete(holding)
    db.commit()
    print(f"[SELL] {holding.symbol} @ {price:.4f} — {reason}")


def check_exit_conditions(db, holding, price) -> bool:
    holding.trailing_stop = update_trailing_stop(holding.trailing_stop, price)
    db.commit()

    if check_trailing_stop(holding.trailing_stop, price):
        execute_sell(db, holding, price, f"Trailing stop hit @ {price:.4f}")
        return True
    if check_stop_loss(holding.avg_buy_price, price):
        execute_sell(db, holding, price, f"Stop-loss -5% @ {price:.4f}")
        return True
    if check_take_profit(holding.avg_buy_price, price):
        execute_sell(db, holding, price, f"Take-profit +8% @ {price:.4f}")
        return True
    return False


def broadcast_state(all_prices: dict):
    from main import connected_websockets, broadcast
    db = SessionLocal()
    try:
        portfolio = db.query(Portfolio).first()
        holdings = db.query(Holding).all()
        trades = db.query(Trade).order_by(Trade.timestamp.desc()).limit(20).all()
        logs = db.query(AILog).order_by(AILog.timestamp.desc()).limit(20).all()
        holdings_value = sum(h.quantity * h.current_price for h in holdings)

        prices_fmt = {}
        for sym, price in all_prices.items():
            key = sym + ".NS" if sym in ["RELIANCE", "TCS", "INFY", "HDFCBANK", "WIPRO"] else sym
            prev = prev_prices.get(sym)
            chg = round(((price - prev) / prev * 100), 2) if prev else 0
            prices_fmt[key] = {"price": price, "change_percent": chg}

        msg = {
            "type": "price_update",
            "prices": prices_fmt,
            "portfolio": {
                "cash": round(portfolio.cash_balance, 2) if portfolio else 0,
                "total_value": round(portfolio.total_value, 2) if portfolio else 0,
                "holdings_value": round(holdings_value, 2),
            },
            "holdings": [
                {"id": h.id, "symbol": h.symbol, "quantity": h.quantity,
                 "avg_price": h.avg_buy_price, "current_price": h.current_price,
                 "trailing_stop": h.trailing_stop}
                for h in holdings
            ],
            "trades": [
                {"id": t.id, "timestamp": t.timestamp.isoformat(), "trade_type": t.action,
                 "symbol": t.symbol, "quantity": t.quantity, "price": t.price,
                 "reasoning": t.reason, "confidence": t.confidence}
                for t in trades
            ],
            "logs": [
                {"id": l.id, "timestamp": l.timestamp.isoformat(),
                 "symbol": l.symbol, "prompt": l.prompt, "response": l.response}
                for l in logs
            ],
        }
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(broadcast(msg))
        except RuntimeError:
            pass
    finally:
        db.close()


def trading_cycle():
    global last_prices, prev_prices
    print(f"\n{'=' * 50}")
    print(f"[TRADING CYCLE] {datetime.now(timezone.utc).isoformat()}")

    prev_prices = last_prices.copy()
    all_prices = get_all_prices()
    last_prices = all_prices.copy()

    for sym, price in all_prices.items():
        update_price_history(sym, price)

    db = SessionLocal()
    try:
        portfolio = db.query(Portfolio).first()
        if not portfolio:
            return

        if max_drawdown_breached(portfolio.total_value, portfolio.peak_value):
            print(f"[RISK] MAX DRAWDOWN BREACHED — halting trades")
            broadcast_state(all_prices)
            return

        portfolio_state = build_portfolio_state(db)
        holdings_map = {h.symbol: h for h in db.query(Holding).all()}
        num_holdings = len(holdings_map)

        for symbol, holding in list(holdings_map.items()):
            price = all_prices.get(symbol)
            if price:
                holding.current_price = price
                db.commit()
                if check_exit_conditions(db, holding, price):
                    holdings_map.pop(symbol, None)
                    num_holdings -= 1

        assets = []
        for symbol in ALL_SYMBOLS:
            price = all_prices.get(symbol)
            if not price:
                continue
            history = price_history.get(symbol, [price])
            indicators = compute_all(history)
            assets.append({"symbol": symbol, "price": price, "indicators": indicators})
            print(f"[{symbol}] price={price:.4f} RSI={indicators['rsi']} MACD={indicators['macd']['signal']} BB={indicators['bb']['position']}")

        prompt = build_batch_prompt(assets, portfolio_state)
        decisions = get_batch_decisions(assets, portfolio_state)

        db.add(AILog(
            symbol="BATCH",
            prompt=prompt[:2000],
            response=str(decisions)[:2000]
        ))
        db.commit()

        portfolio = db.query(Portfolio).first()
        for decision in decisions:
            symbol = decision.get("symbol", "")
            action = decision.get("action", "HOLD").upper()
            reason = decision.get("reason", "")
            strategy = decision.get("strategy", "AI")
            confidence = float(decision.get("confidence", 0.5))
            price = all_prices.get(symbol)

            if not price or action == "HOLD":
                continue

            print(f"[GEMINI] {symbol}: {action} conf={confidence} — {reason}")

            holding = db.query(Holding).filter_by(symbol=symbol).first()
            num_holdings = db.query(Holding).count()

            if action == "BUY" and within_risk(portfolio.cash_balance, price, action, num_holdings):
                qty = position_size(portfolio.cash_balance, price, confidence)
                if qty > 0:
                    execute_buy(db, symbol, price, qty, reason, strategy, confidence)

            elif action == "SELL" and holding:
                execute_sell(db, holding, price, reason, strategy)

        holdings = db.query(Holding).all()
        holdings_value = sum(h.quantity * h.current_price for h in holdings)
        portfolio.total_value = round(portfolio.cash_balance + holdings_value, 2)
        if portfolio.total_value > portfolio.peak_value:
            portfolio.peak_value = portfolio.total_value
        db.commit()

        print(f"[PORTFOLIO] Total=₹{portfolio.total_value} Cash=₹{portfolio.cash_balance:.2f} Holdings=₹{holdings_value:.2f}")

    except Exception as e:
        print(f"[CYCLE ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

    broadcast_state(all_prices)


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        trading_cycle, "interval", minutes=15,
        id="trading_job", max_instances=1, coalesce=True
    )
    scheduler.start()
    print("[SCHEDULER] Started — running every 15 minutes")
    return scheduler
