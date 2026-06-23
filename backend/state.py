"""
backend/state.py
Single shared dict — updated by main loop, read by API.
"""

state = {
    "prices":   {},      # symbol → {price, change_pct, market}
    "signals":  {},      # symbol → signal dict
    "indices":  {},      # ^NSEI/^BSESN → {name, price, change_pct, trend} (context only, not traded)
    "portfolio": {
        "crypto": {"balance": 1000.0, "holdings": [], "total_value": 1000.0, "pnl": 0.0},
        "indian": {"balance": 100000.0, "holdings": [], "total_value": 100000.0, "pnl": 0.0},
    },
    "trades":   [],
    "model_status": {
        "type":    "Kronos-mini",
        "ready":   False,
        "source":  "NeoQuasar/Kronos-mini",
        "context": 2048,
        "params":  "4.1M",
    },
    "market_open": False,
    "last_update": None,
}