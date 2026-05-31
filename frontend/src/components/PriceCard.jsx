import { TrendingUp, TrendingDown } from "lucide-react";

const DIR_COLOR = {
  STRONG_BUY:  "text-green-400",
  BUY:         "text-green-400",
  HOLD:        "text-yellow-400",
  SELL:        "text-red-400",
  STRONG_SELL: "text-red-400",
};

export default function PriceCard({ prices = {}, signals = {} }) {
  const crypto = Object.entries(prices).filter(([,v]) => v.market === "crypto");
  const indian = Object.entries(prices).filter(([,v]) => v.market === "indian");

  function Card([sym, p]) {
    const sig    = signals[sym] || {};
    const score  = sig.score || 0;
    const dir    = sig.direction || "HOLD";
    const change = p.change_pct || 0;
    const isUp   = change >= 0;
    const isINR  = p.market === "indian";
    const scoreColor = score > 0 ? "text-green-400 bg-green-400/10"
                     : score < 0 ? "text-red-400 bg-red-400/10"
                     : "text-yellow-400 bg-yellow-400/10";
    return (
      <div key={sym} className="bg-card rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-sm">
            {sym.replace("USDT","").replace(".NS","").replace("^","")}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${scoreColor}`}>
            {score > 0 ? `+${score}` : score}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xl font-bold">
            {isINR ? "₹" : "$"}{(p.price || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
          </span>
          <span className={`flex items-center gap-0.5 text-sm ${isUp ? "text-green-400":"text-red-400"}`}>
            {isUp ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
            {Math.abs(change).toFixed(2)}%
          </span>
        </div>
        <span className={`text-xs font-medium ${DIR_COLOR[dir] || "text-yellow-400"}`}>
          {dir.replace("_"," ")}
        </span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Market Prices</h2>
      {crypto.length > 0 && (
        <>
          <h3 className="text-sm text-muted mb-3 uppercase tracking-wider">Crypto</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {crypto.map(Card)}
          </div>
        </>
      )}
      {indian.length > 0 && (
        <>
          <h3 className="text-sm text-muted mb-3 uppercase tracking-wider">Indian Stocks</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {indian.map(Card)}
          </div>
        </>
      )}
      {!crypto.length && !indian.length && (
        <div className="text-muted text-center py-12">Waiting for bot cycle...</div>
      )}
    </div>
  );
}