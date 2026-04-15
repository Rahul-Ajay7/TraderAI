import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Minus,
  Wallet,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Shield,
  Activity,
  Bell,
  Settings,
  X,
  CheckCircle,
  AlertCircle,
  History,
  RefreshCw
} from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const PortfolioPieChart = ({ holdings, marketData }) => {
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
  
  const data = holdings.map((h, i) => {
    let currentPrice = h.avgPrice;
    
    if (marketData) {
      Object.values(marketData).forEach(category => {
        if (category[h.symbol]) {
          currentPrice = category[h.symbol].price;
        }
      });
    }
    
    return {
      name: h.symbol,
      value: h.quantity * currentPrice,
      color: COLORS[i % COLORS.length]
    };
  });
  
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Briefcase className="w-12 h-12 mb-4 opacity-50" />
        <p>No holdings yet</p>
        <p className="text-sm">Start trading to build your portfolio</p>
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          formatter={(value) => `$${value.toLocaleString()}`}
        />
      </RePieChart>
    </ResponsiveContainer>
  );
};

const PerformanceChart = ({ portfolioHistory }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={portfolioHistory}>
        <defs>
          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
        <YAxis 
          stroke="#6b7280" 
          tick={{ fontSize: 10 }}
          tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
        />
        <Tooltip 
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          fill="url(#portfolioGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const TradeModal = ({ isOpen, onClose, type, symbol, currentPrice, onSubmit }) => {
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState('market');
  
  if (!isOpen) return null;
  
  const total = quantity * currentPrice;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {type === 'buy' ? 'Buy' : 'Sell'} {symbol}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Order Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrderType('market')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  orderType === 'market' 
                    ? 'bg-accent-primary text-white' 
                    : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  orderType === 'limit' 
                    ? 'bg-accent-primary text-white' 
                    : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                Limit
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              className="input-field w-full"
              min="1"
            />
          </div>
          
          <div className="p-4 bg-dark-700/50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Current Price</span>
              <span className="text-white font-mono">${currentPrice?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Quantity</span>
              <span className="text-white font-mono">{quantity}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-dark-600">
              <span className="text-white font-semibold">Total</span>
              <span className="text-accent-primary font-mono font-bold">${total.toLocaleString()}</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              onSubmit(symbol, quantity, currentPrice);
              onClose();
            }}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              type === 'buy'
                ? 'bg-accent-success hover:bg-green-600 text-white'
                : 'bg-accent-danger hover:bg-red-600 text-white'
            }`}
          >
            {type === 'buy' ? 'Confirm Buy' : 'Confirm Sell'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Portfolio = () => {
  const { marketData, portfolio, buyAsset, sellAsset, watchlist, addToWatchlist, removeFromWatchlist } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [tradeModal, setTradeModal] = useState({ isOpen: false, type: 'buy', symbol: null });
  
  const allAssets = useMemo(() => {
    if (!marketData) return [];
    const assets = [];
    Object.entries(marketData).forEach(([category, categoryAssets]) => {
      Object.values(categoryAssets).forEach(asset => {
        assets.push({ ...asset, category });
      });
    });
    return assets;
  }, [marketData]);
  
  const portfolioWithPnL = useMemo(() => {
    return portfolio.holdings.map(holding => {
      let currentPrice = holding.avgPrice;
      let asset = null;
      
      Object.values(marketData || {}).forEach(category => {
        if (category[holding.symbol]) {
          currentPrice = category[holding.symbol].price;
          asset = category[holding.symbol];
        }
      });
      
      const value = holding.quantity * currentPrice;
      const cost = holding.quantity * holding.avgPrice;
      const pnl = value - cost;
      const pnlPercent = ((value - cost) / cost) * 100;
      
      return {
        ...holding,
        currentPrice,
        value,
        cost,
        pnl,
        pnlPercent,
        asset
      };
    });
  }, [portfolio.holdings, marketData]);
  
  const totalPortfolioValue = useMemo(() => {
    const holdingsValue = portfolioWithPnL.reduce((sum, h) => sum + h.value, 0);
    return holdingsValue + portfolio.cash;
  }, [portfolioWithPnL, portfolio.cash]);
  
  const totalPnL = useMemo(() => {
    return portfolioWithPnL.reduce((sum, h) => sum + h.pnl, 0);
  }, [portfolioWithPnL]);
  
  const totalPnLPercent = useMemo(() => {
    const totalCost = portfolioWithPnL.reduce((sum, h) => sum + h.cost, 0);
    return totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  }, [portfolioWithPnL, totalPnL]);
  
  const portfolioHistory = useMemo(() => {
    const days = 30;
    const history = [];
    let value = totalPortfolioValue;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyChange = (Math.random() - 0.5) * 0.02;
      value = value * (1 + dailyChange);
      
      history.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value
      });
    }
    
    return history;
  }, [totalPortfolioValue]);
  
  const watchlistAssets = useMemo(() => {
    return watchlist.map(symbol => {
      let asset = null;
      Object.values(marketData || {}).forEach(category => {
        if (category[symbol]) {
          asset = category[symbol];
        }
      });
      return asset;
    }).filter(Boolean);
  }, [watchlist, marketData]);
  
  const handleTrade = (symbol, quantity, price) => {
    if (tradeModal.type === 'buy') {
      buyAsset(symbol, quantity, price);
    } else {
      sellAsset(symbol, quantity, price);
    }
  };
  
  const getAssetIcon = (symbol) => {
    if (['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'LINK'].includes(symbol)) {
      return <Activity className="w-4 h-4" />;
    }
    if (['GOLD', 'SILVER', 'OIL', 'NATGAS', 'COPPER', 'WHEAT', 'CORN', 'PLATINUM', 'COFFEE', 'LITHIUM'].includes(symbol)) {
      return <BarChart3 className="w-4 h-4" />;
    }
    return <DollarSign className="w-4 h-4" />;
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-warning to-accent-secondary rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Portfolio</h1>
            <p className="text-gray-400">Manage your investments</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-accent-primary/20 to-transparent border-accent-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-accent-primary" />
            <span className="text-gray-400 text-sm">Total Value</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${totalPortfolioValue.toLocaleString()}
          </div>
          <div className={`flex items-center gap-1 text-sm ${totalPnL >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
            {totalPnL >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}</span>
            <span className="text-gray-400">({totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)</span>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Available Cash</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${portfolio.cash.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">
            {((portfolio.cash / totalPortfolioValue) * 100).toFixed(1)}% of portfolio
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Holdings</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {portfolio.holdings.length}
          </div>
          <div className="text-gray-400 text-sm mt-1">
            {portfolioWithPnL.filter(h => h.pnl > 0).length} profitable
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Best Performer</span>
          </div>
          <div className="text-2xl font-bold text-accent-success">
            {portfolioWithPnL.length > 0 ? (
              portfolioWithPnL.reduce((best, h) => h.pnlPercent > best.pnlPercent ? h : best, portfolioWithPnL[0]).symbol
            ) : '-'}
          </div>
          <div className="text-accent-success text-sm mt-1">
            {portfolioWithPnL.length > 0 ? (
              `+${portfolioWithPnL.reduce((best, h) => h.pnlPercent > best.pnlPercent ? h : best, portfolioWithPnL[0]).pnlPercent.toFixed(2)}%`
            ) : ''}
          </div>
        </div>
      </div>
      
      <div className="flex border-b border-dark-600">
        {['overview', 'holdings', 'watchlist', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab 
                ? 'text-accent-primary border-b-2 border-accent-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Portfolio Distribution</h3>
            <PortfolioPieChart holdings={portfolio.holdings} marketData={marketData} />
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {portfolioWithPnL.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][i % 5] }}
                  />
                  <span className="text-gray-400 text-sm">{h.symbol}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Performance History</h3>
            <PerformanceChart portfolioHistory={portfolioHistory} />
          </div>
        </div>
      )}
      
      {activeTab === 'holdings' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-dark-600">
                  <th className="pb-3 font-medium">Asset</th>
                  <th className="pb-3 font-medium text-right">Quantity</th>
                  <th className="pb-3 font-medium text-right">Avg Price</th>
                  <th className="pb-3 font-medium text-right">Current Price</th>
                  <th className="pb-3 font-medium text-right">Value</th>
                  <th className="pb-3 font-medium text-right">P&L</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolioWithPnL.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No holdings yet. Start trading to build your portfolio.
                    </td>
                  </tr>
                ) : (
                  portfolioWithPnL.map((holding, i) => (
                    <tr key={i} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center">
                            {getAssetIcon(holding.symbol)}
                          </div>
                          <div>
                            <div className="text-white font-medium">{holding.symbol}</div>
                            <div className="text-gray-400 text-xs">{holding.asset?.name || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-right font-mono text-white">{holding.quantity}</td>
                      <td className="py-4 text-right font-mono text-gray-400">${holding.avgPrice.toLocaleString()}</td>
                      <td className="py-4 text-right font-mono text-white">${holding.currentPrice.toLocaleString()}</td>
                      <td className="py-4 text-right font-mono text-white">${holding.value.toLocaleString()}</td>
                      <td className={`py-4 text-right font-mono ${holding.pnl >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                        <div>{holding.pnl >= 0 ? '+' : ''}${holding.pnl.toLocaleString()}</div>
                        <div className="text-xs">{holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%</div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setTradeModal({ isOpen: true, type: 'buy', symbol: holding.symbol })}
                            className="px-3 py-1 bg-accent-success/20 text-accent-success rounded text-sm hover:bg-accent-success/30"
                          >
                            Buy
                          </button>
                          <button 
                            onClick={() => setTradeModal({ isOpen: true, type: 'sell', symbol: holding.symbol })}
                            className="px-3 py-1 bg-accent-danger/20 text-accent-danger rounded text-sm hover:bg-accent-danger/30"
                          >
                            Sell
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'watchlist' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Watchlist</h3>
            <div className="flex items-center gap-2">
              <select className="input-field text-sm">
                <option>Add to watchlist...</option>
                {allAssets
                  .filter(a => !watchlist.includes(a.symbol))
                  .map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol} - {a.name}</option>
                  ))}
              </select>
            </div>
          </div>
          
          {watchlistAssets.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Your watchlist is empty</p>
              <p className="text-sm">Add assets to track their performance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchlistAssets.map((asset, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      asset.category === 'crypto' ? 'bg-accent-warning/20 text-accent-warning' :
                      asset.category === 'commodities' ? 'bg-accent-secondary/20 text-accent-secondary' :
                      'bg-accent-primary/20 text-accent-primary'
                    }`}>
                      {getAssetIcon(asset.symbol)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{asset.symbol}</div>
                      <div className="text-gray-400 text-sm">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono">${asset.price?.toLocaleString()}</div>
                    <div className={`text-sm ${asset.changePercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                      {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent?.toFixed(2)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setTradeModal({ isOpen: true, type: 'buy', symbol: asset.symbol })}
                      className="px-3 py-1 bg-accent-success/20 text-accent-success rounded text-sm hover:bg-accent-success/30"
                    >
                      Buy
                    </button>
                    <button 
                      onClick={() => removeFromWatchlist(asset.symbol)}
                      className="p-1 text-gray-400 hover:text-accent-danger"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'history' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Transaction History</h3>
            <History className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="text-center py-8 text-gray-400">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Transaction history will appear here</p>
            <p className="text-sm">All your trades will be logged automatically</p>
          </div>
        </div>
      )}
      
      {tradeModal.isOpen && tradeModal.symbol && (
        <TradeModal
          isOpen={tradeModal.isOpen}
          onClose={() => setTradeModal({ isOpen: false, type: 'buy', symbol: null })}
          type={tradeModal.type}
          symbol={tradeModal.symbol}
          currentPrice={
            marketData && 
            Object.values(marketData).find(cat => cat[tradeModal.symbol])?.[tradeModal.symbol]?.price || 0
          }
          onSubmit={handleTrade}
        />
      )}
    </div>
  );
};

export default Portfolio;
