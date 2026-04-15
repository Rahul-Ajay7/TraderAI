// Sentiment Analysis Engine - Analyzes market sentiment from various sources

const positiveWords = [
  'bullish', 'breakout', 'surge', 'rally', 'soar', 'gain', 'profit', 'growth',
  'upgrade', 'outperform', 'strong', 'buy', 'accumulate', 'momentum', 'uptrend',
  'optimistic', 'positive', 'recovery', 'boom', 'inflation', 'growth', 'beat',
  'exceed', 'record', 'high', 'jump', 'rally', 'advance', 'improve'
];

const negativeWords = [
  'bearish', 'crash', 'plunge', 'drop', 'fall', 'loss', 'decline', 'sell',
  'downgrade', 'underperform', 'weak', 'risk', 'fear', 'downtrend', 'pessimistic',
  'negative', 'recession', 'bust', 'deflation', 'miss', 'below', 'low', 'sink',
  'retreat', 'retreat', 'decrease', 'worsen', 'concern', 'warning', 'uncertainty'
];

const industryTerms = {
  tech: ['AI', 'cloud', 'SaaS', 'semiconductor', 'chip', 'software', 'hardware', 'data', 'cyber'],
  finance: ['Fed', 'rate', 'inflation', 'GDP', 'employment', 'treasury', 'bond', 'yield', 'bank'],
  energy: ['oil', 'gas', 'renewable', 'solar', 'wind', 'OPEC', 'crude', 'energy'],
  crypto: ['bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'wallet', 'mining', 'crypto'],
  commodities: ['gold', 'silver', 'copper', 'wheat', 'corn', 'lithium', 'rare earth']
};

const sentimentScores = {
  extremelyPositive: 2.0,
  veryPositive: 1.5,
  positive: 1.0,
  slightlyPositive: 0.5,
  neutral: 0,
  slightlyNegative: -0.5,
  negative: -1.0,
  veryNegative: -1.5,
  extremelyNegative: -2.0
};

export const analyzeTextSentiment = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  
  let positiveCount = 0;
  let negativeCount = 0;
  let totalSentiment = 0;
  let sentimentCount = 0;
  
  const foundIndustries = [];
  
  words.forEach(word => {
    const cleanWord = word.replace(/[^a-z]/g, '');
    
    if (positiveWords.includes(cleanWord)) {
      positiveCount++;
      totalSentiment += 1;
      sentimentCount++;
    }
    
    if (negativeWords.includes(cleanWord)) {
      negativeCount++;
      totalSentiment -= 1;
      sentimentCount++;
    }
    
    Object.entries(industryTerms).forEach(([industry, terms]) => {
      if (terms.includes(cleanWord) && !foundIndustries.includes(industry)) {
        foundIndustries.push(industry);
      }
    });
  });
  
  const rawSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;
  
  let sentimentLabel;
  if (rawSentiment >= 1.5) sentimentLabel = 'extremelyPositive';
  else if (rawSentiment >= 0.75) sentimentLabel = 'veryPositive';
  else if (rawSentiment >= 0.25) sentimentLabel = 'positive';
  else if (rawSentiment > 0) sentimentLabel = 'slightlyPositive';
  else if (rawSentiment === 0) sentimentLabel = 'neutral';
  else if (rawSentiment >= -0.25) sentimentLabel = 'slightlyNegative';
  else if (rawSentiment >= -0.75) sentimentLabel = 'negative';
  else if (rawSentiment >= -1.5) sentimentLabel = 'veryNegative';
  else sentimentLabel = 'extremelyNegative';
  
  const sentimentScore = sentimentScores[sentimentLabel];
  
  const positiveRatio = positiveCount / (positiveCount + negativeCount || 1);
  
  return {
    sentiment: sentimentLabel,
    score: sentimentScore,
    positiveCount,
    negativeCount,
    positiveRatio: Math.round(positiveRatio * 100),
    confidence: Math.min(100, Math.round((Math.abs(rawSentiment) + 0.5) * 50)),
    industries: foundIndustries,
    summary: generateSentimentSummary(sentimentLabel, positiveCount, negativeCount)
  };
};

const generateSentimentSummary = (sentiment, positive, negative) => {
  const total = positive + negative;
  
  if (total === 0) return 'Insufficient data for sentiment analysis';
  
  if (sentiment.includes('Positive') || sentiment.includes('positive')) {
    return `Overall ${sentiment.replace(/([A-Z])/g, ' $1').toLowerCase()} sentiment with ${positive} positive signals vs ${negative} negative signals`;
  }
  
  if (sentiment.includes('Negative') || sentiment.includes('negative')) {
    return `Overall ${sentiment.replace(/([A-Z])/g, ' $1').toLowerCase()} sentiment with ${negative} negative signals vs ${positive} positive signals`;
  }
  
  return 'Mixed or neutral sentiment signals detected';
};

export const analyzeNewsSentiment = (newsItems) => {
  const analyzedNews = newsItems.map(news => ({
    ...news,
    sentiment: analyzeTextSentiment(news.headline + ' ' + (news.summary || ''))
  }));
  
  const totalScore = analyzedNews.reduce((sum, news) => sum + news.sentiment.score, 0);
  const avgScore = totalScore / analyzedNews.length;
  
  const positiveNews = analyzedNews.filter(n => n.sentiment.score > 0.25);
  const negativeNews = analyzedNews.filter(n => n.sentiment.score < -0.25);
  const neutralNews = analyzedNews.filter(n => Math.abs(n.sentiment.score) <= 0.25);
  
  const bullishSignals = analyzedNews.filter(n => n.sentiment.score > 0.75);
  const bearishSignals = analyzedNews.filter(n => n.sentiment.score < -0.75);
  
  const allIndustries = [...new Set(analyzedNews.flatMap(n => n.sentiment.industries))];
  
  let overallSentiment;
  if (avgScore >= 1) overallSentiment = 'extremelyBullish';
  else if (avgScore >= 0.5) overallSentiment = 'bullish';
  else if (avgScore >= 0.15) overallSentiment = 'slightlyBullish';
  else if (avgScore <= -1) overallSentiment = 'extremelyBearish';
  else if (avgScore <= -0.5) overallSentiment = 'bearish';
  else if (avgScore <= -0.15) overallSentiment = 'slightlyBearish';
  else overallSentiment = 'neutral';
  
  return {
    overallSentiment,
    averageScore: Math.round(avgScore * 100) / 100,
    newsCount: newsItems.length,
    positiveNews: positiveNews.length,
    negativeNews: negativeNews.length,
    neutralNews: neutralNews.length,
    bullishSignals: bullishSignals.length,
    bearishSignals: bearishSignals.length,
    positiveRatio: Math.round((positiveNews.length / newsItems.length) * 100),
    industries: allIndustries,
    topPositive: positiveNews.slice(0, 3).map(n => n.headline),
    topNegative: negativeNews.slice(0, 3).map(n => n.headline),
    analyzedNews
  };
};

export const calculateFearGreedIndex = (marketData) => {
  const factors = {
    volatility: 0.15,
    momentum: 0.2,
    sentiment: 0.25,
    putCallRatio: 0.15,
    marketBreadth: 0.1,
    junkBondDemand: 0.15
  };
  
  let volatilityScore = 50;
  if (marketData.volatility > 30) volatilityScore = 20;
  else if (marketData.volatility > 20) volatilityScore = 35;
  else if (marketData.volatility < 10) volatilityScore = 80;
  else if (marketData.volatility < 15) volatilityScore = 65;
  
  let momentumScore = 50;
  if (marketData.trend === 'up') momentumScore = 70;
  if (marketData.trend === 'down') momentumScore = 30;
  if (marketData.momentum > 0.05) momentumScore = 85;
  if (marketData.momentum < -0.05) momentumScore = 15;
  
  let sentimentScore = 50;
  if (marketData.sentiment > 0.5) sentimentScore = 75;
  if (marketData.sentiment < -0.5) sentimentScore = 25;
  
  const fearGreedIndex = Math.round(
    factors.volatility * volatilityScore +
    factors.momentum * momentumScore +
    factors.sentiment * sentimentScore +
    factors.putCallRatio * 50 +
    factors.marketBreadth * 50 +
    factors.junkBondDemand * 50
  );
  
  let label;
  if (fearGreedIndex >= 75) label = 'Extreme Greed';
  else if (fearGreedIndex >= 55) label = 'Greed';
  else if (fearGreedIndex >= 45) label = 'Neutral';
  else if (fearGreedIndex >= 25) label = 'Fear';
  else label = 'Extreme Fear';
  
  return {
    value: fearGreedIndex,
    label,
    volatility: volatilityScore,
    momentum: momentumScore,
    sentiment: sentimentScore,
    color: fearGreedIndex >= 55 ? '#10b981' : fearGreedIndex >= 45 ? '#f59e0b' : '#ef4444'
  };
};

export const analyzeSocialSentiment = (socialPosts) => {
  const analyzedPosts = socialPosts.map(post => ({
    ...post,
    sentiment: analyzeTextSentiment(post.content)
  }));
  
  const totalEngagement = socialPosts.reduce((sum, p) => sum + (p.likes || 0) + (p.shares || 0), 0);
  
  const weightedScore = analyzedPosts.reduce((sum, post) => {
    const weight = 1 + Math.log10((post.likes || 0) + (post.shares || 0) + 1);
    return sum + post.sentiment.score * weight;
  }, 0) / analyzedPosts.length;
  
  const bullishMentions = analyzedPosts.filter(p => p.sentiment.score > 0.3).length;
  const bearishMentions = analyzedPosts.filter(p => p.sentiment.score < -0.3).length;
  
  return {
    overallScore: Math.round(weightedScore * 100) / 100,
    sentiment: weightedScore > 0.3 ? 'bullish' : weightedScore < -0.3 ? 'bearish' : 'neutral',
    totalPosts: socialPosts.length,
    bullishMentions,
    bearishMentions,
    bullishRatio: Math.round((bullishMentions / socialPosts.length) * 100),
    engagement: totalEngagement
  };
};

export const calculateMarketSentiment = (news, social, marketData) => {
  const newsSentiment = analyzeNewsSentiment(news);
  const socialSentiment = analyzeSocialSentiment(social);
  
  const weights = {
    news: 0.5,
    social: 0.3,
    technical: 0.2
  };
  
  const combinedScore = 
    (newsSentiment.averageScore * weights.news) +
    (socialSentiment.overallScore * weights.social) +
    (marketData.technicalScore || 0 * weights.technical);
  
  const fearGreed = calculateFearGreedIndex({
    volatility: marketData.volatility || 15,
    trend: marketData.trend || 'neutral',
    momentum: marketData.momentum || 0,
    sentiment: combinedScore
  });
  
  return {
    combinedScore: Math.round(combinedScore * 100) / 100,
    sentiment: combinedScore > 0.5 ? 'veryBullish' : 
               combinedScore > 0.2 ? 'bullish' :
               combinedScore > -0.2 ? 'neutral' :
               combinedScore > -0.5 ? 'bearish' : 'veryBearish',
    fearGreedIndex: fearGreed,
    newsSentiment,
    socialSentiment,
    recommendation: generateRecommendation(combinedScore, fearGreed.value)
  };
};

const generateRecommendation = (sentimentScore, fearGreedValue) => {
  if (sentimentScore > 0.5 && fearGreedValue > 60) {
    return {
      action: 'CAUTIOUS BUY',
      description: 'Strong positive sentiment but market may be overbought. Consider partial positions.',
      risk: 'medium'
    };
  }
  
  if (sentimentScore > 0.2 && fearGreedValue < 40) {
    return {
      action: 'BUY',
      description: 'Positive sentiment with favorable entry points due to market fear.',
      risk: 'low'
    };
  }
  
  if (sentimentScore < -0.5 && fearGreedValue < 30) {
    return {
      action: 'ACCUMULATE',
      description: 'Negative sentiment may be overdone. Look for value opportunities.',
      risk: 'high'
    };
  }
  
  if (sentimentScore < -0.2 && fearGreedValue > 70) {
    return {
      action: 'SELL / AVOID',
      description: 'Negative sentiment combined with extreme greed. High risk environment.',
      risk: 'veryHigh'
    };
  }
  
  return {
    action: 'HOLD',
    description: 'Mixed signals. Maintain current positions and wait for clarity.',
    risk: 'medium'
  };
};

export const trackSentimentTrend = (historicalSentiment, days = 30) => {
  if (historicalSentiment.length < 2) {
    return { trend: 'stable', change: 0 };
  }
  
  const recentAvg = historicalSentiment.slice(-7).reduce((a, b) => a + b, 0) / 7;
  const olderAvg = historicalSentiment.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
  
  const change = recentAvg - olderAvg;
  
  if (Math.abs(change) < 0.1) {
    return { trend: 'stable', change: Math.round(change * 100) };
  }
  
  if (change > 0) {
    return { trend: 'improving', change: Math.round(change * 100) };
  }
  
  return { trend: 'declining', change: Math.round(change * 100) };
};
