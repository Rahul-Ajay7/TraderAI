import { Briefcase } from 'lucide-react'

const STOCK_INFO = {
  'RELIANCE.NS': { name: 'Reliance Industries', sector: 'Conglomerate' },
  'TCS.NS': { name: 'Tata Consultancy Services', sector: 'IT Services' },
  'INFY.NS': { name: 'Infosys', sector: 'IT Services' },
  'HDFCBANK.NS': { name: 'HDFC Bank', sector: 'Banking' },
  'WIPRO.NS': { name: 'Wipro', sector: 'IT Services' },
  'BTC': { name: 'Bitcoin', sector: 'Crypto' },
  'ETH': { name: 'Ethereum', sector: 'Crypto' },
  'SOL': { name: 'Solana', sector: 'Crypto' },
  'DOGE': { name: 'Dogecoin', sector: 'Crypto' },
}

export default function Holdings({ data }) {
  const { holdings, prices } = data
  const active = holdings?.filter(h => h.quantity > 0) || []

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Holdings</h1>
          <p className="page-subtitle">{active.length} active position{active.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {active.length > 0 ? (
        <div className="holdings-grid">
          {active.map(h => {
            const isCrypto = !h.symbol.includes('.NS')
            const priceData = prices[h.symbol] || {}
            const currentPrice = priceData.price || h.current_price || h.avg_price
            const currentValue = h.quantity * currentPrice
            const invested = h.quantity * h.avg_price
            const pnl = currentValue - invested
            const pnlPct = h.avg_price > 0 ? ((currentPrice - h.avg_price) / h.avg_price * 100) : 0
            const info = STOCK_INFO[h.symbol] || { name: h.symbol, sector: 'Unknown' }
            const currency = isCrypto ? '$' : '₹'

            return (
              <div key={h.id} className="holding-card">
                <div className="holding-top">
                  <div>
                    <div className="holding-name">{info.name}</div>
                    <div className="holding-symbol">{h.symbol}</div>
                  </div>
                  <div className="holding-sector">{info.sector}</div>
                </div>
                <div className="holding-rows">
                  <div className="holding-row"><span>Quantity</span><span>{parseFloat(h.quantity).toFixed(6)}</span></div>
                  <div className="holding-row"><span>Avg Buy</span><span>{currency}{h.avg_price.toFixed(2)}</span></div>
                  <div className="holding-row"><span>Current</span><span>{currency}{currentPrice.toFixed(2)}</span></div>
                  <div className="holding-row"><span>Value</span><span>{currency}{currentValue.toFixed(2)}</span></div>
                </div>
                <div className={`holding-pnl ${pnl >= 0 ? 'positive' : 'negative'}`}>
                  <span>P&L</span>
                  <span>{pnl >= 0 ? '+' : ''}{currency}{pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="no-holdings">
          <Briefcase size={32} opacity={0.3} />
          <h3>No Holdings</h3>
          <p>AI agent hasn't bought anything yet — check back after first cycle</p>
        </div>
      )}
    </div>
  )
}
