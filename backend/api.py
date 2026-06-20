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
from db.database import get_all_trades, prediction_stats, trade_stats, db_info, DB_PATH

app = FastAPI(title="TraderAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _model_status():
    try:
        from model.kronos_predictor import is_ready
        state["model_status"]["ready"] = is_ready()
    except Exception:
        state["model_status"]["ready"] = False
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

@app.post("/api/reset")
async def reset_portfolio():
    # pt.reset() also closes open positions in DB so restart can't resurrect them
    import trader.paper_trader as pt
    pt.reset()
    return {"status": "reset", "crypto": pt.CRYPTO_BALANCE, "indian": pt.INDIAN_BALANCE}

@app.get("/api/health")
async def health():
    """DB engine, persistence, row counts — first stop when data looks missing."""
    return db_info()

@app.get("/api/accuracy")
async def get_accuracy():
    """Kronos hit-rate/MAE + realized trade stats — the honest scoreboard."""
    return {
        "predictions": prediction_stats(),
        "trades":      trade_stats(),
    }

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
    # MUST never let an exception escape the loop — a single throw (e.g. a PG
    # connection-cap hit in get_all_trades) used to kill this task for good,
    # leaving WS clients connected but receiving nothing → blank UI.
    while True:
        await asyncio.sleep(5)
        try:
            if not manager.active:
                continue
            state["trades"] = get_all_trades(limit=50)
            _model_status()
            await manager.broadcast(state)
        except Exception as e:
            print(f"[WS] broadcast tick failed: {e}", flush=True)