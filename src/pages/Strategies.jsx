import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  Clock,
  Award,
  ChevronRight,
  CheckCircle,
  XCircle,
  BarChart2,
  BookOpen,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import { strategies, getStrategyRecommendations, backtestStrategy } from '../utils/tradingStrategies';

const StrategyCard = ({ strategy, isActive, onClick }) => {
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'veryLow': return 'text-accent-success bg-accent-success/20';
      case 'low': return 'text-accent-success bg-accent-success/20';
      case 'medium': return 'text-accent-warning bg-accent-warning/20';
      case 'high': return 'text-accent-danger bg-accent-danger/20';
      case 'veryHigh': return 'text-red-500 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };
  
  return (
    <div 
      className={`p-6 rounded-xl border cursor-pointer transition-all duration-300 ${
        isActive 
          ? 'border-accent-primary bg-accent-primary/10 glow-blue' 
          : 'border-dark-600 bg-dark-800 hover:border-dark-500 hover:bg-dark-700/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{strategy.name}</h3>
          <p className="text-gray-400 text-sm">{strategy.description}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(strategy.risk)}`}>
          {strategy.risk.toUpperCase()} RISK
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-white">{strategy.performance.winRate}%</div>
          <div className="text-gray-400 text-xs">Win Rate</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-accent-success">{strategy.performance.avgReturn}%</div>
          <div className="text-gray-400 text-xs">Avg Return</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-accent-danger">{strategy.performance.maxDrawdown}%</div>
          <div className="text-gray-400 text-xs">Max Drawdown</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-accent-primary">{strategy.performance.sharpeRatio}</div>
          <div className="text-gray-400 text-xs">Sharpe Ratio</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{strategy.timeframe}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <BarChart2 className="w-4 h-4" />
          <span>{strategy.indicators.join(', ')}</span>
        </div>
      </div>
    </div>
  );
};

const StrategyDetail = ({ strategy }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{strategy.name}</h2>
            <p className="text-gray-400">{strategy.description}</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Play className="w-4 h-4" />
            Apply Strategy
          </button>
        </div>
        
        <div className="flex border-b border-dark-600 mb-6">
          {['overview', 'conditions', 'parameters', 'performance'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
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
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Key Characteristics</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-white">Timeframe</div>
                    <div className="text-gray-400 text-sm">{strategy.timeframe}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-white">Risk Level</div>
                    <div className="text-gray-400 text-sm capitalize">{strategy.risk}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-white">Indicators Used</div>
                    <div className="text-gray-400 text-sm">{strategy.indicators.join(', ')}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-accent-success" />
                    <span className="text-gray-400 text-sm">Win Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-accent-success">{strategy.performance.winRate}%</div>
                </div>
                <div className="p-4 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-accent-primary" />
                    <span className="text-gray-400 text-sm">Avg Return</span>
                  </div>
                  <div className="text-2xl font-bold text-accent-primary">{strategy.performance.avgReturn}%</div>
                </div>
                <div className="p-4 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-accent-danger" />
                    <span className="text-gray-400 text-sm">Max Drawdown</span>
                  </div>
                  <div className="text-2xl font-bold text-accent-danger">{strategy.performance.maxDrawdown}%</div>
                </div>
                <div className="p-4 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-accent-warning" />
                    <span className="text-gray-400 text-sm">Sharpe Ratio</span>
                  </div>
                  <div className="text-2xl font-bold text-accent-warning">{strategy.performance.sharpeRatio}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'conditions' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-accent-success/10 border border-accent-success/30 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-accent-success" />
                <h3 className="text-lg font-semibold text-accent-success">Entry Conditions</h3>
              </div>
              <ul className="space-y-3">
                {strategy.conditions.entry.map((condition, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-accent-success/20 text-accent-success text-sm flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-6 bg-accent-danger/10 border border-accent-danger/30 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5 text-accent-danger" />
                <h3 className="text-lg font-semibold text-accent-danger">Exit Conditions</h3>
              </div>
              <ul className="space-y-3">
                {strategy.conditions.exit.map((condition, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-accent-danger/20 text-accent-danger text-sm flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {activeTab === 'parameters' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Strategy Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(strategy.parameters).map(([key, value]) => (
                <div key={key} className="p-4 bg-dark-700/50 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="text-white font-mono text-lg">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-6 bg-dark-700/50 rounded-xl">
                <div className="text-3xl font-bold text-accent-success mb-2">{strategy.performance.winRate}%</div>
                <div className="text-gray-400">Win Rate</div>
              </div>
              <div className="text-center p-6 bg-dark-700/50 rounded-xl">
                <div className="text-3xl font-bold text-accent-primary mb-2">{strategy.performance.avgReturn}%</div>
                <div className="text-gray-400">Avg Return</div>
              </div>
              <div className="text-center p-6 bg-dark-700/50 rounded-xl">
                <div className="text-3xl font-bold text-accent-danger mb-2">{strategy.performance.maxDrawdown}%</div>
                <div className="text-gray-400">Max Drawdown</div>
              </div>
              <div className="text-center p-6 bg-dark-700/50 rounded-xl">
                <div className="text-3xl font-bold text-accent-warning mb-2">{strategy.performance.sharpeRatio}</div>
                <div className="text-gray-400">Sharpe Ratio</div>
              </div>
            </div>
            
            <div className="p-4 bg-dark-700/50 rounded-lg">
              <h4 className="text-white font-medium mb-3">Risk-Adjusted Performance</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-3 bg-dark-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-accent-danger via-accent-warning to-accent-success"
                      style={{ width: `${(strategy.performance.sharpeRatio / 3.5) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {strategy.performance.sharpeRatio >= 1.5 ? 'Excellent' : 
                   strategy.performance.sharpeRatio >= 1 ? 'Good' : 
                   strategy.performance.sharpeRatio >= 0.5 ? 'Fair' : 'Poor'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Strategies = () => {
  const { marketData, selectedCategory, selectedSymbol } = useApp();
  const [selectedStrategy, setSelectedStrategy] = useState('momentum');
  const [filter, setFilter] = useState('all');
  
  const asset = useMemo(() => {
    if (!marketData) return null;
    return marketData[selectedCategory]?.[selectedSymbol] || null;
  }, [marketData, selectedCategory, selectedSymbol]);
  
  const recommendations = useMemo(() => {
    if (!asset) return [];
    
    const marketConditions = {
      volatility: asset.volatility * 100,
      trend: asset.changePercent > 2 ? 'strong' : asset.changePercent > 0 ? 'up' : asset.changePercent < -2 ? 'down' : 'ranging',
      sentiment: 'neutral'
    };
    
    return getStrategyRecommendations(marketConditions, selectedCategory);
  }, [asset, selectedCategory]);
  
  const filteredStrategies = useMemo(() => {
    const strategiesList = Object.entries(strategies).map(([id, strategy]) => ({
      id,
      ...strategy
    }));
    
    if (filter === 'all') return strategiesList;
    if (filter === 'low') return strategiesList.filter(s => ['low', 'veryLow'].includes(s.risk));
    if (filter === 'medium') return strategiesList.filter(s => s.risk === 'medium');
    if (filter === 'high') return strategiesList.filter(s => ['high', 'veryHigh'].includes(s.risk));
    if (filter === 'bullish') return strategiesList.filter(s => 
      ['momentum', 'trendFollowing', 'breakout'].includes(s.id)
    );
    if (filter === 'bearish') return strategiesList.filter(s => 
      ['meanReversion', 'grid'].includes(s.id)
    );
    
    return strategiesList;
  }, [filter]);
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-success to-accent-primary rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Trading Strategies</h1>
            <p className="text-gray-400">Explore and implement proven trading strategies</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-dark-700 rounded-lg p-1">
            {['all', 'bullish', 'bearish'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors capitalize ${
                  filter === f ? 'bg-accent-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : `${f} Market`}
              </button>
            ))}
          </div>
          <div className="flex bg-dark-700 rounded-lg p-1">
            {['all', 'low', 'medium', 'high'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filter === f ? 'bg-accent-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All Risk' : f}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {recommendations.length > 0 && (
        <div className="card bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border-accent-primary/30">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-accent-primary" />
            <h3 className="text-lg font-semibold text-white">Recommended for {selectedSymbol}</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {recommendations.slice(0, 4).map((rec, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 px-4 py-2 bg-dark-800/50 rounded-lg border border-dark-600"
              >
                <div className={`w-2 h-2 rounded-full ${
                  rec.suitability === 'high' ? 'bg-accent-success' : 
                  rec.suitability === 'medium' ? 'bg-accent-warning' : 'bg-gray-500'
                }`} />
                <span className="text-white font-medium">{rec.strategy.name}</span>
                <span className="text-gray-400 text-sm">- {rec.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {filteredStrategies.map(strategy => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              isActive={selectedStrategy === strategy.id}
              onClick={() => setSelectedStrategy(strategy.id)}
            />
          ))}
        </div>
        
        <div>
          {selectedStrategy && (
            <StrategyDetail strategy={strategies[selectedStrategy]} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Strategies;
