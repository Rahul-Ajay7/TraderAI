import { Cpu, CheckCircle, XCircle, Zap } from "lucide-react";

export default function ModelStatus({ model = {} }) {
  const ready   = model.ready ?? false;
  const type    = model.type  ?? "Kronos-mini";
  const params  = model.params ?? "4.1M";
  const context = model.context ?? 2048;
  const source  = model.source ?? "NeoQuasar/Kronos-mini";

  return (
    <div>
      <h2 className="text-xl font-semibold mb-5">AI Model</h2>

      <div className="bg-card rounded-xl p-6 border border-gray-800 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <Cpu size={22} className="text-primary"/>
          <div>
            <div className="font-bold text-lg">{type}</div>
            <div className="text-xs text-muted">{source}</div>
          </div>
          <div className="ml-auto">
            {ready ? (
              <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                <CheckCircle size={16}/>Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium">
                <XCircle size={16}/>Loading...
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            ["Parameters", params],
            ["Context Window", `${context} candles`],
            ["Trained On", "45 exchanges"],
          ].map(([label, val]) => (
            <div key={label} className="bg-dark rounded-lg p-3">
              <div className="text-xs text-muted mb-1">{label}</div>
              <div className="font-semibold text-sm">{val}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm">
          {[
            ["Prediction",  "UP / DOWN / SIDE for 15min · 30min · 1hr"],
            ["Input",       "OHLCV candles (open, high, low, close, volume)"],
            ["Training",    "None needed — pre-trained foundation model"],
            ["Works for",   "Crypto + Indian stocks + Indices"],
            ["Device",      "CPU (no GPU needed)"],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-muted w-24 shrink-0">{label}</span>
              <span className="text-white">{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 border border-gray-800 text-sm">
        <div className="flex items-center gap-2 mb-3 font-semibold">
          <Zap size={15} className="text-primary"/>How it works
        </div>
        <div className="space-y-1.5 text-muted text-xs leading-relaxed">
          <div>1. Takes last 500 × 15m candles as input</div>
          <div>2. Kronos predicts full OHLCV for next 4 candles (1hr)</div>
          <div>3. Compares predicted close vs current price</div>
          <div>4. Combined with signal score (60/40 weight) → BUY/SELL/HOLD</div>
          <div>5. No retraining needed — model improves with more exchanges added</div>
        </div>
      </div>
    </div>
  );
}