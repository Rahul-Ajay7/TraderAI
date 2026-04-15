// Market Data Generator - Creates realistic mock market data

const assets = {
  stocks: [
    { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 178.50, volatility: 0.02 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 141.25, volatility: 0.025 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 378.90, volatility: 0.018 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 178.25, volatility: 0.022 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 875.40, volatility: 0.035 },
    { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 248.50, volatility: 0.045 },
    { symbol: 'META', name: 'Meta Platforms', basePrice: 505.75, volatility: 0.028 },
    { symbol: 'JPM', name: 'JPMorgan Chase', basePrice: 198.30, volatility: 0.015 },
    { symbol: 'V', name: 'Visa Inc.', basePrice: 279.85, volatility: 0.014 },
    { symbol: 'WMT', name: 'Walmart Inc.', basePrice: 165.20, volatility: 0.012 }
  ],
  crypto: [
    { symbol: 'BTC', name: 'Bitcoin', basePrice: 67500, volatility: 0.04 },
    { symbol: 'ETH', name: 'Ethereum', basePrice: 3450, volatility: 0.045 },
    { symbol: 'BNB', name: 'Binance Coin', basePrice: 605, volatility: 0.038 },
    { symbol: 'SOL', name: 'Solana', basePrice: 168, volatility: 0.055 },
    { symbol: 'XRP', name: 'Ripple', basePrice: 0.62, volatility: 0.05 },
    { symbol: 'ADA', name: 'Cardano', basePrice: 0.58, volatility: 0.048 },
    { symbol: 'DOGE', name: 'Dogecoin', basePrice: 0.165, volatility: 0.06 },
    { symbol: 'DOT', name: 'Polkadot', basePrice: 7.85, volatility: 0.042 },
    { symbol: 'AVAX', name: 'Avalanche', basePrice: 42.50, volatility: 0.05 },
    { symbol: 'LINK', name: 'Chainlink', basePrice: 18.75, volatility: 0.046 }
  ],
  commodities: [
    { symbol: 'GOLD', name: 'Gold', basePrice: 2350, volatility: 0.012 },
    { symbol: 'SILVER', name: 'Silver', basePrice: 28.50, volatility: 0.022 },
    { symbol: 'OIL', name: 'Crude Oil (WTI)', basePrice: 82.50, volatility: 0.025 },
    { symbol: 'NATGAS', name: 'Natural Gas', basePrice: 2.85, volatility: 0.035 },
    { symbol: 'COPPER', name: 'Copper', basePrice: 4.85, volatility: 0.02 },
    { symbol: 'WHEAT', name: 'Wheat', basePrice: 6.25, volatility: 0.028 },
    { symbol: 'CORN', name: 'Corn', basePrice: 4.65, volatility: 0.025 },
    { symbol: 'PLATINUM', name: 'Platinum', basePrice: 1025, volatility: 0.018 },
    { symbol: 'COFFEE', name: 'Coffee', basePrice: 2.35, volatility: 0.032 },
    { symbol: 'LITHIUM', name: 'Lithium', basePrice: 12.50, volatility: 0.04 }
  ]
};

const generateOHLCV = (basePrice, volatility, days = 100) => {
  const data = [];
  let currentPrice = basePrice * (0.85 + Math.random() * 0.3);
  const trend = (Math.random() - 0.48) * 0.001;
  
  for (let i = 0; i < days; i++) {
    const dailyReturn = trend + (Math.random() - 0.5) * volatility;
    currentPrice = currentPrice * (1 + dailyReturn);
    
    const high = currentPrice * (1 + Math.random() * volatility * 0.5);
    const low = currentPrice * (1 - Math.random() * volatility * 0.5);
    const open = low + Math.random() * (high - low);
    const close = low + Math.random() * (high - low);
    const volume = basePrice * 1000000 * (0.5 + Math.random());
    
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.round(volume)
    });
  }
  
  return data;
};

export const generateMarketData = () => {
  const marketData = {};
  
  Object.entries(assets).forEach(([category, items]) => {
    marketData[category] = {};
    items.forEach(asset => {
      marketData[category][asset.symbol] = {
        ...asset,
        category,
        data: generateOHLCV(asset.basePrice, asset.volatility),
        price: null,
        change: null,
        changePercent: null
      };
      
      const latestData = marketData[category][asset.symbol].data;
      const previousClose = latestData[latestData.length - 2]?.close || asset.basePrice;
      const currentPrice = latestData[latestData.length - 1].close;
      
      marketData[category][asset.symbol].price = currentPrice;
      marketData[category][asset.symbol].previousClose = previousClose;
      marketData[category][asset.symbol].change = currentPrice - previousClose;
      marketData[category][asset.symbol].changePercent = ((currentPrice - previousClose) / previousClose) * 100;
    });
  });
  
  return marketData;
};

export const updateMarketPrices = (marketData) => {
  Object.keys(marketData).forEach(category => {
    Object.keys(marketData[category]).forEach(symbol => {
      const asset = marketData[category][symbol];
      const lastData = asset.data[asset.data.length - 1];
      
      const change = (Math.random() - 0.5) * asset.volatility * 2;
      const newPrice = lastData.close * (1 + change);
      
      const updatedCandle = {
        ...lastData,
        high: Math.max(lastData.high, newPrice),
        low: Math.min(lastData.low, newPrice),
        close: parseFloat(newPrice.toFixed(2)),
        volume: lastData.volume + Math.round(Math.random() * 100000)
      };
      
      asset.data[asset.data.length - 1] = updatedCandle;
      asset.price = updatedCandle.close;
      asset.change = updatedCandle.close - asset.previousClose;
      asset.changePercent = ((updatedCandle.close - asset.previousClose) / asset.previousClose) * 100;
    });
  });
  
  return marketData;
};

export const getAssetData = (marketData, category, symbol) => {
  return marketData[category]?.[symbol] || null;
};

export const getAllAssets = (marketData) => {
  const allAssets = [];
  
  Object.entries(marketData).forEach(([category, assets]) => {
    Object.values(assets).forEach(asset => {
      allAssets.push({
        ...asset,
        category
      });
    });
  });
  
  return allAssets.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
};

export const generateNewsData = () => {
  const newsTemplates = [
    { headline: 'Fed Signals Potential Rate Cuts in Coming Months', sentiment: 'positive', category: 'macro' },
    { headline: 'Tech Stocks Rally on Strong Earnings Reports', sentiment: 'positive', category: 'stocks' },
    { headline: 'Oil Prices Surge on Middle East Tensions', sentiment: 'negative', category: 'commodities' },
    { headline: 'Bitcoin Breaks Key Resistance Level Amid Institutional Interest', sentiment: 'positive', category: 'crypto' },
    { headline: 'Global Economic Growth Shows Signs of Deceleration', sentiment: 'negative', category: 'macro' },
    { headline: 'AI Chip Demand Continues to Exceed Expectations', sentiment: 'positive', category: 'tech' },
    { headline: 'Central Banks Coordinate Policy Response to Market Volatility', sentiment: 'positive', category: 'macro' },
    { headline: 'Supply Chain Disruptions Impact Manufacturing Sector', sentiment: 'negative', category: 'macro' },
    { headline: 'Consumer Confidence Index Rises to 6-Month High', sentiment: 'positive', category: 'macro' },
    { headline: 'Major Tech Company Announces Layoffs Amid Restructuring', sentiment: 'negative', category: 'stocks' },
    { headline: 'Cryptocurrency Market Cap Surpasses $3 Trillion', sentiment: 'positive', category: 'crypto' },
    { headline: 'Gold Prices Steady as Investors Seek Safe Haven', sentiment: 'neutral', category: 'commodities' },
    { headline: 'Retail Sales Data Beats Analyst Expectations', sentiment: 'positive', category: 'macro' },
    { headline: 'Regulatory Concerns Weigh on Crypto Markets', sentiment: 'negative', category: 'crypto' },
    { headline: 'Semiconductor Shortage Expected to Ease by Q3', sentiment: 'positive', category: 'tech' }
  ];
  
  return newsTemplates.map((template, index) => {
    const date = new Date();
    date.setHours(date.getHours() - index * 4);
    
    return {
      id: `news-${index}`,
      headline: template.headline,
      summary: `Market analysts are closely monitoring the situation as ${template.headline.toLowerCase()}. Investors remain cautious but optimistic about future developments.`,
      sentiment: template.sentiment,
      category: template.category,
      timestamp: date.toISOString(),
      source: ['Bloomberg', 'Reuters', 'CNBC', 'WSJ', 'Financial Times'][Math.floor(Math.random() * 5)],
      impact: Math.random() > 0.5 ? 'high' : 'medium'
    };
  });
};

export const generateMarketIndices = () => {
  return [
    { name: 'S&P 500', value: 5285.35, change: 0.85, changePercent: 0.02 },
    { name: 'NASDAQ', value: 16742.50, change: 125.30, changePercent: 0.75 },
    { name: 'DOW JONES', value: 39512.80, change: -45.20, changePercent: -0.11 },
    { name: 'Russell 2000', value: 2056.25, change: 18.45, changePercent: 0.90 },
    { name: 'VIX', value: 14.25, change: -0.85, changePercent: -5.63 },
    { name: 'BTC Index', value: 67500, change: 1250, changePercent: 1.89 },
    { name: 'ETH Index', value: 3450, change: -45, changePercent: -1.29 },
    { name: 'Gold', value: 2350, change: 12.50, changePercent: 0.53 }
  ];
};

export const generateSectorPerformance = () => {
  return [
    { name: 'Technology', change: 1.85, stocks: 45 },
    { name: 'Healthcare', change: 0.72, stocks: 32 },
    { name: 'Financials', change: 0.45, stocks: 28 },
    { name: 'Energy', change: -0.85, stocks: 22 },
    { name: 'Consumer Discretionary', change: 1.25, stocks: 35 },
    { name: 'Industrials', change: 0.38, stocks: 25 },
    { name: 'Materials', change: -0.42, stocks: 18 },
    { name: 'Real Estate', change: -1.15, stocks: 20 },
    { name: 'Utilities', change: 0.22, stocks: 15 },
    { name: 'Communication Services', change: 0.95, stocks: 23 }
  ];
};

export const generateEconomicCalendar = () => {
  return [
    { event: 'FOMC Meeting Minutes', date: '2024-05-15', impact: 'high', previous: '2.5%', forecast: '2.5%' },
    { event: 'CPI Data Release', date: '2024-05-15', impact: 'high', previous: '3.4%', forecast: '3.2%' },
    { event: 'Non-Farm Payrolls', date: '2024-05-17', impact: 'high', previous: '175K', forecast: '185K' },
    { event: 'Retail Sales', date: '2024-05-16', impact: 'medium', previous: '0.6%', forecast: '0.4%' },
    { event: 'Consumer Sentiment', date: '2024-05-17', impact: 'medium', previous: '77.2', forecast: '76.8' },
    { event: 'Industrial Production', date: '2024-05-18', impact: 'low', previous: '0.4%', forecast: '0.3%' },
    { event: 'Housing Starts', date: '2024-05-20', impact: 'medium', previous: '1.32M', forecast: '1.35M' },
    { event: 'PMI Flash', date: '2024-05-21', impact: 'medium', previous: '52.4', forecast: '52.6' }
  ];
};
