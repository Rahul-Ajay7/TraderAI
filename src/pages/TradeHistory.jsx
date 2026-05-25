import { History } from 'lucide-react'

const NAMES = {
  'RELIANCE.NS': 'Reliance', 'TCS.NS': 'TCS', 'INFY.NS': 'Infosys',
  'HDFCBANK.NS': 'HDFC Bank', 'WIPRO.NS': 'Wipro',
  'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana', 'DOGE': 'Dogecoin'
}

export default function TradeHistory({ data }) {
  const { trades } = data

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Trade History</h1>
          <p className="page-subtitle">{trades?.length || 0} total trades</p>
        </div>
      </div>

      {trades && trades.length > 0 ? (
        <div className="trades-table">
          <div className="table-head">
            <div>Time</div>
            <div>Type</div>
            <div>Asset</div>
            <div>Qty</div>
            <div>Price</div>
            <div>Total</div>
            <div>Reason</div>
          </div>
          {trades.map((t, i) => {
            const isCrypto = !t.symbol?.includes('.NS')
            const currency = isCrypto ? '$' : '₹'
            const isEven = i % 2 === 0
            return (
              <div key={t.id} className="table-row-item" style={{ background: isEven ? 'var(--card)' : 'var(--card2)' }}>
                <div className="col-muted">{new Date(t.timestamp).toLocaleString()}</div>
                <div className={t.trade_type === 'BUY' ? 'col-type-buy' : 'col-type-sell'}>
                  {t.trade_type}
                </div>
                <div>
                  <div className="col-sym-name">{NAMES[t.symbol] || t.symbol}</div>
                  <div className="col-sym-sub">{t.symbol}</div>
                </div>
                <div>{parseFloat(t.quantity).toFixed(4)}</div>
                <div>{currency}{t.price?.toFixed(2)}</div>
                <div>{currency}{(t.quantity * t.price).toFixed(2)}</div>
                <div className="col-muted">{t.reasoning || '—'}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="no-trades-msg">
          <History size={32} opacity={0.3} />
          <h3>No Trades Yet</h3>
          <p>First AI cycle fires in ~5 minutes</p>
        </div>
      )}
    </div>
  )
}
