import { useState, useEffect } from "react";
import { CandlestickChart, LayoutGrid, Radio, Wallet, History, Cpu, Target } from "lucide-react";
import PriceCard   from "./components/PriceCard";
import SignalPanel from "./components/SignalPanel";
import Portfolio   from "./components/Portfolio";
import TradeLog    from "./components/TradeLog";
import ModelStatus from "./components/ModelStatus";
import Accuracy    from "./components/Accuracy";
import { WS_URL }  from "./config";

const NAV = [
  { id: "prices",    label: "Markets",   icon: LayoutGrid },
  { id: "signals",   label: "Signals",   icon: Radio      },
  { id: "portfolio", label: "Portfolio", icon: Wallet     },
  { id: "trades",    label: "Trades",    icon: History    },
  { id: "accuracy",  label: "Accuracy",  icon: Target     },
  { id: "model",     label: "Model",     icon: Cpu        },
];

export default function App() {
  const [page, setPage]       = useState("prices");
  const [data, setData]       = useState(null);
  const [wsStatus, setStatus] = useState("connecting");

  useEffect(() => {
    let ws, timer, closed = false;
    function connect() {
      setStatus("connecting");
      ws = new WebSocket(WS_URL);
      ws.onopen    = () => setStatus("connected");
      ws.onclose   = () => {
        if (closed) return;
        setStatus("disconnected");
        timer = setTimeout(connect, 3000);
      };
      ws.onerror   = () => ws.close();
      ws.onmessage = (e) => { try { setData(JSON.parse(e.data)); } catch {} };
    }
    connect();
    return () => { closed = true; clearTimeout(timer); ws?.close(); };
  }, []);

  function renderPage() {
    // Accuracy fetches via REST — works even before the first WS frame
    if (page === "accuracy") return <Accuracy />;
    if (!data) return (
      <div className="flex items-center justify-center h-72 text-faint text-sm">
        {wsStatus === "connecting" ? "Connecting to server…" : "Waiting for data…"}
      </div>
    );
    switch (page) {
      case "prices":    return <PriceCard   prices={data.prices}    signals={data.signals} indices={data.indices} />;
      case "signals":   return <SignalPanel signals={data.signals}  prices={data.prices}  />;
      case "portfolio": return <Portfolio   portfolio={data.portfolio} />;
      case "trades":    return <TradeLog    trades={data.trades}    />;
      case "model":     return <ModelStatus model={data.model_status} />;
      default:          return null;
    }
  }

  const live = wsStatus === "connected";

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar */}
      <aside className="w-56 bg-panel border-r border-line flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-line">
          <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center">
            <CandlestickChart className="text-accent" size={16} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[14px] tracking-tight">TraderAI</div>
            <div className="text-[10px] text-faint">Paper trading</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id;
            return (
              <button key={id} onClick={() => setPage(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md
                  text-[13px] font-medium transition-colors
                  ${active
                    ? "text-ink bg-white/[0.06]"
                    : "text-muted hover:text-ink hover:bg-white/[0.03]"}`}>
                <Icon size={16} className={active ? "text-accent" : ""} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-line flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-up" : "bg-warn animate-pulse"}`} />
          <span className="text-[11px] text-muted">
            {live ? "Live feed" : "Reconnecting…"}
          </span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{renderPage()}</div>
      </main>
    </div>
  );
}
