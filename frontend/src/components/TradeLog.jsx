import { Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function TradeLog({ trades = [] }) {
  if (!trades.length) return (
    <div className="text-muted text-center py-12">
      <Clock size={40} className="mx-auto mb-3 opacity-30"/>No trades yet
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-semibold mb-5">Trade History</h2>
      <div className="bg-card rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs border-b border-gray-800 bg-dark/50">
                {["Time","Symbol","Market","Side","Price","Score","Conf","15m","30m","1h"].map(h => (
                  <th key={h} className={`py-3 px-3 ${h==="Time"||h==="Symbol"||h==="Market"||h==="Side" ? "text-left":"text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} className="border-b border-gray-800/40 hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 text-muted text-[11px] whitespace-nowrap">{t.time||"--"}</td>
                  <td className="py-2.5 px-3 font-medium">
                    {(t.symbol||"").replace("USDT","").replace(".NS","").replace("^","")}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted capitalize">{t.market}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded
                      ${t.side==="BUY" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                      {t.side==="BUY" ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
                      {t.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {t.market==="indian"?"₹":"$"}{typeof t.price==="number" ? t.price.toFixed(2) : "--"}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded
                      ${t.score>0 ? "text-green-400 bg-green-400/10"
                        : t.score<0 ? "text-red-400 bg-red-400/10"
                        : "text-yellow-400 bg-yellow-400/10"}`}>
                      {t.score!=null ? (t.score>0?`+${t.score}`:t.score) : "--"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono">
                    {t.confidence!=null ? `${(t.confidence*100).toFixed(0)}%` : "--"}
                  </td>
                  {["pred_15m","pred_30m","pred_1h"].map(k => (
                    <td key={k} className="py-2.5 px-3 text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                        ${t[k]==="BUY" ? "text-green-400 bg-green-400/10"
                          : t[k]==="SELL" ? "text-red-400 bg-red-400/10"
                          : "text-yellow-400 bg-yellow-400/10"}`}>
                        {t[k]||"--"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}