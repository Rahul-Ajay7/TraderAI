import { Bot, Clock, TrendingUp } from 'lucide-react'

const ALL_ASSETS = [
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'WIPRO.NS',
  'BTC', 'ETH', 'SOL', 'DOGE'
]

function extractAction(response) {
  if (!response) return 'HOLD'
  const upper = response.toUpperCase()
  if (upper.includes('"BUY"') || upper.startsWith('BUY')) return 'BUY'
  if (upper.includes('"SELL"') || upper.startsWith('SELL')) return 'SELL'
  return 'HOLD'
}

function ActionBadge({ response }) {
  const action = extractAction(response)
  return <span className={`action-badge action-${action.toLowerCase()}`}>{action}</span>
}

export default function AILog({ data }) {
  const { logs, prices } = data

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>AI Log</h1>
          <p className="page-subtitle">Gemini 1.5 Flash decisions</p>
        </div>
        <div className="ai-live-badge">
          <span className="pulse-dot"></span>
          Agent Active
        </div>
      </div>

      {/* Agent Info */}
      <div className="card info-cards-grid">
        {[
          { label: 'Model', value: 'gemini-2.0-flash-lite' },
          { label: 'Schedule', value: 'Every 5 minutes' },
          { label: 'Max Trade', value: '20% of portfolio' },
          { label: 'Stop Loss', value: '-5%' },
          { label: 'Take Profit', value: '+8%' },
        ].map(item => (
          <div key={item.label} className="info-chip">
            <div className="info-chip-label">{item.label}</div>
            <div className="info-chip-value">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Monitored Assets */}
      <div className="card">
        <div className="card-header">
          <TrendingUp size={18} />
          <h2>Monitored Assets</h2>
        </div>
        <div className="assets-grid">
          {ALL_ASSETS.map(symbol => {
            const isCrypto = !symbol.includes('.NS')
            const priceData = prices[symbol] || {}
            const change = priceData.change_percent ?? 0
            const isUp = change >= 0
            const currency = isCrypto ? '$' : '₹'
            const price = priceData.price
            return (
              <div key={symbol} className="asset-chip">
                <span className="asset-symbol">{symbol}</span>
                <span className="asset-price">
                  {price ? `${currency}${price < 1 ? price.toFixed(4) : price.toFixed(2)}` : 'N/A'}
                </span>
                <span className={isUp ? 'positive' : 'negative'}>
                  {isUp ? '▲' : '▼'}{Math.abs(change).toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Decision Logs */}
      <div className="card">
        <div className="card-header">
          <Bot size={18} />
          <h2>AI Decision Logs</h2>
          <span className="log-count">{logs?.length || 0} entries</span>
        </div>
        {logs && logs.length > 0 ? (
          <div className="logs-list">
            {logs.map(log => (
              <div key={log.id} className="log-card">
                <div className="log-header">
                  <div className="log-meta">
                    <ActionBadge response={log.response} />
                    <span className="log-symbol">{log.symbol}</span>
                    <Clock size={12} />
                    <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div className="log-body">
                  <div className="log-section">
                    <div className="log-section-label">Gemini Response</div>
                    <pre className="log-pre">{log.response}</pre>
                  </div>
                  {log.prompt && (
                    <details className="log-prompt-details">
                      <summary>View Prompt</summary>
                      <pre className="log-pre log-pre-sm">{log.prompt}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Bot size={32} opacity={0.3} />
            <p>No logs yet — first cycle runs in ~5 minutes</p>
          </div>
        )}
      </div>
    </div>
  )
}
