import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
  Wallet,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  ShoppingCart,
  AlertCircle
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
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { tradingSimulation, formatINR, getIndianStockPredictions } from '../services/tradingSimulation';
import { generatePrediction, getRecommendation } from '../services/predictionEngine';
import { fetchCryptoList } from '../services/coinGecko';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const TradeHistoryItem = ({ trade }) => {
  const [expanded, setExpanded] = useState(false);
  const isBuy = trade.action === 'BUY';

  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isBuy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isBuy ? <ShoppingCart className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{trade.symbol}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                isBuy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {trade.action}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                trade.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {trade.type}
              </span>
            </div>
            <div className="text-sm text-gray-400">{trade.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="font-mono text-white font-bold">{formatINR(trade.total)}</div>
            <div className="text-sm text-gray-400">
              {trade.quantity} @ {formatINR(trade.price)}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-mono font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
              {isBuy ? '-' : '+'}{formatINR(trade.total)}
            </div>
            <div className="text-sm text-gray-400">
              {new Date(trade.timestamp).toLocaleTimeString()}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-700/50 bg-gray-900/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Portfolio Value</div>
              <div className="font-mono text-white">{formatINR(trade.portfolioValue)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Quantity</div>
              <div className="font-mono text-white">{trade.quantity}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Price per Unit</div>
              <div className="font-mono text-white">{formatINR(trade.price)}</div>
            </div>
            {trade.profit !== undefined && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Profit/Loss</div>
                <div className={`font-mono font-bold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.profit >= 0 ? '+' : ''}{formatINR(trade.profit)} ({trade.profitPercent?.toFixed(2)}%)
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PortfolioGrowthChart = ({ history }) => {
  const data = useMemo(() => {
    if (history.length === 0) {
      return [{ date: 'Start', value: 1000 }];
    }
    return history.map(h => ({
      date: new Date(h.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: h.value,
      holdings: h.holdings
    }));
  }, [history]);

  const startValue = 1000;
  const currentValue = history.length > 0 ? history[history.length - 1].value : 1000;
  const change = currentValue - startValue;
  const changePercent = (change / startValue) * 100;

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Portfolio Growth
          </h3>
          <p className="text-sm text-gray-400">Starting from ₹1,000 initial capital</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{formatINR(currentValue)}</div>
          <div className={`text-sm flex items-center justify-end gap-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {change >= 0 ? '+' : ''}{formatINR(change)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
            <YAxis
              stroke="#9ca3af"
              fontSize={10}
              tickFormatter={v => `₹${(v / 1000).toFixed(1)}K`}
              domain={['dataMin - 50', 'dataMax + 50']}
            />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              formatter={(value) => [formatINR(value), 'Value']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={change >= 0 ? '#10b981' : '#ef4444'}
              fill={change >= 0 ? 'url(#portfolioGradient)' : 'url(#lossGradient)'}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Active Growth Phase</span>
        </div>
        <div className="text-sm text-gray-400">
          Started: ₹1,000 | Current: {formatINR(currentValue)}
        </div>
      </div>
    </div>
  );
};

const RecommendationList = ({ recommendations, onTrade }) => {
  const sortedRecommendations = useMemo(() => {
    return [...recommendations].sort((a, b) => {
      if (a.recommendation.action === 'STRONG_BUY' || a.recommendation.action === 'BUY') return -1;
      if (b.recommendation.action === 'STRONG_BUY' || b.recommendation.action === 'BUY') return 1;
      return 0;
    });
  }, [recommendations]);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          AI Trading Recommendations
        </h3>
        <p className="text-sm text-gray-400">Based on technical analysis signals</p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {sortedRecommendations.slice(0, 15).map((rec, i) => {
          const isBuy = rec.recommendation.action.includes('BUY');
          const isStrong = rec.recommendation.action === 'STRONG_BUY';

          return (
            <div key={i} className="p-4 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    rec.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {rec.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{rec.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rec.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {rec.type === 'crypto' ? 'Crypto' : 'NSE'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">{rec.name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-white font-bold">
                      {rec.type === 'crypto' ? '$' : '₹'}{rec.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-sm ${rec.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {rec.change24h >= 0 ? '+' : ''}{rec.change24h?.toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className={`px-3 py-1 rounded-lg font-bold text-sm ${
                      isBuy
                        ? isStrong
                          ? 'bg-green-500 text-white'
                          : 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : rec.recommendation.action === 'HOLD'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
                    }`}>
                      {rec.recommendation.action}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {rec.confidence}% confidence
                    </div>
                  </div>

                  {isBuy && (
                    <button
                      onClick={() => onTrade(rec, 'BUY')}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Trade
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TradingSimulation = () => {
  const [simulationState, setSimulationState] = useState(tradingSimulation.getState());
  const [recommendations, setRecommendations] = useState([]);
  const [cryptoData, setCryptoData] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [currentPrices, setCurrentPrices] = useState({});

  useEffect(() => {
    const unsubscribe = tradingSimulation.subscribe(setSimulationState);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      if (autoTradeEnabled && recommendations.length > 0) {
        const newPrices = {};
        recommendations.forEach(rec => {
          const change = (Math.random() - 0.5) * 0.02;
          newPrices[rec.symbol] = rec.price * (1 + change);
        });
        setCurrentPrices(prev => ({ ...prev, ...newPrices }));

        tradingSimulation.runSimulationStep(recommendations, newPrices);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isSimulating, autoTradeEnabled, recommendations]);

  const loadData = async () => {
    const stocks = getIndianStockPredictions();
    setRecommendations(stocks);

    try {
      const cryptos = await fetchCryptoList();
      const cryptoRecs = cryptos.slice(0, 10).map(coin => {
        const prices = coin.sparkline_in_7d?.price || [];
        const prediction = generatePrediction(prices);
        const recommendation = getRecommendation({ ...coin, prices });

        return {
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          type: 'crypto',
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h,
          recommendation,
          prediction,
          confidence: prediction.confidence
        };
      });

      setCryptoData(cryptoRecs);
      setRecommendations(prev => [...prev, ...cryptoRecs]);

      const prices = {};
      [...stocks, ...cryptoRecs].forEach(rec => {
        prices[rec.symbol] = rec.price;
      });
      setCurrentPrices(prices);
    } catch (error) {
      console.error('Failed to load crypto data:', error);
    }
  };

  const handleTrade = (asset, action) => {
    const price = currentPrices[asset.symbol] || asset.price;
    tradingSimulation.executeTrade(action, asset, price);
  };

  const handleStartSimulation = () => {
    tradingSimulation.startSimulation();
    setIsSimulating(true);
    tradingSimulation.recordPortfolioValue(currentPrices);
  };

  const handleStopSimulation = () => {
    tradingSimulation.stopSimulation();
    setIsSimulating(false);
  };

  const handleReset = () => {
    tradingSimulation.resetSimulation();
    setIsSimulating(false);
    setAutoTradeEnabled(false);
  };

  const stats = tradingSimulation.getStats();
  const allRecommendations = [...recommendations, ...cryptoData];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Trading Simulation</h1>
            <p className="text-gray-400">Automated trading with ₹1,000 virtual capital</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
          {isSimulating ? (
            <button
              onClick={handleStopSimulation}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Pause className="w-4 h-4" />
              Stop Simulation
            </button>
          ) : (
            <button
              onClick={handleStartSimulation}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Simulation
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Current Value</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(stats.currentValue)}</div>
          <div className={`flex items-center gap-1 text-sm ${stats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.totalReturn >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}% from ₹1,000
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Total P&L</span>
          </div>
          <div className={`text-2xl font-bold ${stats.currentValue >= stats.initialCapital ? 'text-green-400' : 'text-red-400'}`}>
            {stats.currentValue >= stats.initialCapital ? '+' : ''}{formatINR(stats.currentValue - stats.initialCapital)}
          </div>
          <div className="text-sm text-gray-400">
            {stats.totalTrades} trades executed
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-400">
            {stats.winningTrades} wins / {stats.losingTrades} losses
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Available Cash</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(stats.cash)}</div>
          <div className="text-sm text-gray-400">
            {stats.holdings.length} active positions
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-400" />
          <div>
            <div className="font-bold text-white">Auto-Trading Mode</div>
            <div className="text-sm text-gray-400">
              Automatically execute trades based on AI signals
            </div>
          </div>
        </div>
        <button
          onClick={() => setAutoTradeEnabled(!autoTradeEnabled)}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            autoTradeEnabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
            autoTradeEnabled ? 'translate-x-8' : 'translate-x-1'
          }`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioGrowthChart history={stats.portfolioHistory} />

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-400" />
              Holdings Distribution
            </h3>
          </div>

          {stats.holdings.length > 0 ? (
            <div className="p-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={stats.holdings.map((h, i) => ({
                        name: h.symbol,
                        value: h.quantity * (currentPrices[h.symbol] || h.avgPrice),
                        color: COLORS[i % COLORS.length]
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.holdings.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value) => formatINR(value)}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-4">
                {stats.holdings.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-white font-medium">{h.symbol}</span>
                      <span className="text-gray-400 text-sm">{h.quantity} units</span>
                    </div>
                    <span className="font-mono text-white">
                      {formatINR(h.quantity * (currentPrices[h.symbol] || h.avgPrice))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No holdings yet</p>
              <p className="text-sm text-gray-500">Start the simulation to build your portfolio</p>
            </div>
          )}
        </div>
      </div>

      <RecommendationList recommendations={allRecommendations} onTrade={handleTrade} />

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            Trade History
          </h3>
          <p className="text-sm text-gray-400">Log of all simulated transactions</p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {simulationState.tradeHistory.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {simulationState.tradeHistory.slice().reverse().map((trade) => (
                <TradeHistoryItem key={trade.id} trade={trade} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No trades yet</p>
              <p className="text-sm text-gray-500">
                Start the simulation or click "Trade" on recommendations to begin
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-yellow-500 mb-1">Simulation Disclaimer</h4>
            <p className="text-sm text-gray-400">
              This is a demonstration trading simulation with ₹1,000 virtual capital.
              AI predictions and trading signals are for educational purposes only.
              Cryptocurrency and stock trading involve substantial risk of loss.
              Past performance does not guarantee future results. Never invest more
              than you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingSimulation;
