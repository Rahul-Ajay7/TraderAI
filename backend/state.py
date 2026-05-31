"""
backend/state.py
Single shared dict — updated by main loop, read by API.
"""

state = {
    "prices":   {},      # symbol → {price, change_pct, market}
    "signals":  {},      # symbol → signal dict
    "portfolio": {
        "crypto": {"balance": 1000.0, "holdings": [], "total_value": 1000.0, "pnl": 0.0},
        "indian": {"balance": 100000.0, "holdings": [], "total_value": 100000.0, "pnl": 0.0},
    },
    "trades":   [],
    "model_status": {
        "crypto": {"trained": False, "last_trained": None},
        "indian": {"trained": False, "last_trained": None},
    },
    "market_open": False,
    "last_update": None,
}