import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Radio, Wallet, History, Cpu } from "lucide-react";
import PriceCard    from "./components/PriceCard";
import SignalPanel  from "./components/SignalPanel";
import Portfolio    from "./components/Portfolio";
import TradeLog     from "./components/TradeLog";
import ModelStatus  from "./components/ModelStatus";

const NAV = [
  { id: "prices",    label: "Prices",     icon: TrendingUp },
  { id: "signals",   label: "Signals",    icon: Radio      },
  { id: "portfolio", label: "Portfolio",  icon: Wallet     },
  { id: "trades",    label: "Trade Log",  icon: History    },
  { id: "model",     label: "LSTM Model", icon: Cpu        },
];

export default function App() {
  const [page, setPage]       = useState("prices");
  const [data, setData]       = useState(null);
  const [wsStatus, setStatus] = useState("connecting");

  useEffect(() => {
    let ws, timer;
    function connect() {
      setStatus("connecting");
      const wsUrl = window.location.hostname === 'localhost'
      ? 'ws://localhost:8000/ws'
      : 'wss://traderai-backend.up.railway.app/ws';
      const ws = new WebSocket(wsUrl);
      ws.onopen    = () => setStatus("connected");
      ws.onclose   = () => { setStatus("disconnected"); timer = setTimeout(connect, 3000); };
      ws.onerror   = () => ws.close();
      ws.onmessage = (e) => { try { setData(JSON.parse(e.data)); } catch {} };
    }
    connect();
    return () => { clearTimeout(timer); ws?.close(); };
  }, []);

  function renderPage() {
    if (!data) return (
      <div className="flex items-center justify-center h-64 text-muted">
        {wsStatus === "connecting" ? "Connecting to server..." : "Waiting for data..."}
      </div>
    );
    switch (page) {
      case "prices":    return <PriceCard   prices={data.prices}    signals={data.signals} />;
      case "signals":   return <SignalPanel  signals={data.signals}  prices={data.prices}  />;
      case "portfolio": return <Portfolio    portfolio={data.portfolio} />;
      case "trades":    return <TradeLog     trades={data.trades}   />;
      case "model":     return <ModelStatus  model={data.model_status} />;
      default:          return null;
    }
  }

  return (
    <div className="flex h-screen bg-dark">
      {/* Sidebar */}
      <aside className="w-56 bg-card border-r border-gray-800 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-800">
          <BarChart3 className="text-primary" size={22} />
          <span className="font-bold text-lg tracking-tight">TraderAI</span>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id;
            return (
              <button key={id} onClick={() => setPage(id)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors
                  ${active
                    ? "text-primary bg-primary/10 border-r-2 border-primary"
                    : "text-muted hover:text-white hover:bg-white/5"}`}>
                <Icon size={17} />{label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-3 border-t border-gray-800 flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${wsStatus === "connected" ? "bg-primary" : "bg-yellow-500"}`} />
          <span className="text-muted">{wsStatus === "connected" ? "Live" : "Connecting..."}</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">{renderPage()}</div>
      </main>
    </div>
  );
}