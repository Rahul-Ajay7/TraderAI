"""
backend/api.py
FastAPI — REST endpoints + WebSocket live feed.
All data served from shared state dict + SQLite.
"""
import asyncio, os, sys, threading
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from backend.state import state
from backend.websocket import manager
from db.database import get_all_trades, DB_PATH

app = FastAPI(title="TraderAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _model_status():
    import os
    base = os.path.dirname(os.path.dirname(__file__))
    state["model_status"]["crypto"]["trained"] = os.path.exists(
        os.path.join(base, "model", "lstm_crypto.pt"))
    state["model_status"]["indian"]["trained"] = os.path.exists(
        os.path.join(base, "model", "lstm_indian.pt"))
    return state["model_status"]

# ─── REST endpoints ───────────────────────────────────────────────────────────

@app.get("/api/prices")
async def get_prices():
    return state["prices"]

@app.get("/api/signals")
async def get_signals():
    return state["signals"]

@app.get("/api/portfolio")
async def get_portfolio():
    return state["portfolio"]

@app.get("/api/trades")
async def get_trades():
    return get_all_trades(limit=50)

@app.get("/api/model")
async def get_model():
    return _model_status()

@app.get("/api/market")
async def get_market():
    return {"open": state["market_open"], "last_update": state["last_update"]}

@app.post("/api/train/crypto")
async def train_crypto():
    def _run():
        from model.lstm_crypto import train
        train()
        state["model_status"]["crypto"]["trained"] = True
        state["model_status"]["crypto"]["last_trained"] = datetime.now().isoformat()
    threading.Thread(target=_run, daemon=True).start()
    return {"status": "crypto_training_started"}

@app.post("/api/train/indian")
async def train_indian():
    def _run():
        from model.lstm_indian import train
        train()
        state["model_status"]["indian"]["trained"] = True
        state["model_status"]["indian"]["last_trained"] = datetime.now().isoformat()
    threading.Thread(target=_run, daemon=True).start()
    return {"status": "indian_training_started"}

@app.post("/api/reset")
async def reset_portfolio():
    import trader.paper_trader as pt
    pt.reset()
    return {"status": "reset", "crypto": pt.CRYPTO_BALANCE, "indian": pt.INDIAN_BALANCE}

# ─── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except (WebSocketDisconnect, Exception):
        manager.disconnect(ws)

@app.on_event("startup")
async def startup():
    asyncio.create_task(_broadcast_loop())

async def _broadcast_loop():
    while True:
        await asyncio.sleep(5)
        if manager.active:
            state["trades"] = get_all_trades(limit=50)
            _model_status()
            await manager.broadcast(state)