const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export const fetchCryptoList = async () => {
  try {
    const response = await fetch(`${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=1h,24h,7d`);
    if (!response.ok) throw new Error('Failed to fetch crypto list');
    return await response.json();
  } catch (error) {
    console.error('CoinGecko API Error:', error);
    return getFallbackCryptoList();
  }
};

export const fetchCryptoDetails = async (coinId) => {
  try {
    const [details, marketChart] = await Promise.all([
      fetch(`${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`),
      fetch(`${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=30`)
    ]);
    
    if (!details.ok || !marketChart.ok) throw new Error('Failed to fetch crypto details');
    
    const detailsData = await details.json();
    const chartData = await marketChart.json();
    
    return { details: detailsData, chartData };
  } catch (error) {
    console.error('Error fetching crypto details:', error);
    return null;
  }
};

export const fetchCryptoPrice = async (coinId) => {
  try {
    const response = await fetch(`${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
    if (!response.ok) throw new Error('Failed to fetch price');
    return await response.json();
  } catch (error) {
    console.error('Price fetch error:', error);
    return null;
  }
};

export const searchCoins = async (query) => {
  try {
    const response = await fetch(`${COINGECKO_BASE}/search?query=${query}`);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    return data.coins?.slice(0, 10) || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

export const fetchTrendingCoins = async () => {
  try {
    const response = await fetch(`${COINGECKO_BASE}/search/trending`);
    if (!response.ok) throw new Error('Failed to fetch trending');
    const data = await response.json();
    return data.coins?.map(c => c.item) || [];
  } catch (error) {
    console.error('Trending error:', error);
    return [];
  }
};

const getFallbackCryptoList = () => [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 67500, market_cap: 1300000000000, price_change_percentage_24h: 1.5, sparkline_in_7d: { price: Array(168).fill(67000).map((v, i) => v + (Math.random() - 0.5) * 2000) } },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3450, market_cap: 400000000000, price_change_percentage_24h: 2.1, sparkline_in_7d: { price: Array(168).fill(3400).map((v, i) => v + (Math.random() - 0.5) * 100) } },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', current_price: 605, market_cap: 90000000000, price_change_percentage_24h: 0.8, sparkline_in_7d: { price: Array(168).fill(600).map((v, i) => v + (Math.random() - 0.5) * 20) } },
  { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 168, market_cap: 75000000000, price_change_percentage_24h: 3.2, sparkline_in_7d: { price: Array(168).fill(165).map((v, i) => v + (Math.random() - 0.5) * 10) } },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 0.62, market_cap: 35000000000, price_change_percentage_24h: -0.5, sparkline_in_7d: { price: Array(168).fill(0.60).map((v, i) => v + (Math.random() - 0.5) * 0.05) } },
];
