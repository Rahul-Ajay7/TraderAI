// AI Prediction Engine - Machine Learning inspired price prediction

import { calculateSMA, calculateEMA, calculateRSI } from './technicalAnalysis';

const sigmoid = x => 1 / (1 + Math.exp(-x));

const normalize = (arr) => {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  return arr.map(v => (v - min) / (max - min || 1));
};

const calculateVolatility = (prices) => {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 252);
};

const calculateMomentum = (prices, period = 10) => {
  if (prices.length < period) return 0;
  return (prices[prices.length - 1] - prices[prices.length - period - 1]) / prices[prices.length - period - 1];
};

const calculateTrendStrength = (prices) => {
  const sma20 = calculateSMA(prices, Math.min(20, prices.length))[0] || prices[prices.length - 1];
  const sma50 = calculateSMA(prices, Math.min(50, prices.length))[0] || prices[prices.length - 1];
  
  const currentPrice = prices[prices.length - 1];
  
  if (sma20 > sma50 && currentPrice > sma20) return 1;
  if (sma20 < sma50 && currentPrice < sma20) return -1;
  return 0;
};

export const neuralNetworkPredict = (prices, daysToPredict = 7) => {
  const closes = prices.map(p => p.close);
  const highs = prices.map(p => p.high);
  const lows = prices.map(p => p.low);
  const volumes = prices.map(p => p.volume);
  
  const lastPrice = closes[closes.length - 1];
  const volatility = calculateVolatility(closes);
  const momentum = calculateMomentum(closes);
  const trend = calculateTrendStrength(closes);
  
  const rsi = calculateRSI(closes).filter(r => r !== null);
  const currentRSI = rsi[rsi.length - 1] || 50;
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdSignal = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  
  const volumeAvg = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const volumeRatio = volumes[volumes.length - 1] / volumeAvg;
  
  const predictions = [];
  let currentPred = lastPrice;
  
  const learningRate = 0.01;
  const weights = {
    momentum: 0.3,
    trend: 0.25,
    rsi: 0.2,
    macd: 0.15,
    volume: 0.1
  };
  
  for (let day = 1; day <= daysToPredict; day++) {
    const decayFactor = Math.exp(-day * 0.1);
    
    let prediction = currentPred;
    
    prediction += momentum * currentPred * decayFactor * weights.momentum;
    
    if (trend > 0) {
      prediction += currentPred * 0.002 * decayFactor * weights.trend;
    } else if (trend < 0) {
      prediction -= currentPred * 0.002 * decayFactor * weights.trend;
    }
    
    if (currentRSI < 30) {
      prediction += currentPred * 0.003 * decayFactor * weights.rsi;
    } else if (currentRSI > 70) {
      prediction -= currentPred * 0.003 * decayFactor * weights.rsi;
    }
    
    if (macdSignal > 0) {
      prediction += Math.abs(macdSignal) * decayFactor * weights.macd;
    } else {
      prediction -= Math.abs(macdSignal) * decayFactor * weights.macd;
    }
    
    const noise = (Math.random() - 0.5) * 2 * volatility * currentPred * decayFactor * 0.5;
    prediction += noise;
    
    const trendContinuation = Math.random() > 0.4 ? trend * currentPred * 0.001 * decayFactor : 0;
    prediction += trendContinuation;
    
    predictions.push({
      day,
      price: prediction,
      date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      confidence: Math.max(30, 95 - day * 8 - Math.abs(momentum) * 50),
      direction: prediction > currentPred ? 'up' : 'down'
    });
    
    currentPred = prediction;
  }
  
  return predictions;
};

export const lstmPredict = (prices, daysToPredict = 7) => {
  const closes = prices.map(p => p.close);
  const volumes = prices.map(p => p.volume);
  
  const lastPrice = closes[closes.length - 1];
  const returns = [];
  
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length);
  
  const recentReturns = returns.slice(-14);
  const recentMean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  const recentStd = Math.sqrt(recentReturns.reduce((a, b) => a + Math.pow(b - recentMean, 2), 0) / recentReturns.length);
  
  const momentumScore = recentReturns.slice(-5).reduce((a, b) => a + (b > 0 ? 1 : 0), 0) / 5;
  
  const predictions = [];
  let currentPrice = lastPrice;
  
  for (let day = 1; day <= daysToPredict; day++) {
    let predictedReturn = meanReturn;
    
    predictedReturn += (recentMean - meanReturn) * 0.7;
    
    if (momentumScore > 0.6) {
      predictedReturn += 0.002;
    } else if (momentumScore < 0.4) {
      predictedReturn -= 0.002;
    }
    
    const volumeTrend = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5 / (volumes.reduce((a, b) => a + b, 0) / volumes.length);
    if (volumeTrend > 1.3) {
      predictedReturn *= 1.2;
    } else if (volumeTrend < 0.7) {
      predictedReturn *= 0.8;
    }
    
    const randomShock = (Math.random() - 0.5) * stdReturn * 1.5;
    
    const combinedReturn = predictedReturn * 0.6 + randomShock * 0.4;
    
    currentPrice = currentPrice * (1 + combinedReturn);
    
    const confidence = Math.max(20, 85 - day * 7 - Math.abs(recentStd) * 100);
    
    predictions.push({
      day,
      price: currentPrice,
      date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      confidence: confidence,
      direction: combinedReturn > 0 ? 'up' : 'down',
      change: ((currentPrice - lastPrice) / lastPrice) * 100
    });
  }
  
  return predictions;
};

export const ensemblePredict = (prices, daysToPredict = 7) => {
  const neuralPredictions = neuralNetworkPredict(prices, daysToPredict);
  const lstmPredictions = lstmPredict(prices, daysToPredict);
  
  const closes = prices.map(p => p.close);
  const lastPrice = closes[closes.length - 1];
  
  const predictions = [];
  
  for (let day = 1; day <= daysToPredict; day++) {
    const neuralPred = neuralPredictions.find(p => p.day === day);
    const lstmPred = lstmPredictions.find(p => p.day === day);
    
    const neuralWeight = 0.5;
    const lstmWeight = 0.5;
    
    const ensemblePrice = neuralPred.price * neuralWeight + lstmPred.price * lstmWeight;
    const ensembleConfidence = (neuralPred.confidence * neuralWeight + lstmPred.confidence * lstmWeight);
    
    const priceDeviation = Math.abs(neuralPred.price - lstmPred.price) / lastPrice;
    const disagreementPenalty = priceDeviation * 50;
    
    const finalConfidence = Math.max(15, ensembleConfidence - disagreementPenalty);
    
    predictions.push({
      day,
      price: ensemblePrice,
      date: neuralPred.date,
      confidence: Math.round(finalConfidence),
      direction: ensemblePrice > lastPrice ? 'up' : 'down',
      change: ((ensemblePrice - lastPrice) / lastPrice) * 100,
      neuralPrice: neuralPred.price,
      lstmPrice: lstmPred.price,
      modelAgreement: 1 - priceDeviation
    });
  }
  
  return predictions;
};

export const calculatePredictionAccuracy = (historicalPrices, splitPoint = -7) => {
  const trainData = historicalPrices.slice(0, splitPoint);
  const testData = historicalPrices.slice(splitPoint);
  
  if (trainData.length < 30 || testData.length === 0) {
    return { accuracy: 0, directionAccuracy: 0 };
  }
  
  const predictions = ensemblePredict(trainData, testData.length);
  
  let correctDirections = 0;
  let totalError = 0;
  
  testData.forEach((actual, i) => {
    const predicted = predictions[i];
    
    if (predicted && actual.close) {
      const actualDirection = actual.close > trainData[trainData.length - 1].close ? 'up' : 'down';
      if (predicted.direction === actualDirection) {
        correctDirections++;
      }
      
      totalError += Math.abs(predicted.price - actual.close) / actual.close;
    }
  });
  
  return {
    accuracy: 1 - (totalError / testData.length),
    directionAccuracy: correctDirections / testData.length,
    meanError: (totalError / testData.length) * 100
  };
};

export const getMarketRegime = (prices) => {
  const closes = prices.map(p => p.close);
  const volumes = prices.map(p => p.volume);
  
  const sma20 = calculateSMA(closes, Math.min(20, closes.length));
  const sma50 = calculateSMA(closes, Math.min(50, closes.length));
  
  const volatility = calculateVolatility(closes);
  
  const trend = sma20[sma20.length - 1] > sma50[sma50.length - 1] ? 'bullish' : 'bearish';
  
  let regime = 'neutral';
  
  if (volatility > 0.3) {
    regime = 'high_volatility';
  } else if (trend === 'bullish' && volatility < 0.15) {
    regime = 'steady_bull';
  } else if (trend === 'bearish' && volatility < 0.15) {
    regime = 'steady_bear';
  } else if (trend === 'bullish') {
    regime = 'bullish';
  } else if (trend === 'bearish') {
    regime = 'bearish';
  }
  
  return {
    regime,
    trend,
    volatility: Math.round(volatility * 100),
    sma20: sma20[sma20.length - 1],
    sma50: sma50[sma50.length - 1]
  };
};

export const generateConfusionMatrix = (prices) => {
  const closes = prices.map(p => p.close);
  const predictions = neuralNetworkPredict(prices.slice(0, -7), 7);
  
  const actualPrices = prices.slice(-7);
  
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;
  
  const basePrice = closes[closes.length - 8];
  
  predictions.forEach((pred, i) => {
    const actual = actualPrices[i];
    const actualDirection = actual.close > basePrice ? 'up' : 'down';
    const predictedDirection = pred.direction;
    
    if (predictedDirection === 'up' && actualDirection === 'up') truePositives++;
    if (predictedDirection === 'up' && actualDirection === 'down') falsePositives++;
    if (predictedDirection === 'down' && actualDirection === 'down') trueNegatives++;
    if (predictedDirection === 'down' && actualDirection === 'up') falseNegatives++;
  });
  
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
  
  return {
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    precision: Math.round(precision * 100),
    recall: Math.round(recall * 100),
    f1Score: Math.round(f1Score * 100)
  };
};
