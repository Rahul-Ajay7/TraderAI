import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Brain, 
  AlertCircle, CheckCircle, XCircle, Clock, 
  Zap, Target, Shield, RefreshCw, Star, ArrowUp, ArrowDown,
  Play, Pause, RotateCcw, Wallet, Activity, IndianRupee, ShoppingCart, BarChart3
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line
} from 'recharts';
import { fetchCryptoList, fetchTrendingCoins } from './services/coinGecko';
import { stockList, fetchStockDaily } from './services/alphaVantage';
import { generatePrediction, getRecommendation, calculateRSI, calculateVolatility, calculateMomentum, analyzeTrend } from './services/predictionEngine';
import { tradingSimulation, formatINR, getIndianStockPredictions } from './services/tradingSimulation';

const recommendationColors = {
  strong_buy: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', icon: Star },
  buy: { bg: 'bg-green-400/20', border: 'border-green-400/50', text: 'text-green-300', icon: ArrowUp },
  hold: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', icon: AlertCircle },
  sell: { bg: 'bg-red-400/20', border: 'border-red-400/50', text: 'text-red-300', icon: ArrowDown },
  strong_sell: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', icon: XCircle },
};

function App() {
  const [activeTab, setActiveTab] = useState('trading');
  const [cryptoData, setCryptoData] = useState([]);
  const [stockPrices, setStockPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [simulationState, setSimulationState] = useState(tradingSimulation.getState());
  const [currentPrices, setCurrentPrices] = useState({});
  const [indianStocks, setIndianStocks] = useState([]);

  // Subscribe to trading simulation
  useEffect(() => {
    const unsubscribe = tradingSimulation.subscribe(setSimulationState);
    return () => unsubscribe();
  }, []);

  // Fetch crypto data
  useEffect(() => {
    loadCryptoData();
    loadIndianStocks();
    const interval = setInterval(loadCryptoData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stock data
  useEffect(() => {
    if (activeTab === 'stocks') {
      loadStockData();
    }
  }, [activeTab]);

  // Auto-trading simulation effect - always runs when simulation is active
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = tradingSimulation.getStats();
      if (stats.currentValue > 0) {
        const allAssets = [...indianStocks, ...cryptoData.map(c => ({
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          type: 'crypto',
          price: c.current_price,
          change24h: c.price_change_percentage_24h,
          recommendation: getRecommendation({ ...c, prices: c.sparkline_in_7d?.price || [] }),
          confidence: generatePrediction(c.sparkline_in_7d?.price || []).confidence
        }))];

        const newPrices = {};
        allAssets.forEach(asset => {
          const change = (Math.random() - 0.5) * 0.02;
          newPrices[asset.symbol] = (currentPrices[asset.symbol] || asset.price) * (1 + change);
        });
        setCurrentPrices(prev => ({ ...prev, ...newPrices }));

        tradingSimulation.runSimulationStep(allAssets, newPrices);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [indianStocks, cryptoData, currentPrices]);

  // Auto-start simulation on app load
  useEffect(() => {
    if (indianStocks.length > 0) {
      tradingSimulation.startSimulation();
    }
  }, [indianStocks]);

  const loadCryptoData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCryptoList();
      setCryptoData(data);
      setLastUpdate(new Date());
      
      const prices = {};
      data.forEach(coin => {
        prices[coin.symbol.toUpperCase()] = coin.current_price;
      });
      setCurrentPrices(prev => ({ ...prev, ...prices }));
    } catch (error) {
      console.error('Failed to load crypto data:', error);
    }
    setIsLoading(false);
  };

  const loadIndianStocks = () => {
    const stocks = getIndianStockPredictions();
    setIndianStocks(stocks);
    const prices = {};
    stocks.forEach(stock => {
      prices[stock.symbol] = stock.price;
    });
    setCurrentPrices(prev => ({ ...prev, ...prices }));
  };

  const allAssets = useMemo(() => {
    const assets = [];
    indianStocks.forEach(stock => {
      assets.push({
        ...stock,
        type: 'stock',
        formattedPrice: `₹${stock.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      });
    });
    cryptoData.forEach(coin => {
      const prices = coin.sparkline_in_7d?.price || [];
      const prediction = generatePrediction(prices);
      const recommendation = getRecommendation({ ...coin, prices });
      assets.push({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        type: 'crypto',
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        recommendation,
        prediction,
        confidence: prediction.confidence,
        formattedPrice: `$${coin.current_price?.toLocaleString()}`
      });
    });
    return assets.sort((a, b) => b.confidence - a.confidence);
  }, [indianStocks, cryptoData]);

  const buySignals = useMemo(() => {
    return allAssets.filter(a => 
      (a.recommendation.action === 'BUY' || a.recommendation.action === 'STRONG_BUY') && 
      a.confidence >= 55
    ).slice(0, 5);
  }, [allAssets]);

  const sellSignals = useMemo(() => {
    return allAssets.filter(a => 
      a.recommendation.action === 'SELL' || a.recommendation.action === 'AVOID'
    );
  }, [allAssets]);

  const topPerformers = useMemo(() => {
    return allAssets.filter(a => a.change24h >= 0).slice(0, 5);
  }, [allAssets]);

  const loadStockData = async () => {
    setIsLoading(true);
    const prices = {};
    for (const stock of stockList.slice(0, 10)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      prices[stock.symbol] = {
        ...stock,
        price: 100 + Math.random() * 300,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5
      };
    }
    setStockPrices(prices);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  const handleReset = () => {
    tradingSimulation.resetSimulation();
    setTimeout(() => {
      tradingSimulation.startSimulation();
    }, 100);
  };

  const handleTrade = (asset, action) => {
    const price = currentPrices[asset.symbol] || asset.price;
    tradingSimulation.executeTrade(action, asset, price);
  };

  const selectAsset = async (asset, type) => {
    setSelectedAsset({ ...asset, type });
    
    let history = [];
    if (type === 'crypto' && asset.sparkline_in_7d?.price) {
      const prices = asset.sparkline_in_7d.price;
      history = prices.map((price, i) => ({
        date: new Date(Date.now() - (prices.length - i) * 60 * 60 * 1000).toISOString(),
        close: price
      }));
    } else if (type === 'stock') {
      history = await fetchStockDaily(asset.symbol);
    }
    
    setAssetHistory(history);
  };

  // Calculate recommendations for all assets
  const allRecommendations = useMemo(() => {
    const recs = [];
    
    // Crypto recommendations
    cryptoData.forEach(coin => {
      if (coin.sparkline_in_7d?.price?.length > 30) {
        const prices = coin.sparkline_in_7d.price;
        const prediction = generatePrediction(prices);
        const recommendation = getRecommendation({ ...coin, prices });
        recs.push({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h,
          type: 'crypto',
          id: coin.id,
          recommendation,
          prediction,
          score: prediction.score,
          confidence: prediction.confidence
        });
      }
    });
    
    // Stock recommendations
    Object.values(stockPrices).forEach(stock => {
      const history = Array.from({ length: 30 }, (_, i) => ({
        close: stock.price * (0.95 + Math.random() * 0.1)
      })).map((_, i, arr) => arr.slice(0, i + 1).reduce((a, b) => a + b.close, 0) / (i + 1));
      
      const prediction = generatePrediction(history);
      const recommendation = getRecommendation({ ...stock, prices: history });
      recs.push({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        change24h: stock.changePercent,
        type: 'stock',
        recommendation,
        prediction,
        score: prediction.score,
        confidence: prediction.confidence
      });
    });
    
    return recs.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  }, [cryptoData, stockPrices]);

  const topPicks = allRecommendations.filter(r => 
    r.recommendation.action === 'BUY' && r.confidence >= 60
  );

  const currentPrediction = useMemo(() => {
    if (!selectedAsset || assetHistory.length === 0) return null;
    const prices = assetHistory.map(h => h.close);
    return generatePrediction(prices);
  }, [selectedAsset, assetHistory]);

  const simulationStats = tradingSimulation.getStats();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">TradePredict AI</h1>
                <p className="text-xs text-gray-400">Real-time predictions for maximum profit</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <Clock className="w-4 h-4" />
                <span>Updated {lastUpdate.toLocaleTimeString()}</span>
              </div>
              <button 
                onClick={() => activeTab === 'crypto' ? loadCryptoData() : loadStockData()}
                className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('trading')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'trading' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Trading Sim
            </div>
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'crypto' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Crypto
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stocks')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'stocks' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Indian Stocks
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'recommendations' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Recommendations
            </div>
          </button>
        </div>

        {/* Trading Simulation - Always Running */}
        {activeTab === 'trading' && (
          <div className="mb-6 space-y-4">
            {/* Live Status Banner */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-900/50 to-emerald-900/30 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                </div>
                <div>
                  <div className="font-bold text-green-400">AI Trading Active</div>
                  <div className="text-sm text-gray-400">Automatically managing ₹1,000 portfolio</div>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Portfolio
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400 text-sm">Portfolio Value</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatINR(simulationStats.currentValue)}</div>
                <div className={`text-sm flex items-center gap-1 ${simulationStats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {simulationStats.totalReturn >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {simulationStats.totalReturn >= 0 ? '+' : ''}{simulationStats.totalReturn.toFixed(2)}%
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400 text-sm">Initial Capital</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatINR(simulationStats.initialCapital)}</div>
                <div className="text-sm text-gray-400">₹1,000 invested</div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-400 text-sm">Total P&L</span>
                </div>
                <div className={`text-2xl font-bold ${simulationStats.currentValue >= simulationStats.initialCapital ? 'text-green-400' : 'text-red-400'}`}>
                  {simulationStats.currentValue >= simulationStats.initialCapital ? '+' : ''}{formatINR(simulationStats.currentValue - simulationStats.initialCapital)}
                </div>
                <div className="text-sm text-gray-400">{simulationStats.totalTrades} trades</div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-400 text-sm">Holdings</span>
                </div>
                <div className="text-2xl font-bold text-white">{simulationStats.cash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                <div className="text-sm text-gray-400">{simulationStats.holdings.length} positions</div>
              </div>
            </div>

            {/* Portfolio Growth Chart */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Portfolio Growth from ₹1,000
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulationStats.portfolioHistory.map(h => ({
                    date: new Date(h.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    value: h.value,
                    holdings: h.holdings
                  }))}>
                    <defs>
                      <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={10}
                      tickFormatter={v => `₹${(v / 1000).toFixed(1)}K`}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value) => [formatINR(value), 'Value']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      fill="url(#portfolioGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trade History */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  Trade History Log
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {simulationState.tradeHistory.length > 0 ? (
                  <div className="divide-y divide-gray-800">
                    {simulationState.tradeHistory.slice().reverse().slice(0, 20).map((trade) => (
                      <div key={trade.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              trade.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.action === 'BUY' ? <ShoppingCart className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{trade.symbol}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  trade.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {trade.action}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  trade.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {trade.type}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400">
                                {trade.quantity} @ {formatINR(trade.price)} = {formatINR(trade.total)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              {new Date(trade.timestamp).toLocaleTimeString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              Portfolio: {formatINR(trade.portfolioValue)}
                            </div>
                          </div>
                        </div>
                      </div>
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
          </div>
        )}

        {/* Top Picks Section - Show in crypto and stocks tabs */}
        {activeTab !== 'trading' && topPicks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Top Recommended for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPicks.slice(0, 3).map((pick, i) => {
                const colors = recommendationColors[pick.recommendation.action.toLowerCase().replace(' ', '_')] || recommendationColors.hold;
                return (
                  <div 
                    key={i}
                    className={`${colors.bg} border ${colors.border} rounded-2xl p-5 cursor-pointer hover:scale-105 transition-transform`}
                    onClick={() => selectAsset(
                      activeTab === 'crypto' 
                        ? cryptoData.find(c => c.symbol === pick.symbol.toLowerCase())
                        : stockPrices[pick.symbol],
                      activeTab
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-xl font-bold">
                          {pick.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{pick.symbol}</div>
                          <div className="text-sm text-gray-400">{pick.name}</div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full ${colors.bg} ${colors.text} font-bold text-sm`}>
                        {pick.recommendation.action}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">${pick.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className={`text-sm flex items-center gap-1 ${pick.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pick.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {pick.change24h >= 0 ? '+' : ''}{pick.change24h?.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Expected</div>
                        <div className="text-green-400 font-bold">
                          +{pick.prediction.predictedChange}% 
                        </div>
                        <div className="text-xs text-gray-500">
                          {pick.confidence}% confidence
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            {/* Professional Recommendations Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top BUY Signals */}
              <div className="bg-gradient-to-br from-green-900/50 to-green-950/30 rounded-2xl border border-green-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-400">BUY Signals</h3>
                    <p className="text-sm text-gray-400">{buySignals.length} opportunities</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {buySignals.map((signal, i) => (
                    <div key={i} className="bg-black/30 rounded-lg p-3 hover:bg-black/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            signal.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {signal.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{signal.symbol}</div>
                            <div className="text-xs text-gray-400">{signal.type === 'crypto' ? 'Crypto' : 'NSE'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-white text-sm font-bold">{signal.formattedPrice}</div>
                          <div className="text-xs text-green-400">{signal.confidence}% confidence</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTrade(signal, 'BUY')}
                        className="w-full mt-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Buy Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Overview */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Market Overview</h3>
                    <p className="text-sm text-gray-400">Real-time analysis</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400">Indian Stocks</span>
                    <span className="font-bold text-blue-400">{indianStocks.length} tracked</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400">Cryptocurrencies</span>
                    <span className="font-bold text-orange-400">{cryptoData.length} tracked</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400">Active BUY Signals</span>
                    <span className="font-bold text-green-400">{buySignals.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400">Active SELL Signals</span>
                    <span className="font-bold text-red-400">{sellSignals.length}</span>
                  </div>
                </div>
              </div>

              {/* Portfolio Status */}
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-950/30 rounded-2xl border border-purple-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Portfolio Status</h3>
                    <p className="text-sm text-gray-400">Capital allocation</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-black/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Available Cash</div>
                    <div className="text-2xl font-bold text-white">{formatINR(simulationStats.cash)}</div>
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Active Positions</div>
                    <div className="text-2xl font-bold text-white">{simulationStats.holdings.length}</div>
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Total P&L</div>
                    <div className={`text-2xl font-bold ${simulationStats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {simulationStats.totalReturn >= 0 ? '+' : ''}{formatINR(simulationStats.currentValue - simulationStats.initialCapital)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* All Assets Table */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-400" />
                    Complete Asset Analysis
                  </h2>
                  <p className="text-sm text-gray-400">All Indian Stocks & Cryptocurrencies with AI Signals</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm">All</button>
                  <button className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700">Stocks Only</button>
                  <button className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700">Crypto Only</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr className="text-left text-sm text-gray-400">
                      <th className="px-4 py-3 font-medium">Asset</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium text-right">Price</th>
                      <th className="px-4 py-3 font-medium text-right">24h Change</th>
                      <th className="px-4 py-3 font-medium text-center">Signal</th>
                      <th className="px-4 py-3 font-medium text-center">Confidence</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {allAssets.map((asset, i) => {
                      const isBuy = asset.recommendation.action.includes('BUY');
                      return (
                        <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                                asset.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {asset.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-bold text-white">{asset.symbol}</div>
                                <div className="text-xs text-gray-400">{asset.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              asset.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {asset.type === 'crypto' ? 'CRYPTO' : 'NSE STOCK'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-white">{asset.formattedPrice}</td>
                          <td className={`px-4 py-4 text-right font-mono ${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {asset.change24h >= 0 ? '+' : ''}{asset.change24h?.toFixed(2)}%
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                              isBuy
                                ? 'bg-green-500 text-white'
                                : asset.recommendation.action === 'HOLD'
                                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
                            }`}>
                              {asset.recommendation.action}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${asset.confidence >= 65 ? 'bg-green-400' : asset.confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${asset.confidence}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-400">{asset.confidence}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {isBuy ? (
                              <button
                                onClick={() => handleTrade(asset, 'BUY')}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                Buy
                              </button>
                            ) : asset.recommendation.action === 'SELL' || asset.recommendation.action === 'AVOID' ? (
                              <button
                                onClick={() => handleTrade(asset, 'SELL')}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                              >
                                Sell
                              </button>
                            ) : (
                              <span className="text-gray-500 text-sm">Hold</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid - Only show for crypto and stocks tabs */}
        {(activeTab === 'crypto' || activeTab === 'stocks') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset List */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    {activeTab === 'crypto' ? <Zap className="w-5 h-5 text-orange-400" /> : <TrendingUp className="w-5 h-5 text-blue-400" />}
                    {activeTab === 'crypto' ? 'Cryptocurrencies' : 'Indian Stocks (NSE)'}
                  </h2>
                </div>
                <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
                  {(activeTab === 'crypto' ? cryptoData : indianStocks).map((asset, i) => {
                    const isSelected = selectedAsset?.symbol === (asset.symbol || asset.id);
                    const prices = asset.sparkline_in_7d?.price || Array(30).fill(asset.price || 100);
                    const prediction = generatePrediction(prices);
                    const rec = asset.recommendation || getRecommendation({ ...asset, prices });
                    const colors = recommendationColors[rec.action?.toLowerCase()] || recommendationColors.hold;
                    
                    return (
                      <div 
                        key={asset.id || asset.symbol}
                        className={`p-4 hover:bg-gray-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-gray-800' : ''}`}
                        onClick={() => selectAsset(asset, activeTab)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              activeTab === 'crypto' 
                                ? 'bg-orange-500/20 text-orange-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            {(asset.symbol || asset.id || '').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold">{asset.symbol?.toUpperCase() || asset.id}</div>
                            <div className="text-sm text-gray-400">{asset.name}</div>
                          </div>
                        </div>
                        
                        <div className="hidden sm:block w-20 h-8">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={prices.slice(-24).map((p, i) => ({ v: p }))}>
                                <Area type="monotone" dataKey="v" stroke={rec.action.includes('BUY') ? '#22c55e' : rec.action === 'HOLD' ? '#eab308' : '#ef4444'} fill="none" strokeWidth={1.5} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-mono font-bold">
                              {activeTab === 'crypto' 
                                ? `$${asset.current_price?.toLocaleString()}`
                                : `₹${asset.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              }
                            </div>
                            <div className={`text-sm ${(asset.price_change_percentage_24h || asset.change24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(asset.price_change_percentage_24h || asset.change24h || 0) >= 0 ? '+' : ''}
                              {(asset.price_change_percentage_24h || asset.change24h || 0)?.toFixed(2)}%
                            </div>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-lg ${colors.bg} ${colors.text} font-bold text-sm min-w-[80px] text-center`}>
                            {rec.action}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Prediction Panel */}
            <div className="space-y-6">
              {selectedAsset ? (
                <>
                  {/* Asset Header */}
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                          selectedAsset.type === 'crypto' 
                            ? 'bg-orange-500/20 text-orange-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {selectedAsset.symbol?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{selectedAsset.symbol?.toUpperCase()}</h3>
                          <p className="text-gray-400 text-sm">{selectedAsset.name}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-xl ${
                        currentPrediction?.signal.includes('buy') 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : currentPrediction?.signal.includes('sell')
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      } font-bold text-lg`}>
                        {currentPrediction?.signal.toUpperCase().replace('_', ' ')}
                      </div>
                    </div>
                    
                    <div className="text-3xl font-bold mb-2">
                      ${selectedAsset.current_price?.toLocaleString() || selectedAsset.price?.toFixed(2)}
                    </div>
                    <div className={`text-lg flex items-center gap-1 ${
                      (selectedAsset.price_change_percentage_24h || selectedAsset.changePercent) >= 0 
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(selectedAsset.price_change_percentage_24h || selectedAsset.changePercent) >= 0 
                        ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      {(selectedAsset.price_change_percentage_24h || selectedAsset.changePercent) >= 0 ? '+' : ''}
                      {(selectedAsset.price_change_percentage_24h || selectedAsset.changePercent)?.toFixed(2)}%
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-400" />
                      Price History & Prediction
                    </h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={assetHistory.map(h => ({ date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), price: h.close }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                          <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={v => `$${v.toLocaleString()}`} />
                          <Tooltip 
                            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                            formatter={(v) => [`$${v?.toLocaleString()}`, 'Price']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke={currentPrediction?.signal.includes('buy') ? '#22c55e' : currentPrediction?.signal.includes('sell') ? '#ef4444' : '#eab308'} 
                            fill="currentColor" 
                            fillOpacity={0.2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Prediction Details */}
                  {currentPrediction && (
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        AI Analysis
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-800/50 rounded-xl p-4">
                            <div className="text-gray-400 text-sm mb-1">Confidence</div>
                            <div className="text-2xl font-bold text-blue-400">{currentPrediction.confidence}%</div>
                          </div>
                          <div className="bg-gray-800/50 rounded-xl p-4">
                            <div className="text-gray-400 text-sm mb-1">Score</div>
                            <div className="text-2xl font-bold">{currentPrediction.score}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-800/50 rounded-xl p-4">
                            <div className="text-gray-400 text-sm mb-1">RSI (14)</div>
                            <div className={`text-xl font-bold ${
                              currentPrediction.rsi > 70 ? 'text-red-400' : 
                              currentPrediction.rsi < 30 ? 'text-green-400' : 'text-white'
                            }`}>
                              {currentPrediction.rsi}
                              <span className="text-sm text-gray-400 ml-2">
                                {currentPrediction.rsi > 70 ? 'Overbought' : currentPrediction.rsi < 30 ? 'Oversold' : 'Neutral'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-800/50 rounded-xl p-4">
                            <div className="text-gray-400 text-sm mb-1">Volatility</div>
                            <div className="text-xl font-bold text-yellow-400">
                              {currentPrediction.volatility}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <div className="text-gray-400 text-sm mb-2">Trend</div>
                          <div className="flex items-center gap-2">
                            {currentPrediction.trend.includes('up') ? (
                              <TrendingUp className="w-6 h-6 text-green-400" />
                            ) : currentPrediction.trend.includes('down') ? (
                              <TrendingDown className="w-6 h-6 text-red-400" />
                            ) : (
                              <TrendingUp className="w-6 h-6 text-yellow-400" />
                            )}
                            <span className="font-bold capitalize">{currentPrediction.trend.replace('_', ' ')}</span>
                          </div>
                        </div>
                        
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="font-bold text-green-400">Why this signal?</span>
                          </div>
                          <ul className="text-sm text-gray-300 space-y-1">
                            {currentPrediction.reasons.map((reason, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-green-400">•</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forecast */}
                  {currentPrediction?.predictions && (
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        7-Day Price Forecast
                      </h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={currentPrediction.predictions}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9ca3af" fontSize={10} />
                            <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={v => `$${v.toLocaleString()}`} />
                            <Tooltip 
                              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                              formatter={(v) => [`$${v?.toFixed(2)}`, 'Predicted Price']}
                            />
                            <Bar dataKey="price" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-gray-400">Target Price:</span>
                        <span className="font-bold text-green-400">
                          ${currentPrediction.targetPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center">
                  <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Select an Asset</h3>
                  <p className="text-gray-400">Click on any cryptocurrency or stock to see detailed AI predictions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Recommendation Table - Only show for crypto and stocks tabs */}
        {(activeTab === 'crypto' || activeTab === 'stocks') && (
          <div className="mt-8 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Quick Recommendation Summary
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium text-right">Price</th>
                    <th className="px-4 py-3 font-medium text-right">24h Change</th>
                    <th className="px-4 py-3 font-medium text-center">Signal</th>
                    <th className="px-4 py-3 font-medium text-center">Confidence</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {allAssets.slice(0, 15).map((rec, i) => {
                    const colors = recommendationColors[rec.recommendation.action?.toLowerCase()] || recommendationColors.hold;
                    const isBuy = rec.recommendation.action?.includes('BUY');
                    return (
                      <tr key={i} className="hover:bg-gray-800/50 cursor-pointer" onClick={() => selectAsset(
                        activeTab === 'crypto'
                          ? cryptoData.find(c => c.symbol === rec.symbol.toLowerCase())
                          : indianStocks.find(s => s.symbol === rec.symbol),
                        activeTab
                      )}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              rec.type === 'crypto' 
                                ? 'bg-orange-500/20 text-orange-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {rec.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold">{rec.symbol}</div>
                              <div className="text-xs text-gray-400">{rec.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rec.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {rec.type === 'crypto' ? 'CRYPTO' : 'NSE'}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-right">
                          {rec.type === 'crypto' 
                            ? `$${rec.price?.toLocaleString()}`
                            : `₹${rec.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          }
                        </td>
                        <td className={`px-4 py-4 text-right ${rec.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {rec.change24h >= 0 ? '+' : ''}{rec.change24h?.toFixed(2)}%
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full ${colors.bg} ${colors.text} font-bold text-sm`}>
                            {rec.recommendation.action}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${rec.confidence >= 65 ? 'bg-green-400' : rec.confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${rec.confidence}%` }}
                              />
                            </div>
                            <span className="text-sm">{rec.confidence}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {isBuy ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleTrade(rec, 'BUY'); }}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Buy
                            </button>
                          ) : rec.recommendation.action === 'SELL' || rec.recommendation.action === 'AVOID' ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleTrade(rec, 'SELL'); }}
                              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                            >
                              Sell
                            </button>
                          ) : (
                            <span className="text-gray-500 text-sm">Hold</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
