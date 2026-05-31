"""
model/lstm_indian.py
LSTM for Indian stocks (NSE .NS) + Nifty50 + Sensex.
Input:  last 60 × 15m candles
Output: UP/DOWN/SIDE for next 15min, 30min, 1hr

Train:   python model/lstm_indian.py train
Predict: imported by main.py
"""
import os, sys, json
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db.database import load_candles, candle_count
from indicators.signals import compute_rsi, compute_ema

MODEL_PATH  = os.path.join(os.path.dirname(__file__), "lstm_indian.pt")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler_indian.json")

INDIAN_STOCKS = [
    "RELIANCE.NS", "TCS.NS",        "INFY.NS",
    "HDFCBANK.NS", "ICICIBANK.NS",  "WIPRO.NS",
    "HINDUNILVR.NS","BAJFINANCE.NS","SBIN.NS",
    "ADANIENT.NS"
]
INDICES  = ["^NSEI", "^BSESN"]
ALL_SYMS = INDIAN_STOCKS + INDICES

SEQ_LEN  = 60
MIN_ROWS = 300   # 60 days × ~25 candles/day per stock

# ─── Features ─────────────────────────────────────────────────────────────────

def extract_features(candles):
    closes = np.array([c[4] for c in candles], dtype=float)
    highs  = np.array([c[2] for c in candles], dtype=float)
    lows   = np.array([c[3] for c in candles], dtype=float)
    vols   = np.array([c[5] for c in candles], dtype=float)
    feats  = []
    for i in range(14, len(candles)):
        c_sl  = closes[:i+1]
        rsi   = compute_rsi(c_sl) / 100
        ema9  = compute_ema(c_sl, 9)
        ema21 = compute_ema(c_sl, min(21, len(c_sl)))
        price = c_sl[-1]
        pct   = (price - c_sl[-2]) / c_sl[-2] if len(c_sl) > 1 else 0
        ema_g = (ema9 - ema21) / (ema21 + 1e-9)
        hl    = (highs[i] - lows[i]) / (lows[i] + 1e-9)
        v_avg = np.mean(vols[max(0,i-20):i+1]) + 1e-9
        vol_n = min(vols[i] / v_avg, 5) / 5
        r_mean = np.mean(c_sl[-20:]) if len(c_sl) >= 20 else np.mean(c_sl)
        r_std  = np.std(c_sl[-20:])  if len(c_sl) >= 20 else np.std(c_sl)
        bb_pos = (price - r_mean) / (r_std + 1e-9)
        feats.append([rsi, pct, ema_g, hl, vol_n, bb_pos])
    return np.array(feats, dtype=np.float32)

def make_labels(closes, horizon, threshold=0.002):
    labels = []
    for i in range(len(closes) - horizon):
        ch = (closes[i+horizon] - closes[i]) / closes[i]
        if ch > threshold:   labels.append(2)
        elif ch < -threshold: labels.append(0)
        else:                 labels.append(1)
    return np.array(labels)

def build_sequences(features, l15, l30, l1h):
    X, y15, y30, y1h = [], [], [], []
    for i in range(SEQ_LEN, min(len(features), len(l15), len(l30), len(l1h))):
        X.append(features[i-SEQ_LEN:i])
        y15.append(l15[i]); y30.append(l30[i]); y1h.append(l1h[i])
    return np.array(X), np.array(y15), np.array(y30), np.array(y1h)

# ─── Model ────────────────────────────────────────────────────────────────────

def _build_model(input_size):
    import torch.nn as nn
    class LSTMIndian(nn.Module):
        def __init__(self):
            super().__init__()
            self.lstm   = nn.LSTM(input_size, 64, 2, batch_first=True, dropout=0.2)
            self.shared = nn.Sequential(nn.Linear(64,32), nn.ReLU(), nn.Dropout(0.2))
            self.head_15m = nn.Linear(32, 3)
            self.head_30m = nn.Linear(32, 3)
            self.head_1h  = nn.Linear(32, 3)
        def forward(self, x):
            out, _ = self.lstm(x)
            f = self.shared(out[:, -1, :])
            return self.head_15m(f), self.head_30m(f), self.head_1h(f)
    return LSTMIndian()

# ─── Train ────────────────────────────────────────────────────────────────────

def train():
    try:
        import torch, torch.nn as nn
        from torch.utils.data import DataLoader, TensorDataset
    except ImportError:
        print("[ERROR] pip install torch"); return

    all_X, all_y15, all_y30, all_y1h = [], [], [], []

    for sym in ALL_SYMS:
        market = "index" if sym in INDICES else "indian"
        count  = candle_count(sym, market)
        if count < MIN_ROWS:
            print(f"[SKIP] {sym}: {count}/{MIN_ROWS}"); continue
        candles = load_candles(sym, market, limit=5000)
        closes  = np.array([c[4] for c in candles], dtype=float)
        feats   = extract_features(candles)
        l15 = make_labels(closes, 1)
        l30 = make_labels(closes, 2)
        l1h = make_labels(closes, 4)
        ml  = min(len(feats), len(l15), len(l30), len(l1h))
        feats=feats[:ml]; l15=l15[:ml]; l30=l30[:ml]; l1h=l1h[:ml]
        X, y15, y30, y1h = build_sequences(feats, l15, l30, l1h)
        if len(X) == 0: continue
        all_X.append(X); all_y15.append(y15)
        all_y30.append(y30); all_y1h.append(y1h)
        print(f"[DATA] {sym}: {len(X)} sequences")

    if not all_X:
        print("[ERROR] No data. Run sync first."); return

    X   = np.concatenate(all_X)
    y15 = np.concatenate(all_y15)
    y30 = np.concatenate(all_y30)
    y1h = np.concatenate(all_y1h)
    print(f"[LSTM] {len(X)} sequences | {X.shape[2]} features")

    device = torch.device("cpu")
    model  = _build_model(X.shape[2]).to(device)
    ds     = TensorDataset(torch.FloatTensor(X),
                           torch.LongTensor(y15),
                           torch.LongTensor(y30),
                           torch.LongTensor(y1h))
    loader = DataLoader(ds, batch_size=64, shuffle=True)
    opt    = torch.optim.Adam(model.parameters(), lr=0.001)
    crit   = nn.CrossEntropyLoss()

    for epoch in range(25):
        total_loss = 0; correct = 0
        for xb, yb15, yb30, yb1h in loader:
            opt.zero_grad()
            o15, o30, o1h = model(xb)
            loss = crit(o15,yb15) + crit(o30,yb30) + crit(o1h,yb1h)
            loss.backward(); opt.step()
            total_loss += loss.item()
            correct += (o15.argmax(1) == yb15).sum().item()
        acc = correct / len(X) * 100
        print(f"  Epoch {epoch+1:02d}/25 | loss={total_loss/len(loader):.4f} | acc15m={acc:.1f}%")

    torch.save(model.state_dict(), MODEL_PATH)
    json.dump({"input_size": int(X.shape[2]), "seq_len": SEQ_LEN},
              open(SCALER_PATH, "w"))
    print(f"[DONE] Saved → {MODEL_PATH}")

# ─── Predict ──────────────────────────────────────────────────────────────────

_cache = None

def predict(candles_15m):
    global _cache
    if not os.path.exists(MODEL_PATH):
        return {"15m":"HOLD","30m":"HOLD","1h":"HOLD",
                "confidence":0.0,"source":"no_model"}
    try:
        import torch
        meta  = json.load(open(SCALER_PATH))
        feats = extract_features(candles_15m)
        if len(feats) < SEQ_LEN:
            return {"15m":"HOLD","30m":"HOLD","1h":"HOLD",
                    "confidence":0.0,"source":"insufficient"}
        if _cache is None:
            m = _build_model(meta["input_size"])
            m.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
            m.eval(); _cache = m
        seq = torch.FloatTensor(feats[-SEQ_LEN:]).unsqueeze(0)
        with torch.no_grad():
            o15, o30, o1h = _cache(seq)
            p15 = torch.softmax(o15,1)[0].numpy()
            p30 = torch.softmax(o30,1)[0].numpy()
            p1h = torch.softmax(o1h,1)[0].numpy()
        lbl = ["SELL","HOLD","BUY"]
        return {
            "15m":        lbl[np.argmax(p15)],
            "30m":        lbl[np.argmax(p30)],
            "1h":         lbl[np.argmax(p1h)],
            "confidence": round(float(np.max(p15)), 2),
            "source":     "lstm_indian"
        }
    except Exception as e:
        return {"15m":"HOLD","30m":"HOLD","1h":"HOLD",
                "confidence":0.0,"source":f"error:{e}"}

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "train":
        train()
    else:
        print("Usage: python model/lstm_indian.py train")
        for s in ALL_SYMS:
            m = "index" if s in INDICES else "indian"
            print(f"  {s}: {candle_count(s, m)} candles")