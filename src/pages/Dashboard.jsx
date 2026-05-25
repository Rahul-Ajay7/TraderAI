import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react'

const INITIAL_CAPITAL = 10000

const STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance', flag: '🏭' },
  { symbol: 'TCS.NS', name: 'TCS', flag: '💻' },
  { symbol: 'INFY.NS', name: 'Infosys', flag: '🖥️' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', flag: '🏦' },
  { symbol: 'WIPRO.NS', name: 'Wipro', flag: '⚙️' },
]

const CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', flag: '₿' },
  { symbol: 'ETH', name: 'Ethereum', flag: '⬡' },
  { symbol: 'SOL', name: 'Solana', flag: '◎' },
  { symbol: 'DOGE', name: 'Dogecoin', flag: '🐕' },
]

function PriceCard({ item, priceData, isCrypto }) {
  const price = priceData?.price
  const change = priceData?.change_percent ?? 0
  const isUp = change >= 0
  const currency = isCrypto ? '$' : '₹'

  return (
    <div className={`market-card ${isUp ? 'card-up' : 'card-down'}`}>
      <div className="market-card-top">
        <span className="market-flag">{item.flag}</span>
        <span className={`market-change-badge ${isUp ? 'up' : 'down'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </span>
      </div>
      <div className="market-name">{item.name}</div>
      <div className="market-symbol">{item.symbol}</div>
      <div className="market-price">
        {price ? `${currency}${price < 1 ? price.toFixed(4) : price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : 'Loading...'}
      </div>
    </div>
  )
}

export default function Dashboard({ data, refreshPrices }) {
  const [chartData, setChartData] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const { prices, portfolio, trades } = data

  useEffect(() => {
    if (portfolio.total_value > 0) {
      setChartData(prev => {
        const entry = { time: new Date().toLocaleTimeString(), value: parseFloat(portfolio.total_value.toFixed(2)) }
        const updated = [...prev, entry].slice(-30)
        return updated
      })
    }
  }, [portfolio.total_value])

  const pnl = portfolio.total_value - INITIAL_CAPITAL
  const pnlPct = ((pnl / INITIAL_CAPITAL) * 100).toFixed(2)
  const isProfit = pnl >= 0

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshPrices()
    setTimeout(() => setRefreshing(false), 1000)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Virtual ₹10,000 Portfolio · Test Mode</p>
        </div>
        <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-label">Total Value</div>
          <div className="stat-value">₹{portfolio.total_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="stat-sub">Started ₹{INITIAL_CAPITAL.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cash Available</div>
          <div className="stat-value">₹{portfolio.cash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="stat-sub">{((portfolio.cash / INITIAL_CAPITAL) * 100).toFixed(1)}% liquid</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Invested</div>
          <div className="stat-value">₹{portfolio.holdings_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="stat-sub">{((portfolio.holdings_value / INITIAL_CAPITAL) * 100).toFixed(1)}% deployed</div>
        </div>
        <div className={`stat-card ${isProfit ? 'stat-profit' : 'stat-loss'}`}>
          <div className="stat-label">P&L</div>
          <div className={`stat-value ${isProfit ? 'positive' : 'negative'}`}>
            {isProfit ? '+' : ''}₹{pnl.toFixed(2)}
          </div>
          <div className={`stat-sub ${isProfit ? 'positive' : 'negative'}`}>
            {isProfit ? '▲' : '▼'} {Math.abs(pnlPct)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card chart-card">
        <div className="card-header">
          <Activity size={18} />
          <h2>Portfolio Value</h2>
        </div>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B386" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00B386" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#A0A0B2', fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#A0A0B2', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#252542', border: '1px solid #3A3A5C', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="value" stroke="#00B386" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">
            <Activity size={32} opacity={0.3} />
            <p>Collecting data — updates every 5 minutes</p>
          </div>
        )}
      </div>

      {/* Stocks */}
      <div className="market-section">
        <h2>🇮🇳 Indian Stocks</h2>
        <div className="market-grid">
          {STOCKS.map(s => <PriceCard key={s.symbol} item={s} priceData={prices[s.symbol]} isCrypto={false} />)}
        </div>
      </div>

      {/* Crypto */}
      <div className="market-section">
        <h2>₿ Crypto</h2>
        <div className="market-grid market-grid-4">
          {CRYPTOS.map(c => <PriceCard key={c.symbol} item={c} priceData={prices[c.symbol]} isCrypto={true} />)}
        </div>
      </div>

      {/* Recent Trades */}
      <div className="card">
        <div className="card-header">
          <TrendingUp size={18} />
          <h2>Recent Trades</h2>
        </div>
        {trades && trades.length > 0 ? (
          <div className="trades-mini">
            {trades.slice(0, 5).map(t => (
              <div key={t.id} className="trade-mini-row">
                <span className={`trade-badge ${t.trade_type?.toLowerCase()}`}>{t.trade_type}</span>
                <span className="trade-mini-symbol">{t.symbol}</span>
                <span className="trade-mini-qty">{parseFloat(t.quantity).toFixed(4)} units</span>
                <span className="trade-mini-price">@ ₹{t.price?.toFixed(2)}</span>
                <span className="trade-mini-reason">{t.reasoning}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No trades yet — AI cycle runs every 5 min</div>
        )}
      </div>
    </div>
  )
}
