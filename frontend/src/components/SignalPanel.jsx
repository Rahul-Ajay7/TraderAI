import { useState } from "react";
import { Activity, TrendingUp, TrendingDown, Minus, BarChart4, Zap, Layers } from "lucide-react";
import { Card, CardHeader, PageHeader, Badge, toneFor, cleanSym, money } from "./ui";

const PRED_ICON = {
  BUY:  <TrendingUp size={12} />,
  SELL: <TrendingDown size={12} />,
  HOLD: <Minus size={12} />,
};

function Row({ label, value, valueClass = "" }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-line/50 last:border-0">
      <span className="text-[12px] text-muted">{label}</span>
      <span className={`text-[12px] font-medium tnum ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function SignalPanel({ signals = {}, prices = {} }) {
  const symbols = Object.keys(signals);
  const [sel, setSel] = useState(symbols[0] || "");
  if (!symbols.length) return (
    <div className="text-faint text-center py-16 text-[13px]">No signal data yet.</div>
  );

  const sig   = signals[sel] || {};
  const price = prices[sel]?.price || sig.price || 0;
  const score = sig.score || 0;
  const isINR = prices[sel]?.market === "indian";

  const scoreLabel = score >= 5 ? "STRONG BUY" : score >= 2 ? "BUY"
                   : score <= -5 ? "STRONG SELL" : score <= -2 ? "SELL" : "HOLD";
  const scoreTone  = score > 0 ? "up" : score < 0 ? "down" : "warn";

  const rsi = sig.rsi ?? null;
  const rsiTone = rsi == null ? "text-ink"
                : rsi < 30 ? "text-up" : rsi > 70 ? "text-down" : "text-ink";

  const p15  = sig.pred_15m || "HOLD";
  const p30  = sig.pred_30m || "HOLD";
  const p1h  = sig.pred_1h  || "HOLD";
  const conf = sig.pred_conf != null ? `${(sig.pred_conf * 100).toFixed(0)}%` : "--";
  const src  = sig.pred_source || "fallback";
  const c15  = sig.pred_close_15m;
  const c1h  = sig.pred_close_1h;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Signal Analysis" subtitle="Indicator breakdown and Kronos forecast per symbol" />
        <select value={sel} onChange={e => setSel(e.target.value)}
          className="bg-panel border border-line rounded-md px-3 py-2 text-[13px]
                     text-ink outline-none hover:border-line2 cursor-pointer -mt-6">
          {symbols.map(s => <option key={s} value={s}>{cleanSym(s)}</option>)}
        </select>
      </div>

      {/* Verdict strip */}
      <Card className="px-5 py-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Badge tone={scoreTone} className="!text-[12px] !px-3 !py-1">
            {score > 0 ? <TrendingUp size={13} /> : score < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
            {scoreLabel}
          </Badge>
          <span className="text-[13px] text-muted">
            Score <span className="text-ink font-semibold tnum">{score > 0 ? `+${score}` : score}</span>
          </span>
        </div>
        <div className="text-[15px] font-semibold tnum">{money(price, isINR)}</div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Indicators */}
        <Card>
          <CardHeader icon={BarChart4} title="Technical Indicators" />
          <div className="px-5 py-3">
            <Row label="EMA 9 / 21"
              value={`${sig.ema9?.toFixed(2) ?? "--"} / ${sig.ema21?.toFixed(2) ?? "--"}`} />
            <Row label="Bollinger upper / lower"
              value={`${sig.bb_upper?.toFixed(2) ?? "--"} / ${sig.bb_lower?.toFixed(2) ?? "--"}`} />
            <Row label="VWAP" value={sig.vwap?.toFixed(2) ?? "--"} />
            <Row label="Supertrend" value={sig.supertrend ?? "--"}
              valueClass={sig.supertrend === "UP" ? "text-up" : "text-down"} />
            <Row label="ATR %" value={sig.atr_pct != null ? `${(sig.atr_pct * 100).toFixed(2)}%` : "--"} />
          </div>
        </Card>

        {/* RSI */}
        <Card>
          <CardHeader icon={Activity} title="RSI · 15m" />
          <div className="px-5 py-4">
            <div className="flex items-baseline gap-3">
              <span className={`text-3xl font-semibold tnum ${rsiTone}`}>
                {rsi ?? "--"}
              </span>
              <span className="text-[12px] text-muted">
                {rsi == null ? "" : rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : "Neutral"}
              </span>
            </div>
            <div className="mt-4 relative w-full bg-inset rounded-full h-1.5 overflow-hidden">
              <div className="absolute inset-y-0 left-[30%] w-px bg-line2" />
              <div className="absolute inset-y-0 left-[70%] w-px bg-line2" />
              <div className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${rsi ?? 50}%`,
                  background: rsi == null ? "#5A6478" : rsi < 30 ? "#2EBD85" : rsi > 70 ? "#F6465D" : "#4C8DFF",
                }} />
            </div>
            {(sig.reasons || []).length > 0 && (
              <ul className="mt-5 space-y-1.5">
                {(sig.reasons || []).slice(0, 5).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-muted">
                    <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Kronos forecast */}
        <Card className="lg:col-span-2">
          <CardHeader icon={Zap} title="Kronos Forecast"
            right={
              <Badge tone={src === "kronos" ? "up" : "warn"}>
                {src === "kronos" ? "MODEL ACTIVE" : "SIGNAL ONLY"}
              </Badge>
            } />
          <div className="px-5 py-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[["15 min", p15], ["30 min", p30], ["1 hour", p1h]].map(([label, pred]) => (
                <div key={label}
                  className="bg-inset border border-line rounded-md py-3 text-center">
                  <div className="text-[11px] text-faint mb-1.5">{label}</div>
                  <Badge tone={toneFor(pred)}>
                    {PRED_ICON[pred] || PRED_ICON.HOLD}{pred}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
              {[
                ["Confidence", conf],
                ["Predicted close +15m", c15 != null ? money(Number(c15), isINR) : "--"],
                ["Predicted close +1h",  c1h != null ? money(Number(c1h), isINR) : "--"],
                ["Model", "Kronos-mini · 4.1M"],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-faint mb-0.5">{label}</div>
                  <div className="font-medium tnum text-ink">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Support / Resistance */}
        <Card className="lg:col-span-2">
          <CardHeader icon={Layers} title="Support / Resistance" />
          <div className="px-5 py-4">
            {(sig.sr_levels || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {sig.sr_levels.map((lvl, i) => {
                  const above = typeof price === "number" && lvl > price;
                  return (
                    <span key={i} className={`px-2.5 py-1 rounded-md text-[12px] font-medium tnum
                      border ${above
                        ? "border-down/30 text-down bg-down/5"
                        : "border-up/30 text-up bg-up/5"}`}>
                      {money(lvl, isINR)}
                      <span className="ml-1.5 opacity-60 text-[10px]">{above ? "R" : "S"}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="text-faint text-[13px]">No levels detected</div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
