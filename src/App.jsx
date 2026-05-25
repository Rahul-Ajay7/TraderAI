import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Wallet, Briefcase, History, Bot, TrendingUp } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Holdings from './pages/Holdings'
import TradeHistory from './pages/TradeHistory'
import AILog from './pages/AILog'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [data, setData] = useState({
    prices: {},
    portfolio: { cash: 10000, total_value: 10000, holdings_value: 0 },
    holdings: [],
    trades: [],
    logs: []
  })
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const connectWebSocket = useCallback(() => {
    const wsUrl = API_URL.replace('http', 'ws') + '/ws'
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => { setConnected(true); console.log('[WS] Connected') }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (['init', 'price_update', 'trade_update'].includes(msg.type)) {
          setData(prev => ({
            prices: msg.prices || prev.prices,
            portfolio: msg.portfolio || prev.portfolio,
            holdings: msg.holdings || prev.holdings,
            trades: msg.trades || prev.trades,
            logs: msg.logs || prev.logs,
          }))
          setLastUpdate(new Date())
        }
      } catch (e) { console.error('[WS] Parse error', e) }
    }
    ws.onerror = () => console.error('[WS] Error')
    ws.onclose = () => { setConnected(false); setTimeout(connectWebSocket, 3000) }
    return ws
  }, [])

  useEffect(() => {
    const ws = connectWebSocket()
    return () => ws?.close()
  }, [connectWebSocket])

  const fetchAllData = useCallback(async () => {
    try {
      const [pRes, hRes, tRes, lRes, prRes] = await Promise.all([
        fetch(`${API_URL}/api/portfolio`),
        fetch(`${API_URL}/api/holdings`),
        fetch(`${API_URL}/api/trades`),
        fetch(`${API_URL}/api/ai-logs`),
        fetch(`${API_URL}/api/prices`),
      ])
      const [portfolio, holdings, trades, logs, prices] = await Promise.all([
        pRes.json(), hRes.json(), tRes.json(), lRes.json(), prRes.json()
      ])
      setData({ portfolio, holdings, trades, logs, prices })
      setLastUpdate(new Date())
    } catch (e) { console.error('[FETCH]', e) }
  }, [])

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 60000)
    return () => clearInterval(interval)
  }, [fetchAllData])

  const refreshPrices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prices`)
      const prices = await res.json()
      setData(prev => ({ ...prev, prices }))
    } catch (e) { console.error(e) }
  }

  const pnl = data.portfolio.total_value - 10000
  const isProfit = pnl >= 0

  const navItems = [
    { path: '/', icon: Wallet, label: 'Dashboard' },
    { path: '/holdings', icon: Briefcase, label: 'Holdings' },
    { path: '/trades', icon: History, label: 'Trades' },
    { path: '/logs', icon: Bot, label: 'AI Log' },
  ]

  return (
    <BrowserRouter>
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <TrendingUp size={24} />
            <span>TraderAI</span>
          </div>
          <div className="logo-sub">Mini Aladdin Platform</div>

          <div className={`connection-status ${connected ? 'connected' : ''}`}>
            <span className="status-dot"></span>
            {connected ? 'Live Feed Active' : 'Connecting...'}
          </div>

          <nav className="nav-links">
            {navItems.map(item => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="portfolio-summary">
            <div className="summary-label">Portfolio Value</div>
            <div className="summary-value">₹{data.portfolio.total_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <div className="pnl">
              P&L: <span className={isProfit ? 'positive' : 'negative'}>
                {isProfit ? '+' : ''}₹{pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard data={data} refreshPrices={refreshPrices} />} />
            <Route path="/holdings" element={<Holdings data={data} />} />
            <Route path="/trades" element={<TradeHistory data={data} />} />
            <Route path="/logs" element={<AILog data={data} />} />
          </Routes>

          <footer className="footer">
            <span>Updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}</span>
            <button onClick={fetchAllData}>Refresh All</button>
          </footer>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
