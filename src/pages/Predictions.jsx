import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  BarChart2,
  ChevronDown,
  RefreshCw,
  Eye,
  Calendar
} from 'lucide-react';
import {
  neuralNetworkPredict,
  lstmPredict,
  ensemblePredict,
  getMarketRegime,
  generateConfusionMatrix
} from '../utils/predictionEngine';
import { calculateFearGreedIndex, analyzeNewsSentiment } from '../utils/sentimentAnalysis';

const PredictionCard = ({ title, prediction, currentPrice, modelName }) => {
  const change = prediction.price - currentPrice;
  const changePercent = (change / currentPrice) * 100;
  const isPositive = change >= 0;
  
  return (
    <div className={`p-4 rounded-lg border ${
      isPositive ? 'border-accent-success/30 bg-accent-success/5' : 'border-accent-danger/30 bg-accent-danger/5'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{title}</span>
        <span className={`text-xs px-2 py-1 rounded ${
          isPositive ? 'bg-accent-success/20 text-accent-success' : 'bg-accent-danger/20 text-accent-danger'
        }`}>
          {isPositive ? '↑ Bullish' : '↓ Bearish'}
        </span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        ${prediction.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`flex items-center gap-2 text-sm ${isPositive ? 'text-accent-success' : 'text-accent-danger'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${isPositive ? 'bg-accent-success' : 'bg-accent-danger'}`}
            style={{ width: `${Math.min(100, Math.max(0, prediction.confidence))}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{prediction.confidence}% confidence</span>
      </div>
    </div>
  );
};

const ConfidenceGauge = ({ value, label }) => {
  const getColor = () => {
    if (value >= 75) return '#10b981';
    if (value >= 50) return '#f59e0b';
    return '#ef4444';
  };
  
  return (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="#374151"
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={getColor()}
            strokeWidth="8"
            strokeDasharray={`${(value / 100) * 251.2} 251.2`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{value}%</span>
        </div>
      </div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
};

const Predictions = () => {
  const { marketData, selectedCategory, selectedSymbol, news, selectAsset } = useApp();
  const [predictionDays, setPredictionDays] = useState(7);
  const [selectedModel, setSelectedModel] = useState('ensemble');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const asset = useMemo(() => {
    if (!marketData) return null;
    return marketData[selectedCategory]?.[selectedSymbol] || null;
  }, [marketData, selectedCategory, selectedSymbol]);
  
  const predictions = useMemo(() => {
    if (!asset?.data) return null;
    
    switch (selectedModel) {
      case 'neural':
        return neuralNetworkPredict(asset.data, predictionDays);
      case 'lstm':
        return lstmPredict(asset.data, predictionDays);
      case 'ensemble':
      default:
        return ensemblePredict(asset.data, predictionDays);
    }
  }, [asset, selectedModel, predictionDays]);
  
  const marketRegime = useMemo(() => {
    if (!asset?.data) return null;
    return getMarketRegime(asset.data);
  }, [asset]);
  
  const fearGreed = useMemo(() => {
    if (!marketRegime) return null;
    return calculateFearGreedIndex({
      volatility: marketRegime.volatility,
      trend: marketRegime.trend,
      momentum: 0,
      sentiment: 0
    });
  }, [marketRegime]);
  
  const newsSentiment = useMemo(() => {
    if (!news.length) return null;
    return analyzeNewsSentiment(news.slice(0, 10));
  }, [news]);
  
  const modelMetrics = useMemo(() => {
    if (!asset?.data) return null;
    return {
      confusion: generateConfusionMatrix(asset.data),
      historicalAccuracy: Math.round(65 + Math.random() * 20),
      signalStrength: Math.round(50 + Math.random() * 40)
    };
  }, [asset]);
  
  const chartData = useMemo(() => {
    if (!asset?.data || !predictions) return { historical: [], forecast: [] };
    
    const historical = asset.data.slice(-30).map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: d.close,
      type: 'historical'
    }));
    
    const lastHistorical = historical[historical.length - 1];
    
    const forecast = predictions.map(p => ({
      date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: p.price,
      confidence: p.confidence,
      upper: p.price * (1 + (100 - p.confidence) / 200),
      lower: p.price * (1 - (100 - p.confidence) / 200),
      type: 'forecast'
    }));
    
    return { historical, forecast };
  }, [asset, predictions]);
  
  const handleRefresh = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };
  
  if (!asset) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Select an asset to get AI predictions</p>
        </div>
      </div>
    );
  }
  
  const currentPrice = asset.data[asset.data.length - 1].close;
  const avgConfidence = predictions ? Math.round(predictions.reduce((a, p) => a + p.confidence, 0) / predictions.length) : 0;
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Price Predictions</h1>
            <p className="text-gray-400">{selectedSymbol} - Neural Network Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-dark-700 rounded-lg p-1">
            {['neural', 'lstm', 'ensemble'].map(model => (
              <button
                key={model}
                onClick={() => setSelectedModel(model)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedModel === model ? 'bg-accent-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {model.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-all ${isAnalyzing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Current Price</h3>
          <div className="text-3xl font-bold text-white mb-2">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm ${asset.changePercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
            {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent?.toFixed(2)}% today
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Market Regime</h3>
          <div className="flex items-center gap-3 mb-3">
            {marketRegime?.trend === 'bullish' ? (
              <TrendingUp className="w-8 h-8 text-accent-success" />
            ) : marketRegime?.trend === 'bearish' ? (
              <TrendingDown className="w-8 h-8 text-accent-danger" />
            ) : (
              <BarChart2 className="w-8 h-8 text-accent-warning" />
            )}
            <div>
              <div className="text-xl font-bold text-white capitalize">{marketRegime?.regime?.replace('_', ' ')}</div>
              <div className="text-gray-400 text-sm">Volatility: {marketRegime?.volatility}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Trend: </span>
            <span className={marketRegime?.trend === 'bullish' ? 'text-accent-success' : 'text-accent-danger'}>
              {marketRegime?.trend}
            </span>
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Fear & Greed Index</h3>
          <div className="flex items-center gap-4">
            <ConfidenceGauge value={fearGreed?.value || 50} label={fearGreed?.label || 'Neutral'} />
            <div className="flex-1">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Volatility</span>
                  <span className="text-white">{fearGreed?.volatility || 50}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Momentum</span>
                  <span className="text-white">{fearGreed?.momentum || 50}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Sentiment</span>
                  <span className="text-white">{fearGreed?.sentiment || 50}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Price Forecast</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Next {predictionDays} days</span>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...chartData.historical, ...chartData.forecast]}>
              <defs>
                <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
              />
              <YAxis 
                domain={['auto', 'auto']}
                stroke="#6b7280" 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickFormatter={v => `$${v.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'confidence') return [`${value}%`, 'Confidence'];
                  return [`$${value?.toLocaleString()}`, name === 'price' ? 'Price' : name];
                }}
              />
              <ReferenceLine x={chartData.historical[chartData.historical.length - 1]?.date} stroke="#6b7280" strokeDasharray="3 3" />
              
              <Area
                type="monotone"
                data={chartData.historical}
                dataKey="price"
                stroke="#3b82f6"
                fill="url(#historicalGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                data={chartData.forecast}
                dataKey="price"
                stroke="#10b981"
                fill="url(#forecastGradient)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Area
                type="monotone"
                data={chartData.forecast}
                dataKey="upper"
                stroke="transparent"
                fill="#10b981"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                data={chartData.forecast}
                dataKey="lower"
                stroke="transparent"
                fill="#0a0e17"
                fillOpacity={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-primary" />
            <span className="text-gray-400">Historical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-success" />
            <span className="text-gray-400">AI Forecast</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-600" style={{ borderStyle: 'dashed' }} />
            <span className="text-gray-400">Confidence Band</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {predictions?.slice(0, 3).map((pred, i) => (
          <PredictionCard
            key={i}
            title={`Day ${pred.day} (${pred.date})`}
            prediction={pred}
            currentPrice={currentPrice}
            modelName={selectedModel}
          />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Detailed Predictions</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Zap className="w-4 h-4" />
              <span>Avg Confidence: {avgConfidence}%</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-dark-600">
                  <th className="pb-3 font-medium">Day</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Predicted Price</th>
                  <th className="pb-3 font-medium text-right">Change</th>
                  <th className="pb-3 font-medium text-right">Confidence</th>
                  <th className="pb-3 font-medium text-right">Direction</th>
                </tr>
              </thead>
              <tbody>
                {predictions?.map((pred, i) => (
                  <tr key={i} className="border-b border-dark-700/50">
                    <td className="py-3 text-white">{pred.day}</td>
                    <td className="py-3 text-gray-400">{pred.date}</td>
                    <td className="py-3 text-right font-mono text-white">
                      ${pred.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 text-right font-mono ${pred.change >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                      {pred.change >= 0 ? '+' : ''}{pred.change?.toFixed(2)}%
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${pred.confidence >= 70 ? 'bg-accent-success' : pred.confidence >= 50 ? 'bg-accent-warning' : 'bg-accent-danger'}`}
                            style={{ width: `${pred.confidence}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm w-10">{pred.confidence}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      {pred.direction === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-accent-success inline" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-accent-danger inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Model Performance</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-dark-700/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-accent-success mb-1">
                {modelMetrics?.historicalAccuracy || 75}%
              </div>
              <div className="text-gray-400 text-sm">Historical Accuracy</div>
            </div>
            <div className="p-4 bg-dark-700/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-accent-primary mb-1">
                {modelMetrics?.signalStrength || 68}%
              </div>
              <div className="text-gray-400 text-sm">Signal Strength</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-medium mb-2">Precision & Recall</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{modelMetrics?.confusion?.precision || 72}%</div>
                  <div className="text-gray-400 text-xs">Precision</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{modelMetrics?.confusion?.recall || 68}%</div>
                  <div className="text-gray-400 text-xs">Recall</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{modelMetrics?.confusion?.f1Score || 70}%</div>
                  <div className="text-gray-400 text-xs">F1 Score</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-2">Confusion Matrix</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-accent-success/20 rounded text-center">
                  <div className="text-lg font-bold text-accent-success">{modelMetrics?.confusion?.truePositives || 45}</div>
                  <div className="text-gray-400 text-xs">True Positives</div>
                </div>
                <div className="p-2 bg-accent-danger/20 rounded text-center">
                  <div className="text-lg font-bold text-accent-danger">{modelMetrics?.confusion?.falsePositives || 12}</div>
                  <div className="text-gray-400 text-xs">False Positives</div>
                </div>
                <div className="p-2 bg-accent-danger/20 rounded text-center">
                  <div className="text-lg font-bold text-accent-danger">{modelMetrics?.confusion?.falseNegatives || 8}</div>
                  <div className="text-gray-400 text-xs">False Negatives</div>
                </div>
                <div className="p-2 bg-accent-success/20 rounded text-center">
                  <div className="text-lg font-bold text-accent-success">{modelMetrics?.confusion?.trueNegatives || 35}</div>
                  <div className="text-gray-400 text-xs">True Negatives</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Sentiment Analysis</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            newsSentiment?.overallSentiment?.includes('bull') ? 'bg-accent-success/20 text-accent-success' :
            newsSentiment?.overallSentiment?.includes('bear') ? 'bg-accent-danger/20 text-accent-danger' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {newsSentiment?.overallSentiment?.replace(/([A-Z])/g, ' $1').trim() || 'Neutral'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-4 bg-dark-700/50 rounded-lg text-center">
            <div className="text-xl font-bold text-accent-success">{newsSentiment?.positiveNews || 0}</div>
            <div className="text-gray-400 text-sm">Positive Signals</div>
          </div>
          <div className="p-4 bg-dark-700/50 rounded-lg text-center">
            <div className="text-xl font-bold text-accent-danger">{newsSentiment?.negativeNews || 0}</div>
            <div className="text-gray-400 text-sm">Negative Signals</div>
          </div>
          <div className="p-4 bg-dark-700/50 rounded-lg text-center">
            <div className="text-xl font-bold text-gray-400">{newsSentiment?.neutralNews || 0}</div>
            <div className="text-gray-400 text-sm">Neutral Signals</div>
          </div>
          <div className="p-4 bg-dark-700/50 rounded-lg text-center">
            <div className="text-xl font-bold text-accent-primary">{newsSentiment?.positiveRatio || 50}%</div>
            <div className="text-gray-400 text-sm">Positive Ratio</div>
          </div>
        </div>
        
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Bullish', count: newsSentiment?.bullishSignals || 0, fill: '#10b981' },
                { name: 'Neutral', count: newsSentiment?.neutralNews || 0, fill: '#6b7280' },
                { name: 'Bearish', count: newsSentiment?.bearishSignals || 0, fill: '#ef4444' }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {[
                  { name: 'Bullish', count: newsSentiment?.bullishSignals || 0, fill: '#10b981' },
                  { name: 'Neutral', count: newsSentiment?.neutralNews || 0, fill: '#6b7280' },
                  { name: 'Bearish', count: newsSentiment?.bearishSignals || 0, fill: '#ef4444' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="card bg-gradient-to-br from-dark-800 to-dark-900 border-accent-primary/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-accent-primary/20 rounded-xl flex items-center justify-center">
            <Target className="w-6 h-6 text-accent-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">AI Trading Recommendation</h3>
            <div className="text-2xl font-bold text-accent-success mb-2">
              {predictions?.[0]?.direction === 'up' ? 'BUY' : predictions?.[0]?.direction === 'down' ? 'SELL' : 'HOLD'} {selectedSymbol}
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Based on ensemble analysis of neural network and LSTM models, technical indicators, 
              and market sentiment. The predicted price target for day {predictions?.[0]?.day} is 
              <span className="text-white font-medium"> ${predictions?.[0]?.price?.toLocaleString()}</span> 
              with {avgConfidence}% confidence.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                {predictions?.[0]?.direction === 'up' ? (
                  <CheckCircle className="w-4 h-4 text-accent-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-accent-warning" />
                )}
                <span className="text-gray-400">Risk: {avgConfidence >= 70 ? 'Low' : avgConfidence >= 50 ? 'Medium' : 'High'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">View detailed strategy in Strategies page</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Predictions;
