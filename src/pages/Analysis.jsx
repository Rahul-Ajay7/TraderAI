import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings2,
  ChevronDown
} from 'lucide-react';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochastic,
  getTechnicalSignal
} from '../utils/technicalAnalysis';

const TechnicalIndicator = ({ label, value, status, description }) => {
  const getStatusColor = () => {
    if (status === 'bullish') return 'text-accent-success';
    if (status === 'bearish') return 'text-accent-danger';
    return 'text-gray-400';
  };
  
  const getStatusIcon = () => {
    if (status === 'bullish') return <TrendingUp className="w-4 h-4" />;
    if (status === 'bearish') return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={getStatusColor()}>{getStatusIcon()}</div>
        <span className="text-gray-300">{label}</span>
      </div>
      <div className="text-right">
        <div className={`font-mono font-medium ${getStatusColor()}`}>{value}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </div>
  );
};

const CandlestickChart = ({ data }) => {
  const candles = data.slice(-60).map((d, i) => {
    const prevClose = i > 0 ? data.slice(-60)[i - 1].close : d.close;
    const isGreen = d.close >= d.open;
    const isRed = d.close < d.open;
    
    return {
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: isGreen ? '#10b981' : isRed ? '#ef4444' : '#9ca3af',
      bodyTop: isGreen ? d.close : d.open,
      bodyBottom: isGreen ? d.open : d.close,
      bodyHeight: Math.abs(d.close - d.open),
      wickTop: d.high,
      wickBottom: d.low,
      shadowTop: d.high - Math.max(d.close, d.open),
      shadowBottom: Math.min(d.close, d.open) - d.low
    };
  });
  
  const minPrice = Math.min(...candles.map(c => c.low)) * 0.99;
  const maxPrice = Math.max(...candles.map(c => c.high)) * 1.01;
  
  return (
    <div className="w-full h-full">
      <ResponsiveContainer>
        <ComposedChart data={candles} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280" 
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={[minPrice, maxPrice]}
            stroke="#6b7280" 
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickFormatter={v => `$${v.toLocaleString()}`}
          />
          <Tooltip 
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            formatter={(value) => [`$${value?.toLocaleString()}`, '']}
          />
          <ReferenceLine y={candles[candles.length - 1]?.close} stroke="#3b82f6" strokeDasharray="3 3" />
          
          {candles.map((candle, i) => (
            <React.Fragment key={i}>
              <ReferenceLine
                segment={[
                  { x: candle.date, y: candle.wickBottom },
                  { x: candle.date, y: candle.wickTop }
                ]}
                stroke={candle.color}
                strokeWidth={1}
              />
              <ReferenceLine
                segment={[
                  { x: candle.date, y: candle.bodyTop },
                  { x: candle.date, y: candle.bodyBottom }
                ]}
                stroke={candle.color}
                strokeWidth={8}
                strokeOpacity={0.8}
              />
            </React.Fragment>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const Analysis = () => {
  const { marketData, selectedCategory, selectedSymbol, selectAsset } = useApp();
  const [timeframe, setTimeframe] = useState('1D');
  const [showSettings, setShowSettings] = useState(false);
  const [indicators, setIndicators] = useState({
    sma20: true,
    sma50: true,
    ema12: true,
    bb: true,
    volume: true
  });
  
  const asset = useMemo(() => {
    if (!marketData) return null;
    return marketData[selectedCategory]?.[selectedSymbol] || null;
  }, [marketData, selectedCategory, selectedSymbol]);
  
  const chartData = useMemo(() => {
    if (!asset?.data) return [];
    
    const closes = asset.data.map(d => d.close);
    const highs = asset.data.map(d => d.high);
    const lows = asset.data.map(d => d.low);
    const volumes = asset.data.map(d => d.volume);
    
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const bb = calculateBollingerBands(closes);
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    
    const offset = closes.length - sma20.length;
    const bbOffset = closes.length - bb.upper.length;
    
    return asset.data.map((d, i) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sma20: i >= offset ? sma20[i - offset] : null,
      sma50: i >= offset ? sma50[i - offset] : null,
      ema12: ema12[i],
      ema26: ema26[i],
      bbUpper: i >= bbOffset ? bb.upper[i - bbOffset] : null,
      bbMiddle: i >= bbOffset ? bb.middle[i - bbOffset] : null,
      bbLower: i >= bbOffset ? bb.lower[i - bbOffset] : null,
      rsi: rsi[i],
      macd: macd.macd[i],
      macdSignal: i >= macd.offset ? macd.signal[i - macd.offset] : null,
      macdHistogram: macd.histogram[i]
    }));
  }, [asset]);
  
  const latestIndicators = useMemo(() => {
    if (!asset?.data) return null;
    
    const closes = asset.data.map(d => d.close);
    const highs = asset.data.map(d => d.high);
    const lows = asset.data.map(d => d.low);
    const volumes = asset.data.map(d => d.volume);
    
    const latest = closes.length - 1;
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes);
    const stoch = calculateStochastic(highs, lows, closes);
    
    const latestSMA = sma20[sma20.length - 1];
    const latestSMA50 = sma50[sma50.length - 1];
    const latestPrice = closes[latest];
    const latestRSI = rsi[latest];
    const latestMACD = macd.macd[latest];
    const latestSignal = latest - macd.offset >= 0 ? macd.signal[latest - macd.offset] : null;
    const latestBB = {
      upper: bb.upper[bb.upper.length - 1],
      lower: bb.lower[bb.lower.length - 1]
    };
    const latestStochK = stoch.k[stoch.k.length - 1];
    const latestStochD = stoch.d[stoch.d.length - 1];
    
    const technicalSignal = getTechnicalSignal({
      rsi: latestRSI,
      macdHistogram: latestMACD - (latestSignal || 0),
      price: latestPrice,
      sma20: latestSMA,
      sma50: latestSMA50,
      bbUpper: latestBB.upper,
      bbLower: latestBB.lower
    });
    
    const atr = calculateATR(highs, lows, closes);
    
    return {
      price: latestPrice,
      sma20: latestSMA,
      sma50: latestSMA50,
      rsi: latestRSI,
      macd: latestMACD,
      macdSignal: latestSignal,
      macdHistogram: latestMACD - (latestSignal || 0),
      bbUpper: latestBB.upper,
      bbLower: latestBB.lower,
      bbWidth: ((latestBB.upper - latestBB.lower) / latestPrice) * 100,
      stochK: latestStochK,
      stochD: latestStochD,
      atr: atr[atr.length - 1],
      atrPercent: (atr[atr.length - 1] / latestPrice) * 100,
      signal: technicalSignal,
      volume: volumes[latest],
      avgVolume: volumes.slice(-20).reduce((a, b) => a + b, 0) / 20,
      volumeRatio: volumes[latest] / (volumes.slice(-20).reduce((a, b) => a + b, 0) / 20)
    };
  }, [asset]);
  
  if (!asset) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Select an asset to analyze</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            selectedCategory === 'crypto' ? 'bg-accent-warning/20' :
            selectedCategory === 'commodities' ? 'bg-accent-secondary/20' :
            'bg-accent-primary/20'
          }`}>
            <BarChart2 className={`w-6 h-6 ${
              selectedCategory === 'crypto' ? 'text-accent-warning' :
              selectedCategory === 'commodities' ? 'text-accent-secondary' :
              'text-accent-primary'
            }`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedSymbol}</h1>
            <p className="text-gray-400">{asset.name}</p>
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-white font-mono">
              ${asset.price?.toLocaleString()}
            </div>
            <div className={`text-sm flex items-center gap-1 ${asset.changePercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
              {asset.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent?.toFixed(2)}%
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-dark-700 rounded-lg p-1">
            {['1H', '4H', '1D', '1W', '1M'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeframe === tf ? 'bg-accent-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-accent-primary text-white' : 'bg-dark-700 text-gray-400 hover:text-white'}`}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {showSettings && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Chart Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(indicators).map(([key, enabled]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setIndicators({ ...indicators, [key]: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-dark-700 text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-gray-300 capitalize">{key}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['auto', 'auto']}
                stroke="#6b7280" 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickFormatter={v => `$${v.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(value) => [`$${value?.toLocaleString()}`, '']}
              />
              
              {indicators.bb && (
                <>
                  <Area
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="transparent"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="bbLower"
                    stroke="transparent"
                    fill="#1f2937"
                    fillOpacity={1}
                  />
                </>
              )}
              
              <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
              
              {indicators.sma20 && (
                <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1} dot={false} />
              )}
              {indicators.sma50 && (
                <Line type="monotone" dataKey="sma50" stroke="#8b5cf6" strokeWidth={1} dot={false} />
              )}
              {indicators.ema12 && (
                <Line type="monotone" dataKey="ema12" stroke="#10b981" strokeWidth={1} dot={false} />
              )}
              
              {indicators.volume && (
                <Bar dataKey="volume" fill="#6b7280" opacity={0.3} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Technical Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestIndicators && (
                <>
                  <TechnicalIndicator
                    label="RSI (14)"
                    value={latestIndicators.rsi?.toFixed(1)}
                    status={latestIndicators.rsi > 70 ? 'bearish' : latestIndicators.rsi < 30 ? 'bullish' : 'neutral'}
                    description={latestIndicators.rsi > 70 ? 'Overbought' : latestIndicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                  />
                  <TechnicalIndicator
                    label="MACD"
                    value={latestIndicators.macd?.toFixed(2)}
                    status={latestIndicators.macdHistogram > 0 ? 'bullish' : 'bearish'}
                    description={`Signal: ${latestIndicators.macdSignal?.toFixed(2)}`}
                  />
                  <TechnicalIndicator
                    label="SMA 20"
                    value={`$${latestIndicators.sma20?.toLocaleString()}`}
                    status={latestIndicators.price > latestIndicators.sma20 ? 'bullish' : 'bearish'}
                    description={latestIndicators.price > latestIndicators.sma20 ? 'Above SMA' : 'Below SMA'}
                  />
                  <TechnicalIndicator
                    label="SMA 50"
                    value={`$${latestIndicators.sma50?.toLocaleString()}`}
                    status={latestIndicators.price > latestIndicators.sma50 ? 'bullish' : 'bearish'}
                    description={latestIndicators.price > latestIndicators.sma50 ? 'Above SMA' : 'Below SMA'}
                  />
                  <TechnicalIndicator
                    label="Bollinger Bands"
                    value={`${latestIndicators.bbWidth?.toFixed(1)}%`}
                    status="neutral"
                    description={`Width (Volatility)`}
                  />
                  <TechnicalIndicator
                    label="Stochastic %K"
                    value={latestIndicators.stochK?.toFixed(1)}
                    status={latestIndicators.stochK > 80 ? 'bearish' : latestIndicators.stochK < 20 ? 'bullish' : 'neutral'}
                    description={`%D: ${latestIndicators.stochD?.toFixed(1)}`}
                  />
                  <TechnicalIndicator
                    label="ATR"
                    value={`$${latestIndicators.atr?.toFixed(2)}`}
                    status="neutral"
                    description={`${latestIndicators.atrPercent?.toFixed(2)}% of price`}
                  />
                  <TechnicalIndicator
                    label="Volume Ratio"
                    value={`${latestIndicators.volumeRatio?.toFixed(2)}x`}
                    status={latestIndicators.volumeRatio > 1.5 ? 'bullish' : latestIndicators.volumeRatio < 0.5 ? 'bearish' : 'neutral'}
                    description={latestIndicators.volumeRatio > 1 ? 'Above Average' : 'Below Average'}
                  />
                </>
              )}
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">RSI Chart</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} hide />
                  <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 10 }} />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
                  <Tooltip 
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value) => [value?.toFixed(1), 'RSI']}
                  />
                  <Area type="monotone" dataKey="rsi" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">MACD Chart</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} hide />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value) => [value?.toFixed(2), '']}
                  />
                  <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="macdSignal" stroke="#ef4444" strokeWidth={1} dot={false} />
                  <Bar dataKey="macdHistogram" fill="#10b981">
                    {chartData.map((entry, i) => (
                      <rect key={i} fill={entry.macdHistogram >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-dark-800 to-dark-900 border-accent-primary/30">
            <div className="flex items-center gap-2 mb-4">
              {latestIndicators?.signal.overallSignal.includes('Buy') ? (
                <CheckCircle className="w-6 h-6 text-accent-success" />
              ) : latestIndicators?.signal.overallSignal.includes('Sell') ? (
                <XCircle className="w-6 h-6 text-accent-danger" />
              ) : (
                <Target className="w-6 h-6 text-accent-warning" />
              )}
              <h3 className="text-lg font-semibold text-white">AI Signal</h3>
            </div>
            <div className={`text-2xl font-bold mb-4 ${
              latestIndicators?.signal.overallSignal.includes('Buy') ? 'text-accent-success' :
              latestIndicators?.signal.overallSignal.includes('Sell') ? 'text-accent-danger' :
              'text-accent-warning'
            }`}>
              {latestIndicators?.signal.overallSignal || 'Neutral'}
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              Score: {latestIndicators?.signal.score || 0}
            </div>
            <div className="text-gray-400 text-sm mb-4">Overall Technical Score (-10 to +10)</div>
            
            <div className="space-y-2">
              {latestIndicators?.signal.signals.map((sig, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {sig.severity === 'high' ? (
                    <AlertTriangle className={`w-4 h-4 ${sig.signal.includes('Buy') || sig.signal.includes('Bull') || sig.signal.includes('Over') ? 'text-accent-success' : 'text-accent-danger'}`} />
                  ) : (
                    <Activity className={`w-4 h-4 ${sig.signal.includes('Buy') || sig.signal.includes('Bull') || sig.signal.includes('Over') ? 'text-accent-success' : 'text-accent-danger'}`} />
                  )}
                  <span className="text-gray-300">{sig.indicator}:</span>
                  <span className={sig.signal.includes('Buy') || sig.signal.includes('Bull') || sig.signal.includes('Over') ? 'text-accent-success' : 'text-accent-danger'}>
                    {sig.signal}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-dark-600">
                <span className="text-gray-400">High 52W</span>
                <span className="text-white font-mono">${Math.max(...asset.data.map(d => d.high)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dark-600">
                <span className="text-gray-400">Low 52W</span>
                <span className="text-white font-mono">${Math.min(...asset.data.map(d => d.low)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dark-600">
                <span className="text-gray-400">Avg Volume</span>
                <span className="text-white font-mono">{(latestIndicators?.avgVolume / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dark-600">
                <span className="text-gray-400">Market Cap</span>
                <span className="text-white font-mono">{(asset.basePrice * 1000000000 / asset.basePrice * asset.price).toLocaleString().slice(0, 10)}B</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Volatility</span>
                <span className="text-white font-mono">{(asset.volatility * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Asset Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Category</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedCategory === 'crypto' ? 'bg-accent-warning/20 text-accent-warning' :
                  selectedCategory === 'commodities' ? 'bg-accent-secondary/20 text-accent-secondary' :
                  'bg-accent-primary/20 text-accent-primary'
                }`}>
                  {selectedCategory}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Base Price</span>
                <span className="text-white font-mono">${asset.basePrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Price Change</span>
                <span className={asset.changePercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}>
                  {asset.changePercent >= 0 ? '+' : ''}{asset.change?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Data Points</span>
                <span className="text-white font-mono">{asset.data.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
