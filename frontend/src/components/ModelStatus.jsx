import { Cpu, Workflow } from "lucide-react";
import { Card, CardHeader, PageHeader, Badge } from "./ui";

export default function ModelStatus({ model = {} }) {
  const ready   = model.ready ?? false;
  const type    = model.type ?? "Kronos-mini";
  const params  = model.params ?? "4.1M";
  const context = model.context ?? 2048;
  const source  = model.source ?? "NeoQuasar/Kronos-mini";

  return (
    <div>
      <PageHeader title="Model" subtitle="Forecasting engine behind the trade decisions" />

      <Card className="mb-4">
        <CardHeader icon={Cpu} title={type}
          right={<Badge tone={ready ? "up" : "warn"}>{ready ? "LIVE" : "LOADING"}</Badge>} />
        <div className="px-5 py-4">
          <div className="text-[12px] text-muted mb-4 font-mono">{source}</div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              ["Parameters", params],
              ["Context window", `${context} candles`],
              ["Training data", "45 exchanges"],
            ].map(([label, val]) => (
              <div key={label} className="bg-inset border border-line rounded-md px-4 py-3">
                <div className="text-[11px] text-faint mb-1">{label}</div>
                <div className="text-[13px] font-semibold tnum">{val}</div>
              </div>
            ))}
          </div>

          <div className="divide-y divide-line/50">
            {[
              ["Prediction", "Direction for 15 min · 30 min · 1 hr horizons"],
              ["Input", "OHLCV candles (open, high, low, close, volume)"],
              ["Training", "None — pre-trained foundation model"],
              ["Coverage", "Crypto, Indian equities, indices"],
              ["Device", "CPU — no GPU required"],
            ].map(([label, val]) => (
              <div key={label} className="flex py-2 text-[13px]">
                <span className="text-faint w-28 shrink-0">{label}</span>
                <span className="text-ink">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Workflow} title="Decision pipeline" />
        <div className="px-5 py-4 space-y-2">
          {[
            "Last 500 × 15-minute candles fed to the model each cycle",
            "Kronos predicts full OHLCV for the next 4 candles (1 hour)",
            "Predicted close compared against current price per horizon",
            "Blended with indicator score — 60% signals, 40% Kronos",
            "Stop-loss, take-profit and trailing stop manage every position",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-[13px] text-muted">
              <span className="w-5 h-5 rounded-full bg-inset border border-line text-faint
                               text-[11px] flex items-center justify-center shrink-0 tnum">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
