import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, PageHeader, Badge, toneFor, cleanSym, money } from "./ui";

const TREND_TONE = { UP: "up", DOWN: "down", SIDE: "neutral" };

function IndexStrip({ indices }) {
  const list = Object.values(indices || {});
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {list.map(ix => {
        const up = (ix.change_pct ?? 0) >= 0;
        return (
          <Card key={ix.name} className="flex items-center gap-4 px-4 py-2.5">
            <div>
              <div className="text-[11px] text-faint">{ix.name}</div>
              <div className="text-[15px] font-semibold tnum leading-tight">
                {(ix.price ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`flex items-center gap-0.5 text-[12px] font-medium tnum
                ${up ? "text-up" : "text-down"}`}>
                {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {Math.abs(ix.change_pct ?? 0).toFixed(2)}%
              </span>
              <Badge tone={TREND_TONE[ix.trend] || "neutral"}>{ix.trend}</Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function SymbolCard([sym, p], signals) {
  const sig    = signals[sym] || {};
  const score  = sig.score || 0;
  const dir    = (sig.direction || "HOLD").replace("_", " ");
  const change = p.change_pct || 0;
  const isUp   = change >= 0;
  const isINR  = p.market === "indian";

  return (
    <Card key={sym} className="p-4 hover:border-line2 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-[13px]">{cleanSym(sym)}</span>
        <Badge tone={score > 0 ? "up" : score < 0 ? "down" : "neutral"}>
          {score > 0 ? `+${score}` : score}
        </Badge>
      </div>

      <div className="text-lg font-semibold tnum leading-none mb-2">
        {money(p.price, isINR)}
      </div>

      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-0.5 text-[12px] font-medium tnum
          ${isUp ? "text-up" : "text-down"}`}>
          {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(change).toFixed(2)}%
        </span>
        <span className={`text-[11px] font-medium
          ${toneFor(sig.direction) === "up" ? "text-up"
            : toneFor(sig.direction) === "down" ? "text-down" : "text-faint"}`}>
          {dir}
        </span>
      </div>
    </Card>
  );
}

function Section({ title, items, signals }) {
  if (!items.length) return null;
  return (
    <div className="mb-8">
      <div className="text-[11px] uppercase tracking-wider text-faint font-medium mb-3">
        {title}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map(e => SymbolCard(e, signals))}
      </div>
    </div>
  );
}

export default function PriceCard({ prices = {}, signals = {}, indices = {} }) {
  const crypto = Object.entries(prices).filter(([, v]) => v.market === "crypto");
  const indian = Object.entries(prices).filter(([, v]) => v.market === "indian");

  return (
    <div>
      <PageHeader title="Markets" subtitle="Live prices with current signal score and direction" />
      <IndexStrip indices={indices} />
      <Section title="Crypto" items={crypto} signals={signals} />
      <Section title="Indian equities" items={indian} signals={signals} />
      {!crypto.length && !indian.length && (
        <div className="text-faint text-center py-16 text-[13px]">
          Waiting for first bot cycle…
        </div>
      )}
    </div>
  );
}
