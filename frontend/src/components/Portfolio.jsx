import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { LineChart as LineIcon, Briefcase } from "lucide-react";
import { Card, CardHeader, PageHeader, Stat, cleanSym, money } from "./ui";

function PortfolioSection({ title, data = {}, inr }) {
  const [chart, setChart] = useState([]);
  useEffect(() => {
    if (data.pnl !== undefined) {
      setChart(prev => [...prev, {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        pnl: data.pnl,
      }].slice(-60));
    }
  }, [data.pnl]);

  const pnl      = data.pnl ?? 0;
  const balance  = data.balance ?? 0;
  const total    = data.total_value ?? balance;
  const holdings = data.holdings ?? [];
  const pnlPct   = total - pnl !== 0 ? (pnl / (total - pnl)) * 100 : 0;
  const stroke   = pnl >= 0 ? "#2EBD85" : "#F6465D";

  return (
    <div className="mb-10">
      <div className="text-[11px] uppercase tracking-wider text-faint font-medium mb-3">
        {title}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Cash" value={money(balance, inr)} />
        <Stat label="Total value" value={money(total, inr)} />
        <Stat label="Unrealized P&L"
          value={`${pnl >= 0 ? "+" : ""}${money(pnl, inr)}`}
          tone={pnl >= 0 ? "up" : "down"}
          sub={`${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% vs cost basis`} />
      </div>

      {chart.length > 1 && (
        <Card className="mb-4">
          <CardHeader icon={LineIcon} title="P&L — this session" />
          <div className="px-3 py-3">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: "#5A6478", fontSize: 10 }}
                  axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis tick={{ fill: "#5A6478", fontSize: 10 }}
                  axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{
                  background: "#11141B", border: "1px solid #1E2430",
                  borderRadius: 8, fontSize: 12, color: "#E8ECF3",
                }} />
                <Area type="monotone" dataKey="pnl" stroke={stroke}
                  fill={`url(#grad-${title})`} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader icon={Briefcase} title={`Open positions (${holdings.length})`} />
        {holdings.length > 0 ? (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-faint text-[11px] uppercase tracking-wider">
                <th className="text-left  font-medium py-2.5 px-5">Symbol</th>
                <th className="text-right font-medium py-2.5 px-5">Qty</th>
                <th className="text-right font-medium py-2.5 px-5">Entry</th>
                <th className="text-right font-medium py-2.5 px-5">Price</th>
                <th className="text-right font-medium py-2.5 px-5">Unreal. P&L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => (
                <tr key={h.symbol} className="border-t border-line/60">
                  <td className="py-2.5 px-5 font-medium">{cleanSym(h.symbol)}</td>
                  <td className="py-2.5 px-5 text-right tnum text-muted">{h.qty}</td>
                  <td className="py-2.5 px-5 text-right tnum">{money(h.entry, inr)}</td>
                  <td className="py-2.5 px-5 text-right tnum">
                    {h.price != null ? money(h.price, inr) : "--"}
                  </td>
                  <td className={`py-2.5 px-5 text-right tnum font-medium
                    ${h.pnl == null ? "text-faint" : h.pnl >= 0 ? "text-up" : "text-down"}`}>
                    {h.pnl != null ? `${h.pnl >= 0 ? "+" : ""}${money(h.pnl, inr)}` : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-6 text-faint text-[13px]">No open positions</div>
        )}
      </Card>
    </div>
  );
}

export default function Portfolio({ portfolio = {} }) {
  return (
    <div>
      <PageHeader title="Portfolio" subtitle="Paper balances, session P&L and open positions" />
      <PortfolioSection title="Crypto · USDT" data={portfolio.crypto} inr={false} />
      <PortfolioSection title="Indian equities · INR" data={portfolio.indian} inr={true} />
    </div>
  );
}
