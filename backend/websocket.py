"""
backend/websocket.py
Manages WebSocket connections — broadcasts state to all connected frontends.
"""
import math
from fastapi import WebSocket


def _clean(v):
    """Replace NaN/Inf with None — they serialize to bare NaN/Infinity tokens
    that are invalid JSON, so the browser's JSON.parse throws and the UI shows
    nothing. Walk dicts/lists recursively."""
    if isinstance(v, float):
        return v if math.isfinite(v) else None
    if isinstance(v, dict):
        return {k: _clean(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_clean(x) for x in v]
    return v


class ConnectionManager:
    def __init__(self):
        self.active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, data: dict):
        payload = _clean(data)
        dead = set()
        for ws in self.active:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        self.active -= dead

manager = ConnectionManager()