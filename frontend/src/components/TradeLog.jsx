import { History } from "lucide-react";
import { Card, PageHeader, Badge, Empty, cleanSym, money } from "./ui";

const EXIT_LABEL = {
  STOP_LOSS:   "Stop loss",
  TAKE_PROFIT: "Take profit",
  TRAIL_STOP:  "Trail stop",
  SIGNAL:      "Signal",
  RESET:       "Reset",
};

export default function TradeLog({ trades = [] }) {
  if (!trades.length) return (
    <div>
      <PageHeader title="Trades" subtitle="Executed paper trades, newest first" />
      <Empty icon={History} text="No trades yet" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Trades" subtitle="Executed paper trades, newest first" />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="text-faint text-[11px] uppercase tracking-wider border-b border-line">
                <th className="text-left  font-medium py-3 px-4">Time</th>
                <th className="text-left  font-medium py-3 px-4">Symbol</th>
                <th className="text-left  font-medium py-3 px-4">Side</th>
                <th className="text-right font-medium py-3 px-4">Qty</th>
                <th className="text-right font-medium py-3 px-4">Price</th>
                <th className="text-right font-medium py-3 px-4">P&L</th>
                <th className="text-right font-medium py-3 px-4">Fee</th>
                <th className="text-left  font-medium py-3 px-4">Exit</th>
                <th className="text-right font-medium py-3 px-4">Score</th>
                <th className="text-right font-medium py-3 px-4">Conf</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => {
                const inr = t.market === "indian";
                return (
                  <tr key={i} className="border-b border-line/50 last:border-0 hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 text-faint text-[11px] tnum">{t.time || "--"}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium">{cleanSym(t.symbol)}</span>
                      <span className="ml-1.5 text-[10px] text-faint uppercase">{t.market}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge tone={t.side === "BUY" ? "up" : "down"}>{t.side}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right tnum text-muted text-[12px]">
                      {t.qty ?? "--"}
                    </td>
                    <td className="py-2.5 px-4 text-right tnum">
                      {money(t.price, inr)}
                    </td>
                    <td className={`py-2.5 px-4 text-right tnum font-medium
                      ${t.pnl == null ? "text-faint"
                        : t.pnl >= 0 ? "text-up" : "text-down"}`}>
                      {t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}${money(t.pnl, inr)}` : "--"}
                    </td>
                    <td className="py-2.5 px-4 text-right tnum text-muted text-[12px]">
                      {t.fee ? money(t.fee, inr) : "--"}
                    </td>
                    <td className="py-2.5 px-4 text-[12px] text-muted">
                      {EXIT_LABEL[t.exit_reason] || (t.exit_reason ?? "--")}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={`tnum text-[12px] font-medium
                        ${t.score > 0 ? "text-up" : t.score < 0 ? "text-down" : "text-faint"}`}>
                        {t.score != null ? (t.score > 0 ? `+${t.score}` : t.score) : "--"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right tnum text-[12px] text-muted">
                      {t.confidence != null ? `${(t.confidence * 100).toFixed(0)}%` : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
