import { useState } from "react";
import { Activity, TrendingUp, TrendingDown, Minus, BarChart4, Zap } from "lucide-react";

const PRED_COLOR = {
  BUY:  "text-green-400 bg-green-400/10",
  SELL: "text-red-400 bg-red-400/10",
  HOLD: "text-yellow-400 bg-yellow-400/10",
};

const PRED_ICON = {
  BUY:  <TrendingUp size={13}/>,
  SELL: <TrendingDown size={13}/>,
  HOLD: <Minus size={13}/>,
};

export default function SignalPanel({ signals = {}, prices = {} }) {
  const symbols = Object.keys(signals);
  const [sel, setSel] = useState(symbols[0] || "");
  if (!symbols.length) return <div className="text-muted text-center py-12">No signal data yet.</div>;

  const sig   = signals[sel] || {};
  const price = prices[sel]?.price || sig.price || 0;
  const score = sig.score || 0;
  const isINR = prices[sel]?.market === "indian";

  const scoreLabel = score >= 5 ? "STRONG BUY" : score >= 2 ? "BUY"
                   : score <= -5 ? "STRONG SELL" : score <= -2 ? "SELL" : "HOLD";
  const scoreColor = score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-yellow-400";
  const scoreBg    = score > 0 ? "bg-green-400/10" : score < 0 ? "bg-red-400/10" : "bg-yellow-400/10";

  const rsi = sig.rsi ?? "--";
  const rsiColor = typeof rsi === "number"
    ? rsi < 30 ? "text-green-400" : rsi > 70 ? "text-red-400" : "text-yellow-400"
    : "text-white";

  // Kronos predictions
  const p15  = sig.pred_15m  || "HOLD";
  const p30  = sig.pred_30m  || "HOLD";
  const p1h  = sig.pred_1h   || "HOLD";
  const conf = sig.pred_conf != null ? `${(sig.pred_conf * 100).toFixed(0)}%` : "--";
  const src  = sig.pred_source || "fallback";
  const c15  = sig.pred_close_15m;
  const c1h  = sig.pred_close_1h;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-xl font-semibold">Signal Analysis</h2>
        <select value={sel} onChange={e => setSel(e.target.value)}
          className="bg-card border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary">
          {symbols.map(s => (
            <option key={s} value={s}>
              {s.replace("USDT","").replace(".NS","").replace("^","")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Score */}
        <div className="bg-card rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <BarChart4 size={17} className="text-primary"/>Score & Direction
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${scoreBg} ${scoreColor}`}>
            {score > 0 ? <TrendingUp size={15}/> : score < 0 ? <TrendingDown size={15}/> : <Minus size={15}/>}
            {scoreLabel} ({score > 0 ? `+${score}` : score})
          </div>
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Price</span>
              <span>{isINR?"₹":"$"}{typeof price==="number" ? price.toFixed(2) : "--"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">EMA 9 / 21</span>
              <span>{sig.ema9?.toFixed(2) ?? "--"} / {sig.ema21?.toFixed(2) ?? "--"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">BB Upper / Lower</span>
              <span>{sig.bb_upper?.toFixed(2) ?? "--"} / {sig.bb_lower?.toFixed(2) ?? "--"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">VWAP</span>
              <span>{sig.vwap?.toFixed(2) ?? "--"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Supertrend</span>
              <span className={sig.supertrend==="UP" ? "text-green-400" : "text-red-400"}>
                {sig.supertrend ?? "--"}
              </span>
            </div>
          </div>
        </div>

        {/* RSI */}
        <div className="bg-card rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <Activity size={17} className="text-primary"/>RSI (15m)
          </div>
          <div className={`text-3xl font-bold ${rsiColor}`}>{rsi}</div>
          <div className="text-xs text-muted mt-1">
            {typeof rsi==="number" ? rsi<30?"Oversold" : rsi>70?"Overbought" : "Neutral" : "--"}
          </div>
          <div className="mt-4 w-full bg-gray-800 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all"
              style={{
                width: `${typeof rsi==="number" ? rsi : 50}%`,
                background: typeof rsi==="number" ? rsi<30?"#22c55e":rsi>70?"#ef4444":"#eab308" : "#555"
              }}/>
          </div>
          <div className="mt-4 space-y-1 text-xs text-muted">
            {(sig.reasons||[]).slice(0,5).map((r,i)=>(
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"/>
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* ── Kronos Trend Forecast ── NEW BLOCK ── */}
        <div className="bg-card rounded-xl p-5 border border-gray-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap size={17} className="text-primary"/>Kronos AI Trend Forecast
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded
              ${src === "kronos"
                ? "text-green-400 bg-green-400/10"
                : "text-yellow-400 bg-yellow-400/10"}`}>
              {src === "kronos" ? "KRONOS ACTIVE" : "SIGNAL ONLY"}
            </span>
          </div>

          {/* 3 horizon pills */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[["15 min", p15], ["30 min", p30], ["1 hour", p1h]].map(([label, pred]) => (
              <div key={label} className="bg-dark rounded-lg p-3 text-center border border-gray-800">
                <div className="text-xs text-muted mb-2">{label}</div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold
                  ${PRED_COLOR[pred] || PRED_COLOR.HOLD}`}>
                  {PRED_ICON[pred] || PRED_ICON.HOLD}
                  {pred}
                </div>
              </div>
            ))}
          </div>

          {/* meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted">Confidence</span>
              <span className="font-mono font-semibold">{conf}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted">Pred. close +15m</span>
              <span className="font-mono">
                {c15 != null ? `${isINR?"₹":"$"}${Number(c15).toFixed(2)}` : "--"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted">Pred. close +1h</span>
              <span className="font-mono">
                {c1h != null ? `${isINR?"₹":"$"}${Number(c1h).toFixed(2)}` : "--"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted">Model</span>
              <span className="font-mono text-[10px]">Kronos-mini</span>
            </div>
          </div>
        </div>

        {/* S/R */}
        <div className="bg-card rounded-xl p-5 border border-gray-800 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
            <BarChart4 size={17} className="text-primary"/>Support / Resistance
          </div>
          {(sig.sr_levels||[]).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sig.sr_levels.map((lvl,i) => (
                <span key={i} className={`px-3 py-1 rounded-lg text-xs font-mono
                  ${typeof price==="number" && lvl > price
                    ? "bg-red-400/10 text-red-400"
                    : "bg-green-400/10 text-green-400"}`}>
                  {isINR?"₹":"$"}{lvl.toFixed(2)}
                  <span className="ml-1 opacity-60 text-[10px]">
                    {typeof price==="number" ? lvl>price?"R":"S" : ""}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-muted text-sm">No levels detected</div>
          )}
        </div>

      </div>
    </div>
  );
}