import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Bitcoin,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Eye
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const PortfolioPieChart = ({ holdings }) => {
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  
  const data = holdings.map((h, i) => ({
    name: h.symbol,
    value: h.quantity * h.avgPrice,
    color: COLORS[i % COLORS.length]
  }));
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No holdings yet
      </div>
    );
  }
  
  return (
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={40}
        outerRadius={70}
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
    </PieChart>
  );
};

const SectorPerformanceChart = ({ sectors }) => {
  return (
    <BarChart data={sectors} layout="vertical" margin={{ left: 80 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis type="number" stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
      <YAxis type="category" dataKey="name" stroke="#9ca3af" width={80} />
      <Tooltip 
        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
        formatter={(value) => [`${value.toFixed(2)}%`]}
      />
      <Bar dataKey="change" radius={[0, 4, 4, 0]}>
        {sectors.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.change >= 0 ? '#10b981' : '#ef4444'} />
        ))}
      </Bar>
    </BarChart>
  );
};

const MiniChart = ({ data, color = '#3b82f6' }) => {
  const chartData = data.slice(-30).map(d => ({ value: d.close }));
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const Dashboard = () => {
  const { marketData, indices, sectors, news, portfolio, selectAsset } = useApp();
  
  const allAssets = useMemo(() => {
    if (!marketData) return [];
    const assets = [];
    Object.entries(marketData).forEach(([category, categoryAssets]) => {
      Object.values(categoryAssets).forEach(asset => {
        assets.push({ ...asset, category });
      });
    });
    return assets.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }, [marketData]);
  
  const topGainers = allAssets.filter(a => a.changePercent > 0).slice(0, 5);
  const topLosers = allAssets.filter(a => a.changePercent < 0).slice(0, 5);
  
  const getAssetIcon = (symbol) => {
    if (['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'LINK'].includes(symbol)) {
      return <Bitcoin className="w-4 h-4" />;
    }
    if (['GOLD', 'SILVER', 'OIL', 'NATGAS', 'COPPER', 'WHEAT', 'CORN', 'PLATINUM', 'COFFEE', 'LITHIUM'].includes(symbol)) {
      return <BarChart3 className="w-4 h-4" />;
    }
    return <Activity className="w-4 h-4" />;
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Dashboard</h1>
          <p className="text-gray-400">Real-time market overview and insights</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
          <Clock className="w-4 h-4" />
          <span>Live</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Portfolio Value</h3>
            <DollarSign className="w-5 h-5 text-accent-primary" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${portfolio.totalValue.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            {portfolio.dailyPnL >= 0 ? (
              <span className="text-accent-success flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> +${portfolio.dailyPnL.toLocaleString()}
              </span>
            ) : (
              <span className="text-accent-danger flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" /> -${Math.abs(portfolio.dailyPnL).toLocaleString()}
              </span>
            )}
            <span className="text-gray-500 text-sm">today</span>
          </div>
          <div className="h-32 mt-4">
            <PortfolioPieChart holdings={portfolio.holdings} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Market Indices</h3>
            <TrendingUp className="w-5 h-5 text-accent-secondary" />
          </div>
          <div className="space-y-3">
            {indices.slice(0, 6).map((index, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-dark-600 last:border-0">
                <div>
                  <div className="text-white font-medium">{index.name}</div>
                  <div className="text-gray-400 text-sm font-mono">{index.value.toLocaleString()}</div>
                </div>
                <div className={`text-right ${index.changePercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                  <div className="flex items-center gap-1">
                    {index.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span className="font-medium">{index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Sector Performance</h3>
            <BarChart3 className="w-5 h-5 text-accent-warning" />
          </div>
          <div className="h-64">
            <SectorPerformanceChart sectors={sectors} />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top Gainers</h3>
            <TrendingUp className="w-5 h-5 text-accent-success" />
          </div>
          <div className="space-y-3">
            {topGainers.map((asset, i) => (
              <div 
                key={i}
                className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
                onClick={() => selectAsset(asset.category, asset.symbol)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center text-accent-success">
                    {getAssetIcon(asset.symbol)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{asset.symbol}</div>
                    <div className="text-gray-400 text-sm">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono">${asset.price?.toLocaleString()}</div>
                  <div className="text-accent-success text-sm flex items-center justify-end gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    +{asset.changePercent?.toFixed(2)}%
                  </div>
                </div>
                <div className="w-20 h-10">
                  <MiniChart data={asset.data} color="#10b981" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top Losers</h3>
            <TrendingDown className="w-5 h-5 text-accent-danger" />
          </div>
          <div className="space-y-3">
            {topLosers.map((asset, i) => (
              <div 
                key={i}
                className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
                onClick={() => selectAsset(asset.category, asset.symbol)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center text-accent-danger">
                    {getAssetIcon(asset.symbol)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{asset.symbol}</div>
                    <div className="text-gray-400 text-sm">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono">${asset.price?.toLocaleString()}</div>
                  <div className="text-accent-danger text-sm flex items-center justify-end gap-1">
                    <ArrowDownRight className="w-3 h-3" />
                    {asset.changePercent?.toFixed(2)}%
                  </div>
                </div>
                <div className="w-20 h-10">
                  <MiniChart data={asset.data} color="#ef4444" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">All Assets</h3>
          <Eye className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-dark-600">
                <th className="pb-3 font-medium">Asset</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">24h Change</th>
                <th className="pb-3 font-medium text-right">Volume</th>
                <th className="pb-3 font-medium text-right">7d Chart</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {allAssets.slice(0, 10).map((asset, i) => (
                <tr key={i} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        asset.category === 'crypto' ? 'bg-accent-warning/20 text-accent-warning' :
                        asset.category === 'commodities' ? 'bg-accent-secondary/20 text-accent-secondary' :
                        'bg-accent-primary/20 text-accent-primary'
                      }`}>
                        {getAssetIcon(asset.symbol)}
                      </div>
                      <div>
                        <div className="text-white font-medium">{asset.symbol}</div>
                        <div className="text-gray-400 text-xs">{asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      asset.category === 'crypto' ? 'bg-accent-warning/20 text-accent-warning' :
                      asset.category === 'commodities' ? 'bg-accent-secondary/20 text-accent-secondary' :
                      'bg-accent-primary/20 text-accent-primary'
                    }`}>
                      {asset.category}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-white">
                    ${asset.price?.toLocaleString()}
                  </td>
                  <td className={`py-3 text-right font-mono ${asset.changePercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                    {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent?.toFixed(2)}%
                  </td>
                  <td className="py-3 text-right text-gray-400 font-mono text-sm">
                    {(asset.data?.[asset.data.length - 1]?.volume / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-3 w-24 h-10">
                    <MiniChart data={asset.data} color={asset.changePercent >= 0 ? '#10b981' : '#ef4444'} />
                  </td>
                  <td className="py-3 text-right">
                    <button 
                      onClick={() => selectAsset(asset.category, asset.symbol)}
                      className="text-accent-primary hover:text-blue-400 text-sm"
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Latest News</h3>
          <span className="text-xs text-gray-400">Updated 2 min ago</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.slice(0, 6).map((item, i) => (
            <div key={i} className="p-4 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  item.sentiment === 'positive' ? 'bg-accent-success/20 text-accent-success' :
                  item.sentiment === 'negative' ? 'bg-accent-danger/20 text-accent-danger' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {item.sentiment}
                </span>
                <span className="text-xs text-gray-500">{item.source}</span>
              </div>
              <h4 className="text-white font-medium mb-1 line-clamp-2">{item.headline}</h4>
              <p className="text-gray-400 text-sm line-clamp-2">{item.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
