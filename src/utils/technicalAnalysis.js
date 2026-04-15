// Technical Analysis Engine - Calculates indicators for trading decisions

export const calculateSMA = (data, period) => {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
};

export const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
};

export const calculateRSI = (data, period = 14) => {
  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }
  
  const gains = changes.map(c => (c > 0 ? c : 0));
  const losses = changes.map(c => (c < 0 ? Math.abs(c) : 0));
  
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  const rsi = [];
  
  for (let i = 0; i < period; i++) {
    rsi.push(null);
  }
  
  for (let i = period; i < changes.length; i++) {
    if (i > period) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  return rsi;
};

export const calculateMACD = (data, fast = 12, slow = 26, signal = 9) => {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  
  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  
  const signalLine = calculateEMA(macdLine.slice(slow - 1), signal);
  const offset = macdLine.length - signalLine.length;
  
  const histogram = [];
  for (let i = 0; i < offset; i++) {
    histogram.push(null);
  }
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + offset] - signalLine[i]);
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    offset
  };
};

export const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
  const sma = calculateSMA(data, period);
  const upper = [];
  const lower = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i - period + 1];
    const squaredDiffs = slice.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }
  
  return { upper, middle: sma, lower };
};

export const calculateATR = (highs, lows, closes, period = 14) => {
  const trueRanges = [highs[0] - lows[0]];
  
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }
  
  return calculateSMA(trueRanges, period);
};

export const calculateStochastic = (highs, lows, closes, period = 14) => {
  const kValues = [];
  
  for (let i = period - 1; i < highs.length; i++) {
    const highMax = Math.max(...highs.slice(i - period + 1, i + 1));
    const lowMin = Math.min(...lows.slice(i - period + 1, i + 1));
    
    kValues.push(((closes[i] - lowMin) / (highMax - lowMin)) * 100);
  }
  
  const dValues = calculateSMA(kValues, 3);
  
  return {
    k: kValues,
    d: dValues
  };
};

export const calculateSupportResistance = (data, window = 20) => {
  const support = [];
  const resistance = [];
  
  for (let i = window; i < data.length - window; i++) {
    const isSupport = data.slice(i - window, i).every(v => v >= data[i]) &&
                      data.slice(i + 1, i + window + 1).every(v => v >= data[i]);
    
    const isResistance = data.slice(i - window, i).every(v => v <= data[i]) &&
                         data.slice(i + 1, i + window + 1).every(v => v <= data[i]);
    
    if (isSupport) support.push(data[i]);
    if (isResistance) resistance.push(data[i]);
  }
  
  return {
    support: support.length > 0 ? Math.min(...support) : data[data.length - 1] * 0.95,
    resistance: resistance.length > 0 ? Math.max(...resistance) : data[data.length - 1] * 1.05
  };
};

export const calculatePivotPoints = (high, low, close) => {
  const pivot = (high + low + close) / 3;
  
  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot)
  };
};

export const calculateVolumeProfile = (prices, volumes, bins = 20) => {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const binSize = (max - min) / bins;
  
  const profile = Array(bins).fill(0);
  
  prices.forEach((price, i) => {
    const binIndex = Math.min(Math.floor((price - min) / binSize), bins - 1);
    profile[binIndex] += volumes[i];
  });
  
  const maxVolume = Math.max(...profile);
  
  return profile.map((vol, i) => ({
    price: min + binSize * i + binSize / 2,
    volume: vol,
    percentage: (vol / maxVolume) * 100
  }));
};

export const getTechnicalSignal = (indicators) => {
  let score = 0;
  const signals = [];
  
  // RSI Analysis
  if (indicators.rsi > 70) {
    score -= 2;
    signals.push({ indicator: 'RSI', signal: 'Overbought', severity: 'high' });
  } else if (indicators.rsi < 30) {
    score += 2;
    signals.push({ indicator: 'RSI', signal: 'Oversold', severity: 'high' });
  } else if (indicators.rsi > 60) {
    score += 1;
    signals.push({ indicator: 'RSI', signal: 'Bullish', severity: 'medium' });
  } else if (indicators.rsi < 40) {
    score -= 1;
    signals.push({ indicator: 'RSI', signal: 'Bearish', severity: 'medium' });
  }
  
  // MACD Analysis
  if (indicators.macdHistogram > 0) {
    score += 1;
    signals.push({ indicator: 'MACD', signal: 'Bullish Crossover', severity: 'medium' });
  } else {
    score -= 1;
    signals.push({ indicator: 'MACD', signal: 'Bearish Crossover', severity: 'medium' });
  }
  
  // Moving Average Trend
  if (indicators.price > indicators.sma20 && indicators.price > indicators.sma50) {
    score += 2;
    signals.push({ indicator: 'MA', signal: 'Strong Uptrend', severity: 'high' });
  } else if (indicators.price < indicators.sma20 && indicators.price < indicators.sma50) {
    score -= 2;
    signals.push({ indicator: 'MA', signal: 'Strong Downtrend', severity: 'high' });
  }
  
  // Bollinger Bands
  if (indicators.price > indicators.bbUpper * 0.98) {
    score -= 1;
    signals.push({ indicator: 'BB', signal: 'Near Upper Band', severity: 'medium' });
  } else if (indicators.price < indicators.bbLower * 1.02) {
    score += 1;
    signals.push({ indicator: 'BB', signal: 'Near Lower Band', severity: 'medium' });
  }
  
  let overallSignal = 'Neutral';
  if (score >= 3) overallSignal = 'Strong Buy';
  else if (score >= 1) overallSignal = 'Buy';
  else if (score <= -3) overallSignal = 'Strong Sell';
  else if (score <= -1) overallSignal = 'Sell';
  
  return { overallSignal, score, signals };
};
