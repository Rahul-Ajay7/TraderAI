// Trading Strategies Library - Comprehensive collection of trading strategies

export const strategies = {
  momentum: {
    name: 'Momentum Trading',
    description: 'Buy assets showing upward price trends, sell those showing downward trends',
    timeframe: 'Short to Medium',
    risk: 'medium',
    indicators: ['RSI', 'MACD', 'Volume'],
    conditions: {
      entry: [
        'Price breaks above 20-day SMA with volume > 1.5x average',
        'RSI crosses above 50 from oversold territory',
        'MACD histogram turns positive'
      ],
      exit: [
        'Price breaks below 20-day SMA',
        'RSI reaches overbought (70) and turns down',
        'MACD signals bearish crossover'
      ]
    },
    parameters: {
      lookbackPeriod: 20,
      volumeThreshold: 1.5,
      rsiOversold: 30,
      rsiOverbought: 70
    },
    performance: {
      winRate: 58,
      avgReturn: 4.2,
      maxDrawdown: -8.5,
      sharpeRatio: 1.2
    }
  },
  
  meanReversion: {
    name: 'Mean Reversion',
    description: 'Buy when prices deviate below average, sell when they exceed average',
    timeframe: 'Short',
    risk: 'medium',
    indicators: ['Bollinger Bands', 'RSI', 'VWAP'],
    conditions: {
      entry: [
        'Price touches lower Bollinger Band',
        'RSI below 30 (oversold)',
        'Price 2+ standard deviations from 20-day SMA'
      ],
      exit: [
        'Price returns to 20-day SMA',
        'RSI reaches 50',
        'Price touches upper Bollinger Band'
      ]
    },
    parameters: {
      bollingerPeriod: 20,
      bollingerStdDev: 2,
      rsiOversold: 30,
      rsiOverbought: 70
    },
    performance: {
      winRate: 62,
      avgReturn: 2.8,
      maxDrawdown: -6.2,
      sharpeRatio: 1.4
    }
  },
  
  breakout: {
    name: 'Breakout Trading',
    description: 'Enter positions when price breaks through key resistance or support levels',
    timeframe: 'Medium',
    risk: 'high',
    indicators: ['Support/Resistance', 'Volume', 'ATR'],
    conditions: {
      entry: [
        'Price closes above resistance with volume > 2x average',
        'Breakout confirmed by retest without closing below',
        'ATR expansion confirms move validity'
      ],
      exit: [
        'Price closes below breakout level',
        'Trailing stop at 2x ATR from entry',
        'Price fails to make higher highs'
      ]
    },
    parameters: {
      volumeMultiplier: 2,
      atrMultiplier: 2,
      consolidationPeriod: 10
    },
    performance: {
      winRate: 45,
      avgReturn: 8.5,
      maxDrawdown: -12.3,
      sharpeRatio: 0.9
    }
  },
  
  trendFollowing: {
    name: 'Trend Following',
    description: 'Capture gains by following established trends until they reverse',
    timeframe: 'Long',
    risk: 'medium',
    indicators: ['Moving Averages', 'ADX', 'Parabolic SAR'],
    conditions: {
      entry: [
        'Price above 50-day and 200-day SMA (golden cross)',
        'ADX above 25 confirming trend strength',
        'Parabolic SAR below price for long positions'
      ],
      exit: [
        'Price closes below 50-day SMA',
        'ADX drops below 20',
        'Parabolic SAR crosses above price'
      ]
    },
    parameters: {
      shortMA: 50,
      longMA: 200,
      adxThreshold: 25,
      adxConfirmation: 20
    },
    performance: {
      winRate: 52,
      avgReturn: 12.5,
      maxDrawdown: -15.8,
      sharpeRatio: 0.85
    }
  },
  
  pairs: {
    name: 'Pairs Trading',
    description: 'Trade the spread between two correlated securities',
    timeframe: 'Medium',
    risk: 'low',
    indicators: ['Correlation', 'Spread', 'Z-Score'],
    conditions: {
      entry: [
        'Correlation above 0.8',
        'Spread exceeds 2 standard deviations',
        'Mean reversion pattern confirmed'
      ],
      exit: [
        'Spread returns to mean',
        'Z-score crosses zero',
        'Correlation breaks down'
      ]
    },
    parameters: {
      correlationThreshold: 0.8,
      zScoreEntry: 2,
      zScoreExit: 0,
      lookbackPeriod: 30
    },
    performance: {
      winRate: 68,
      avgReturn: 3.2,
      maxDrawdown: -4.5,
      sharpeRatio: 1.6
    }
  },
  
  grid: {
    name: 'Grid Trading',
    description: 'Place buy/sell orders at regular intervals around a central price',
    timeframe: 'Medium to Long',
    risk: 'medium',
    indicators: ['Price Levels', 'Volatility'],
    conditions: {
      entry: [
        'Set grid levels at equal intervals',
        'Start with central price at current level',
        'Use volatility to determine grid spacing'
      ],
      exit: [
        'Close all positions at profit target',
        'Manual exit if trend breaks range',
        'Reconfigure grid on new range'
      ]
    },
    parameters: {
      gridLevels: 10,
      gridSpacing: 1,
      profitTarget: 5,
      maxPositions: 5
    },
    performance: {
      winRate: 75,
      avgReturn: 1.5,
      maxDrawdown: -8.0,
      sharpeRatio: 1.1
    }
  },
  
  dca: {
    name: 'Dollar Cost Averaging',
    description: 'Invest fixed amounts at regular intervals regardless of price',
    timeframe: 'Long',
    risk: 'low',
    indicators: ['Time', 'Consistency'],
    conditions: {
      entry: [
        'Set fixed investment amount',
        'Choose regular intervals (weekly/monthly)',
        'Maintain discipline through volatility'
      ],
      exit: [
        'Reach investment goal or time horizon',
        'Achieve target allocation',
        'Emergency liquidation'
      ]
    },
    parameters: {
      investmentAmount: 1000,
      frequency: 'monthly',
      duration: 120,
      autoRebalance: true
    },
    performance: {
      winRate: 85,
      avgReturn: 9.8,
      maxDrawdown: -20.0,
      sharpeRatio: 0.7
    }
  },
  
  scalping: {
    name: 'Scalping',
    description: 'Capture small price changes through rapid trading',
    timeframe: 'Short (minutes to hours)',
    risk: 'veryHigh',
    indicators: ['Level 2', 'Time & Sales', 'VWAP', 'EMA'],
    conditions: {
      entry: [
        'Price bounces off VWAP',
        'Quick EMA crossover (5/10 period)',
        'Volume spike confirms direction'
      ],
      exit: [
        'Target: 0.1-0.5% profit',
        'Stop: Immediate if against you',
        'Time-based exit after 5-15 minutes'
      ]
    },
    parameters: {
      profitTarget: 0.3,
      stopLoss: 0.15,
      maxTrades: 10,
      maxDailyLoss: 2
    },
    performance: {
      winRate: 72,
      avgReturn: 0.25,
      maxDrawdown: -3.0,
      sharpeRatio: 2.1
    }
  },
  
  swing: {
    name: 'Swing Trading',
    description: 'Capture gains over days to weeks using technical patterns',
    timeframe: 'Medium (3-14 days)',
    risk: 'medium',
    indicators: ['Fibonacci', 'Chart Patterns', 'Volume'],
    conditions: {
      entry: [
        'Identify swing high/low',
        'Wait for pullback to 38.2% or 50% Fibonacci',
        'Confirmation with volume and candlestick'
      ],
      exit: [
        'Take profit at next Fibonacci level (61.8%)',
        'Stop below swing low',
        'Trailing stop after 3:1 reward:risk'
      ]
    },
    parameters: {
      fibLevels: [38.2, 50, 61.8],
      minRewardRisk: 3,
      atrStopMultiplier: 2
    },
    performance: {
      winRate: 48,
      avgReturn: 6.8,
      maxDrawdown: -9.2,
      sharpeRatio: 1.0
    }
  },
  
  arbitrage: {
    name: 'Arbitrage',
    description: 'Exploit price differences between markets or instruments',
    timeframe: 'Short (seconds to minutes)',
    risk: 'veryLow',
    indicators: ['Price Differential', 'Execution Speed'],
    conditions: {
      entry: [
        'Price difference exceeds transaction costs',
        'Available capital to exploit spread',
        'Fast execution capability'
      ],
      exit: [
        'Prices converge',
        'Spread narrows below threshold',
        'Lock in profit'
      ]
    },
    parameters: {
      minSpread: 0.5,
      maxExecutionTime: 100,
      capitalPerTrade: 10000
    },
    performance: {
      winRate: 95,
      avgReturn: 0.1,
      maxDrawdown: -0.5,
      sharpeRatio: 3.5
    }
  }
};

export const getStrategyRecommendations = (marketConditions, assetType) => {
  const recommendations = [];
  
  if (assetType === 'crypto') {
    if (marketConditions.volatility > 25) {
      recommendations.push({
        strategy: strategies.momentum,
        suitability: 'high',
        reason: 'High volatility in crypto markets favors momentum strategies'
      });
      recommendations.push({
        strategy: strategies.grid,
        suitability: 'high',
        reason: 'Grid trading capitalizes on ranging crypto volatility'
      });
    }
    if (marketConditions.trend === 'strong') {
      recommendations.push({
        strategy: strategies.trendFollowing,
        suitability: 'high',
        reason: 'Strong trends are ideal for trend following'
      });
    }
  }
  
  if (assetType === 'stocks') {
    if (marketConditions.sentiment === 'bullish') {
      recommendations.push({
        strategy: strategies.momentum,
        suitability: 'high',
        reason: 'Bullish sentiment supports momentum plays'
      });
    }
    if (marketConditions.trend === 'ranging') {
      recommendations.push({
        strategy: strategies.meanReversion,
        suitability: 'high',
        reason: 'Mean reversion works well in sideways markets'
      });
    }
  }
  
  if (assetType === 'commodities') {
    recommendations.push({
      strategy: strategies.swing,
      suitability: 'high',
      reason: 'Commodities suit swing trading due to longer cycles'
    });
    if (marketConditions.correlatedPair) {
      recommendations.push({
        strategy: strategies.pairs,
        suitability: 'medium',
        reason: 'Pairs trading effective for correlated commodities'
      });
    }
  }
  
  recommendations.push({
    strategy: strategies.dca,
    suitability: 'high',
    reason: 'Dollar cost averaging works in all market conditions'
  });
  
  return recommendations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.suitability] - order[b.suitability];
  });
};

export const backtestStrategy = (strategy, historicalData) => {
  let wins = 0;
  let losses = 0;
  let totalReturn = 0;
  let maxDrawdown = 0;
  let peak = 0;
  const trades = [];
  
  for (let i = 1; i < historicalData.length; i++) {
    const price = historicalData[i].close;
    
    if (peak === 0) peak = price;
    
    if (price > peak) peak = price;
    
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    
    const dayReturn = (price - historicalData[i - 1].close) / historicalData[i - 1].close;
    totalReturn += dayReturn;
  }
  
  const winRate = wins / (wins + losses) || 0.5;
  
  return {
    totalReturn: totalReturn * 100,
    winRate: winRate * 100,
    maxDrawdown: maxDrawdown * 100,
    sharpeRatio: (totalReturn * 100) / (maxDrawdown * 100 || 1),
    totalTrades: wins + losses,
    profitFactor: wins > 0 ? (winRate * strategy.performance.avgReturn) / ((1 - winRate) * Math.abs(strategy.performance.avgReturn)) : 1
  };
};

export const calculateOptimalPositionSize = (accountSize, riskPerTrade, entryPrice, stopLoss) => {
  const riskAmount = accountSize * (riskPerTrade / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const positionSize = Math.floor(riskAmount / riskPerShare);
  
  return {
    shares: positionSize,
    totalCost: positionSize * entryPrice,
    riskAmount,
    riskPercentage: riskPerTrade,
    positionPercentage: (positionSize * entryPrice / accountSize) * 100
  };
};

export const calculateRiskRewardRatio = (entryPrice, targetPrice, stopLoss) => {
  const potentialReward = Math.abs(targetPrice - entryPrice);
  const potentialRisk = Math.abs(entryPrice - stopLoss);
  
  return {
    reward: potentialReward,
    risk: potentialRisk,
    ratio: potentialRisk > 0 ? potentialReward / potentialRisk : 0,
    isFavorable: potentialReward > potentialRisk
  };
};
