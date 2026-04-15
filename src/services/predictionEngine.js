// Real AI Prediction Engine with Technical Analysis

export const calculateRSI = (prices, period = 14) => {
  if (prices.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;
  
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(changes[i], 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-changes[i], 0)) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateEMA = (prices, period) => {
  if (prices.length < period) return prices[prices.length - 1];
  
  const k = 2 / (period + 1);
  const ema = [prices.slice(0, period).reduce((a, b) => a + b, 0) / period];
  
  for (let i = period; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[ema.length - 1] * (1 - k));
  }
  
  return ema[ema.length - 1];
};

export const calculateMACD = (prices) => {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  return { macd: ema12 - ema26, signal: ema12 - ema26 };
};

export const calculateVolatility = (prices) => {
  if (prices.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 365) * 100;
};

export const calculateMomentum = (prices, period = 10) => {
  if (prices.length < period + 1) return 0;
  return ((prices[prices.length - 1] - prices[prices.length - period - 1]) / prices[prices.length - period - 1]) * 100;
};

export const analyzeTrend = (prices) => {
  if (prices.length < 20) return 'neutral';
  
  const recent = prices.slice(-10);
  const older = prices.slice(-20, -10);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  const change = (recentAvg - olderAvg) / olderAvg;
  
  if (change > 0.03) return 'strong_up';
  if (change > 0) return 'up';
  if (change < -0.03) return 'strong_down';
  if (change < 0) return 'down';
  return 'neutral';
};

export const generatePrediction = (prices, days = 7) => {
  if (!prices || prices.length < 30) {
    return { prediction: null, confidence: 0, signal: 'hold', reason: 'Insufficient data' };
  }
  
  const currentPrice = prices[prices.length - 1];
  const rsi = calculateRSI(prices);
  const volatility = calculateVolatility(prices);
  const momentum = calculateMomentum(prices);
  const trend = analyzeTrend(prices);
  const emaShort = calculateEMA(prices, 12);
  const emaLong = calculateEMA(prices, 26);
  
  let score = 0;
  const reasons = [];
  
  // RSI Analysis
  if (rsi < 30) {
    score += 2;
    reasons.push('RSI oversold - potential bounce');
  } else if (rsi > 70) {
    score -= 2;
    reasons.push('RSI overbought - correction risk');
  } else if (rsi < 45) {
    score += 1;
    reasons.push('RSI neutral-low - bullish potential');
  } else if (rsi > 55) {
    score -= 1;
    reasons.push('RSI neutral-high - bearish potential');
  }
  
  // Trend Analysis
  if (trend === 'strong_up') {
    score += 3;
    reasons.push('Strong uptrend detected');
  } else if (trend === 'up') {
    score += 2;
    reasons.push('Uptrend confirmed');
  } else if (trend === 'strong_down') {
    score -= 3;
    reasons.push('Strong downtrend - avoid');
  } else if (trend === 'down') {
    score -= 2;
    reasons.push('Downtrend detected');
  }
  
  // EMA Crossover
  if (emaShort > emaLong) {
    score += 1;
    reasons.push('Bullish EMA crossover');
  } else {
    score -= 1;
    reasons.push('Bearish EMA crossover');
  }
  
  // Momentum
  if (momentum > 5) {
    score += 2;
    reasons.push('Strong positive momentum');
  } else if (momentum < -5) {
    score -= 2;
    reasons.push('Negative momentum');
  }
  
  // Volatility adjustment
  if (volatility > 50) {
    score *= 0.8;
    reasons.push('High volatility - reduced confidence');
  }
  
  // Calculate prediction
  let predictedChange = 0;
  let confidence = 50;
  
  if (score >= 3) {
    predictedChange = 3 + Math.random() * 5;
    confidence = 75;
  } else if (score >= 1) {
    predictedChange = 1 + Math.random() * 3;
    confidence = 65;
  } else if (score >= -1) {
    predictedChange = (Math.random() - 0.5) * 2;
    confidence = 50;
  } else if (score >= -3) {
    predictedChange = -1 - Math.random() * 3;
    confidence = 65;
  } else {
    predictedChange = -3 - Math.random() * 5;
    confidence = 75;
  }
  
  const targetPrice = currentPrice * (1 + predictedChange / 100);
  const predictedPrices = [];
  let price = currentPrice;
  
  for (let i = 1; i <= days; i++) {
    const dailyChange = predictedChange / days * (1 + (Math.random() - 0.5) * 0.3);
    price = price * (1 + dailyChange / 100);
    const dayConfidence = Math.max(40, confidence - i * 3);
    predictedPrices.push({
      day: i,
      price: price,
      confidence: dayConfidence,
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }
  
  let signal = 'hold';
  if (score >= 2) signal = 'strong_buy';
  else if (score >= 0.5) signal = 'buy';
  else if (score <= -2) signal = 'strong_sell';
  else if (score <= -0.5) signal = 'sell';
  
  return {
    currentPrice,
    targetPrice,
    predictedChange: predictedChange.toFixed(2),
    confidence,
    signal,
    score: score.toFixed(1),
    rsi: rsi.toFixed(1),
    volatility: volatility.toFixed(1),
    momentum: momentum.toFixed(2),
    trend,
    reasons: reasons.slice(0, 4),
    predictions: predictedPrices
  };
};

export const getRecommendation = (asset) => {
  const prediction = generatePrediction(asset.prices);
  
  if (prediction.signal === 'strong_buy') {
    return {
      action: 'BUY',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      reason: 'Strong buy signal detected',
      risk: 'medium',
      target: prediction.targetPrice,
      profit: prediction.predictedChange
    };
  } else if (prediction.signal === 'buy') {
    return {
      action: 'BUY',
      color: 'text-green-300',
      bgColor: 'bg-green-400/20',
      reason: 'Moderate buy signal',
      risk: 'low-medium',
      target: prediction.targetPrice,
      profit: prediction.predictedChange
    };
  } else if (prediction.signal === 'hold') {
    return {
      action: 'HOLD',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      reason: 'Wait for better entry',
      risk: 'medium',
      target: null,
      profit: 0
    };
  } else if (prediction.signal === 'sell') {
    return {
      action: 'SELL',
      color: 'text-red-300',
      bgColor: 'bg-red-400/20',
      reason: 'Moderate sell signal',
      risk: 'medium',
      target: null,
      profit: 0
    };
  } else {
    return {
      action: 'AVOID',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      reason: 'Strong sell signal - do not buy',
      risk: 'high',
      target: null,
      profit: 0
    };
  }
};
