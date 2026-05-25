import os
import json
from google.genai import Client
from dotenv import load_dotenv
load_dotenv()

API_KEY = os.getenv("Trader_API_KEY", "")


def build_batch_prompt(assets: list, portfolio_state: dict) -> str:
    assets_str = "\n".join([
        f"- {a['symbol']}: price={a['price']}, RSI={a['indicators']['rsi']}, "
        f"MACD={a['indicators']['macd']['signal']}, "
        f"BB={a['indicators']['bb']['position']}, "
        f"MA20={a['indicators']['ma20']}, "
        f"1h_change={a['indicators']['price_change_1h']}%"
        for a in assets
    ])
    holdings_str = ", ".join([
        f"{h['symbol']}(qty={h['quantity']:.4f},avg={h['avg_buy_price']:.2f})"
        for h in portfolio_state.get("holdings", [])
    ]) or "None"

    return f"""You are a professional AI trading agent managing a ₹{portfolio_state['cash_balance']:.2f} portfolio.

CURRENT HOLDINGS: {holdings_str}
CASH AVAILABLE: ₹{portfolio_state['cash_balance']:.2f}
MAX POSITIONS ALLOWED: 5

ASSETS TO ANALYZE:
{assets_str}

STRATEGY RULES:
- RSI < 30 = oversold -> BUY signal
- RSI > 70 = overbought -> SELL signal
- MACD bullish + RSI 40-60 = momentum BUY
- BB above = overbought, BB below = oversold
- Never exceed 20% portfolio per trade
- Confidence 0.0-1.0 based on signal strength

Respond ONLY with a valid JSON array, zero markdown, zero explanation:
[{{"symbol":"BTC","action":"BUY","quantity":0.001,"reason":"RSI oversold at 28, MACD bullish","strategy":"RSI+MACD","confidence":0.8}},...]
Include ALL {len(assets)} symbols. Use HOLD with quantity 0 if no action."""


def get_batch_decisions(assets: list, portfolio_state: dict) -> list:
    if not API_KEY:
        return [{"symbol": a["symbol"], "action": "HOLD", "quantity": 0,
                 "reason": "No API key", "strategy": "none", "confidence": 0} for a in assets]
    try:
        client = Client(api_key=API_KEY)
        prompt = build_batch_prompt(assets, portfolio_state)
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt
        )
        text = response.text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        decisions = json.loads(text.strip())
        print(f"[GEMINI] Batch decision received for {len(decisions)} symbols")
        return decisions
    except Exception as e:
        print(f"[GEMINI BATCH ERROR] {e}")
        return [{"symbol": a["symbol"], "action": "HOLD", "quantity": 0,
                 "reason": f"Gemini error: {str(e)[:80]}", "strategy": "error", "confidence": 0}
                for a in assets]
