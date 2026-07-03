---
title: TraderAI Backend
emoji: "📈"
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# TraderAI v2

Local ML trading bot. No API keys. No cloud AI cost.

## What it does
- Fetches live prices from Binance (crypto) and Yahoo Finance (NSE stocks)
- Runs 10+ technical indicators (RSI, MACD, EMA, Bollinger Bands, S/R, Supertrend, Fibonacci, VWAP)
- Trains local LSTM models to predict UP/DOWN/SIDE for next 15min · 30min · 1hr
- Paper trades automatically every 15 minutes
- Live dashboard to monitor prices, signals, portfolio, trade history

## Assets
- Crypto: BTC · ETH · BNB · SOL · XRP (24/7)
- Indian: RELIANCE · TCS · INFY · HDFCBANK · ICICIBANK · WIPRO · HINDUNILVR · BAJFINANCE · SBIN · ADANIENT
- Indices: Nifty 50 · Sensex (sentiment filter)

## Stack
- Backend: Python · FastAPI · SQLite · PyTorch LSTM
- Frontend: React · Vite · Tailwind · Recharts
- Data: Binance API (free) · yfinance (free)

## Run locally
pip install -r requirements.txt
python main.py

cd frontend && npm install && npm run dev
