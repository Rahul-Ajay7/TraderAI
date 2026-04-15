const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'demo';

export const fetchStockQuote = async (symbol) => {
  try {
    const response = await fetch(
      `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
    );
    if (!response.ok) throw new Error('Failed to fetch stock quote');
    const data = await response.json();
    return data['Global Quote'];
  } catch (error) {
    console.error('Alpha Vantage Error:', error);
    return getFallbackStockQuote(symbol);
  }
};

export const fetchStockDaily = async (symbol) => {
  try {
    const response = await fetch(
      `${ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${API_KEY}`
    );
    if (!response.ok) throw new Error('Failed to fetch daily data');
    const data = await response.json();
    const timeSeries = data['Time Series (Daily)'];
    
    if (!timeSeries) {
      return getFallbackStockHistory(symbol);
    }
    
    return Object.entries(timeSeries).map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'])
    })).reverse();
  } catch (error) {
    console.error('Daily data error:', error);
    return getFallbackStockHistory(symbol);
  }
};

export const searchStocks = async (query) => {
  try {
    const response = await fetch(
      `${ALPHA_VANTAGE_BASE}?function=SYMBOL_SEARCH&keywords=${query}&apikey=${API_KEY}`
    );
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    return data.bestMatches || [];
  } catch (error) {
    console.error('Stock search error:', error);
    return [];
  }
};

export const stockList = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financial' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial' },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Defensive' },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communication' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology' },
  { symbol: 'BA', name: 'Boeing Co.', sector: 'Industrials' },
];

const getFallbackStockQuote = (symbol) => {
  const basePrices = {
    AAPL: 178.50, GOOGL: 141.25, MSFT: 378.90, AMZN: 178.25,
    NVDA: 875.40, TSLA: 248.50, META: 505.75, JPM: 198.30,
    V: 279.85, WMT: 165.20
  };
  const price = basePrices[symbol] || 100;
  const change = (Math.random() - 0.5) * 5;
  return {
    '05. price': price.toString(),
    '09. change': change.toString(),
    '10. change percent': `${change >= 0 ? '+' : ''}${(change / price * 100).toFixed(2)}%`
  };
};

const getFallbackStockHistory = (symbol) => {
  const basePrices = {
    AAPL: 175, GOOGL: 140, MSFT: 375, AMZN: 175,
    NVDA: 850, TSLA: 245, META: 500, JPM: 195,
    V: 275, WMT: 162
  };
  const base = basePrices[symbol] || 100;
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const price = base + (Math.random() - 0.48) * base * 0.1;
    data.push({
      date: date.toISOString().split('T')[0],
      open: price * (1 + (Math.random() - 0.5) * 0.02),
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      close: price,
      volume: Math.round(50000000 + Math.random() * 30000000)
    });
  }
  return data;
};
