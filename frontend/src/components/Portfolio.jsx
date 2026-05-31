import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

function PortfolioSection({ title, data = {}, currency, symbol }) {
  const [chart, setChart] = useState([]);
  useEffect(() => {
    if (data.pnl !== undefined) {
      setChart(prev => [...prev, {
        time: new Date().toLocaleTimeString(), pnl: data.pnl
      }].slice(-50));
    }
  }, [data.pnl]);

  const pnl      = data.pnl ?? 0;
  const balance  = data.balance ?? 0;
  const total    = data.total_value ?? balance;
  const holdings = data.holdings ?? [];

  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold mb-3 text-primary">{title}</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ["Cash", `${symbol}${balance.toFixed(2)} ${currency}`],
          ["Total Value", `${symbol}${total.toFixed(2)} ${currency}`],
          ["P&L", `${pnl>=0?"+":""}${symbol}${pnl.toFixed(2)} ${currency}`],
        ].map(([label, val]) => (
          <div key={label} className="bg-card rounded-xl p-4 border border-gray-800">
            <div className="text-xs text-muted mb-1 flex items-center gap-1">
              <Wallet size={13}/>{label}
            </div>
            <div className={`text-lg font-bold ${label==="P&L" ? pnl>=0?"text-green-400":"text-red-400" : ""}`}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {chart.length > 1 && (
        <div className="bg-card rounded-xl p-4 border border-gray-800 mb-4">
          <div className="text-xs text-muted mb-3">P&L History</div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id={`grad-${currency}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00B386" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#00B386" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{fill:"#8892A4",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#8892A4",fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"#1A1A2E",border:"1px solid #2a2a3e",borderRadius:8,fontSize:11}}/>
              <Area type="monotone" dataKey="pnl" stroke="#00B386" fill={`url(#grad-${currency})`} strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {holdings.length > 0 ? (
        <div className="bg-card rounded-xl p-4 border border-gray-800">
          <div className="text-xs text-muted mb-3">Open Positions</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs border-b border-gray-800">
                <th className="text-left py-2 pr-4">Symbol</th>
                <th className="text-right py-2 pr-4">Qty</th>
                <th className="text-right py-2">Entry</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => (
                <tr key={h.symbol} className="border-b border-gray-800/40">
                  <td className="py-2 pr-4 font-medium">
                    {h.symbol.replace("USDT","").replace(".NS","").replace("^","")}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">{h.qty}</td>
                  <td className="py-2 text-right">{symbol}{h.entry?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-muted text-sm">No open positions</div>
      )}
    </div>
  );
}

export default function Portfolio({ portfolio = {} }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-5">Portfolio</h2>
      <PortfolioSection title="Crypto Portfolio" data={portfolio.crypto} currency="USDT" symbol="$"/>
      <PortfolioSection title="Indian Portfolio" data={portfolio.indian} currency="INR" symbol="₹"/>
    </div>
  );
}