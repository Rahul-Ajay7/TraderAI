import { useState, useEffect } from "react";
import { Target, Database, TrendingUp } from "lucide-react";
import { Card, CardHeader, PageHeader, Badge, Stat } from "./ui";
import { API_URL as API } from "../config";

export default function Accuracy() {
  const [acc, setAcc]       = useState(null);
  const [health, setHealth] = useState(null);
  const [err, setErr]       = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [a, h] = await Promise.all([
          fetch(`${API}/api/accuracy`).then(r => r.json()),
          fetch(`${API}/api/health`).then(r => r.json()),
        ]);
        if (alive) { setAcc(a); setHealth(h); setErr(null); }
      } catch (e) {
        if (alive) setErr(String(e));
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (err) return (
    <div>
      <PageHeader title="Accuracy" subtitle="Model hit-rates and realized trade results" />
      <div className="text-down text-[13px]">Failed to reach API: {err}</div>
    </div>
  );
  if (!acc || !health) return (
    <div className="flex items-center justify-center h-72 text-faint text-sm">Loading…</div>
  );

  const p = acc.predictions || {};
  const evaluated = p.evaluated || 0;
  const t = acc.trades || {};

  return (
    <div>
      <PageHeader title="Accuracy" subtitle="The honest scoreboard — model hit-rates and realized trade results" />

      {/* Kronos prediction accuracy */}
      <div className="text-[11px] uppercase tracking-wider text-faint font-medium mb-3">
        Kronos forecast accuracy
      </div>
      {evaluated > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <Stat label="Evaluated" value={evaluated} />
          <Stat label="Hit rate · 15m" value={`${(p.hit_rate_15m * 100).toFixed(1)}%`}
            tone={p.hit_rate_15m >= 0.5 ? "up" : "down"}
            sub="direction correct" />
          <Stat label="Hit rate · 1h" value={`${(p.hit_rate_1h * 100).toFixed(1)}%`}
            tone={p.hit_rate_1h >= 0.5 ? "up" : "down"}
            sub="direction correct" />
          <Stat label="MAE · 15m" value={`${p.mae_pct_15m}%`} sub="price error" />
          <Stat label="MAE · 1h" value={`${p.mae_pct_1h}%`} sub="price error" />
        </div>
      ) : (
        <Card className="px-5 py-6 mb-8 text-[13px] text-muted">
          No evaluated predictions yet. Kronos logs a forecast every cycle and
          scores it against the real close one hour later — check back soon.
        </Card>
      )}

      {/* Realized trades */}
      <div className="text-[11px] uppercase tracking-wider text-faint font-medium mb-3">
        Realized trades
      </div>
      {Object.keys(t).length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {Object.entries(t).map(([market, s]) => (
            <Card key={market}>
              <CardHeader icon={TrendingUp}
                title={market === "crypto" ? "Crypto" : "Indian equities"}
                right={
                  <Badge tone={s.realized_pnl >= 0 ? "up" : "down"}>
                    {s.realized_pnl >= 0 ? "+" : ""}{s.realized_pnl} P&L
                  </Badge>
                } />
              <div className="px-5 py-4 grid grid-cols-3 gap-4 text-[12px]">
                <div>
                  <div className="text-faint mb-0.5">Closed trades</div>
                  <div className="font-semibold tnum text-[15px]">{s.closed_trades}</div>
                </div>
                <div>
                  <div className="text-faint mb-0.5">Win rate</div>
                  <div className={`font-semibold tnum text-[15px]
                    ${s.win_rate >= 0.5 ? "text-up" : "text-down"}`}>
                    {(s.win_rate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-faint mb-0.5">Fees paid</div>
                  <div className="font-semibold tnum text-[15px]">{s.fees_paid}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="px-5 py-6 mb-8 text-[13px] text-muted">
          No closed trades yet — stats appear after the first SELL.
        </Card>
      )}

      {/* DB health */}
      <div className="text-[11px] uppercase tracking-wider text-faint font-medium mb-3">
        Database
      </div>
      <Card>
        <CardHeader icon={Database} title={`Engine: ${health.engine}`}
          right={
            <Badge tone={health.persistent ? "up" : "down"}>
              {health.persistent ? "PERSISTENT" : "EPHEMERAL"}
            </Badge>
          } />
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-4 text-[12px]">
            {Object.entries(health.counts || {}).map(([table, n]) => (
              <div key={table}>
                <div className="text-faint mb-0.5 capitalize">{table}</div>
                <div className="font-semibold tnum text-[15px]">
                  {n != null ? n.toLocaleString() : "--"}
                </div>
              </div>
            ))}
          </div>
          {health.warning && (
            <div className="mt-4 text-[12px] text-down">{health.warning}</div>
          )}
        </div>
      </Card>
    </div>
  );
}
