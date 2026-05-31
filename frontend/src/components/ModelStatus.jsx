import { useState } from "react";
import { Cpu, Play, CheckCircle, XCircle, Loader } from "lucide-react";

function ModelCard({ title, model = {}, trainUrl }) {
  const [training, setTraining] = useState(false);

  async function handleTrain() {
    setTraining(true);
    try {
      await fetch(`http://localhost:8000${trainUrl}`, { method: "POST" });
    } catch {}
    setTimeout(() => setTraining(false), 2000);
  }

  return (
    <div className="bg-card rounded-xl p-5 border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Cpu size={17} className="text-primary"/>
        <span className="font-semibold text-sm">{title}</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {model.trained ? (
          <><CheckCircle size={16} className="text-green-400"/><span className="text-green-400 text-sm font-medium">Trained ✓</span></>
        ) : (
          <><XCircle size={16} className="text-yellow-400"/><span className="text-yellow-400 text-sm font-medium">Not trained</span></>
        )}
      </div>

      {model.last_trained && (
        <div className="text-xs text-muted mb-4">Last: {model.last_trained}</div>
      )}

      <button onClick={handleTrain} disabled={training}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
          ${training ? "bg-primary/40 text-white/40 cursor-not-allowed" : "bg-primary text-black hover:bg-primary-dark"}`}>
        {training ? <Loader size={14} className="animate-spin"/> : <Play size={14}/>}
        {training ? "Training..." : "Train Now"}
      </button>
    </div>
  );
}

export default function ModelStatus({ model = {} }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-5">LSTM Models</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ModelCard
          title="Crypto Model (BTC/ETH/BNB/SOL/XRP)"
          model={model.crypto || {}}
          trainUrl="/api/train/crypto"
        />
        <ModelCard
          title="Indian Model (NSE + Nifty + Sensex)"
          model={model.indian || {}}
          trainUrl="/api/train/indian"
        />
      </div>

      <div className="bg-card rounded-xl p-5 border border-gray-800 text-sm text-muted space-y-2">
        <div className="font-semibold text-white mb-2">How to train manually:</div>
        <div><code className="text-primary bg-dark px-2 py-0.5 rounded">python model/lstm_crypto.py train</code></div>
        <div><code className="text-primary bg-dark px-2 py-0.5 rounded">python model/lstm_indian.py train</code></div>
        <div className="pt-2">Each model predicts: <span className="text-white">UP / DOWN / SIDE</span> for next <span className="text-white">15min · 30min · 1hr</span></div>
        <div>Minimum data: <span className="text-white">500 candles crypto · 300 candles per Indian stock</span></div>
      </div>
    </div>
  );
}