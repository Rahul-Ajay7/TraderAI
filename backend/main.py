import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

from db import init_db, SessionLocal, Portfolio, Holding, Trade, AILog
from scheduler import start_scheduler, last_prices

scheduler = None
connected_websockets: set = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global scheduler
    init_db()
    scheduler = start_scheduler()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="TraderAI", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def fmt_prices():
    from scheduler import last_prices, prev_prices
    prices = {}
    for sym, price in last_prices.items():
        key = sym + ".NS" if sym in ["RELIANCE", "TCS", "INFY", "HDFCBANK", "WIPRO"] else sym
        prev = prev_prices.get(sym)
        chg = round(((price - prev) / prev * 100), 2) if prev and prev > 0 else 0
        prices[key] = {"price": price, "change_percent": chg}
    return prices


@app.get("/api/prices")
def get_prices():
    return fmt_prices()


@app.get("/api/portfolio")
def get_portfolio():
    db = SessionLocal()
    try:
        p = db.query(Portfolio).first()
        holdings = db.query(Holding).all()
        hv = sum(h.quantity * h.current_price for h in holdings)
        return {
            "cash": round(p.cash_balance, 2) if p else 0,
            "total_value": round(p.total_value, 2) if p else 0,
            "holdings_value": round(hv, 2),
            "peak_value": round(p.peak_value, 2) if p else 0,
            "drawdown_pct": round(((p.peak_value - p.total_value) / p.peak_value * 100), 2) if p and p.peak_value else 0,
        }
    finally:
        db.close()


@app.get("/api/holdings")
def get_holdings():
    db = SessionLocal()
    try:
        return [
            {"id": h.id, "symbol": h.symbol, "quantity": h.quantity,
             "avg_price": h.avg_buy_price, "current_price": h.current_price,
             "trailing_stop": h.trailing_stop}
            for h in db.query(Holding).all()
        ]
    finally:
        db.close()


@app.get("/api/trades")
def get_trades():
    db = SessionLocal()
    try:
        trades = db.query(Trade).order_by(Trade.timestamp.desc()).limit(100).all()
        return [
            {"id": t.id, "symbol": t.symbol, "trade_type": t.action,
             "quantity": t.quantity, "price": t.price, "reasoning": t.reason,
             "strategy": t.strategy, "confidence": t.confidence,
             "timestamp": t.timestamp.isoformat()}
            for t in trades
        ]
    finally:
        db.close()


@app.get("/api/ai-logs")
def get_ai_logs():
    db = SessionLocal()
    try:
        logs = db.query(AILog).order_by(AILog.timestamp.desc()).limit(50).all()
        return [
            {"id": l.id, "symbol": l.symbol, "prompt": l.prompt,
             "response": l.response, "timestamp": l.timestamp.isoformat()}
            for l in logs
        ]
    finally:
        db.close()


async def broadcast(data: dict):
    dead = set()
    for ws in connected_websockets:
        try:
            await ws.send_json(data)
        except Exception:
            dead.add(ws)
    connected_websockets -= dead


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.add(websocket)
    db = SessionLocal()
    try:
        p = db.query(Portfolio).first()
        holdings = db.query(Holding).all()
        trades = db.query(Trade).order_by(Trade.timestamp.desc()).limit(20).all()
        logs = db.query(AILog).order_by(AILog.timestamp.desc()).limit(20).all()
        hv = sum(h.quantity * h.current_price for h in holdings)
        await websocket.send_json({
            "type": "init",
            "prices": fmt_prices(),
            "portfolio": {
                "cash": round(p.cash_balance, 2) if p else 0,
                "total_value": round(p.total_value, 2) if p else 0,
                "holdings_value": round(hv, 2),
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
        })
    finally:
        db.close()
    try:
        while True:
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        pass
    finally:
        connected_websockets.discard(websocket)
