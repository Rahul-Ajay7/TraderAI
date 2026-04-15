// Trading Simulation Service - AI-Powered Trading with ₹1000 Initial Capital

const INITIAL_CAPITAL = 1000;

export const tradingSimulation = {
  state: {
    capital: INITIAL_CAPITAL,
    holdings: [],
    tradeHistory: [],
    portfolioHistory: [],
    isRunning: false,
    lastTradeTime: null,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    initialCapital: INITIAL_CAPITAL,
    lastPrices: {}
  },

  listeners: [],

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  notify() {
    this.listeners.forEach(callback => callback(this.getState()));
  },

  getState() {
    return { ...this.state };
  },

  calculatePortfolioValue(currentPrices) {
    const holdingsValue = this.state.holdings.reduce((sum, h) => {
      const price = currentPrices[h.symbol] || h.avgPrice;
      return sum + (h.quantity * price);
    }, 0);
    return this.state.capital + holdingsValue;
  },

  executeTrade(signal, asset, currentPrice) {
    const { symbol, name, type } = asset;
    const timestamp = new Date();

    if (signal === 'BUY' && this.state.capital >= currentPrice) {
      const allocation = this.state.capital * 0.2;
      const quantity = Math.max(1, Math.floor(allocation / currentPrice));

      if (quantity * currentPrice > this.state.capital) return null;
      if (quantity < 1) return null;

      const cost = quantity * currentPrice;
      const trade = {
        id: Date.now(),
        symbol,
        name,
        type,
        action: 'BUY',
        quantity,
        price: currentPrice,
        total: cost,
        timestamp,
        portfolioValue: this.calculatePortfolioValue({ [symbol]: currentPrice })
      };

      const existingHolding = this.state.holdings.find(h => h.symbol === symbol);

      if (existingHolding) {
        const totalQty = existingHolding.quantity + quantity;
        const avgPrice = (existingHolding.avgPrice * existingHolding.quantity + cost) / totalQty;
        existingHolding.quantity = totalQty;
        existingHolding.avgPrice = avgPrice;
      } else {
        this.state.holdings.push({
          symbol,
          name,
          type,
          quantity,
          avgPrice: currentPrice,
          buyPrice: currentPrice
        });
      }

      this.state.capital -= cost;
      this.state.tradeHistory.push(trade);
      this.state.totalTrades++;
      this.state.lastTradeTime = timestamp;

      this.recordPortfolioValue({ [symbol]: currentPrice });

      return trade;
    }

    if (signal === 'SELL') {
      const holding = this.state.holdings.find(h => h.symbol === symbol);

      if (holding && holding.quantity > 0) {
        const quantity = holding.quantity;
        const proceeds = quantity * currentPrice;
        const profit = (currentPrice - holding.avgPrice) * quantity;

        const trade = {
          id: Date.now(),
          symbol,
          name,
          type,
          action: 'SELL',
          quantity,
          price: currentPrice,
          total: proceeds,
          profit,
          profitPercent: ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100,
          timestamp,
          portfolioValue: this.calculatePortfolioValue({ [symbol]: currentPrice })
        };

        this.state.holdings = this.state.holdings.filter(h => h.symbol !== symbol);
        this.state.capital += proceeds;
        this.state.tradeHistory.push(trade);
        this.state.totalTrades++;

        if (profit > 0) {
          this.state.winningTrades++;
        } else {
          this.state.losingTrades++;
        }

        this.state.lastTradeTime = timestamp;

        this.recordPortfolioValue({ [symbol]: currentPrice });

        return trade;
      }
    }

    return null;
  },

  recordPortfolioValue(currentPrices = {}) {
    const allPrices = { ...this.state.lastPrices, ...currentPrices };
    this.state.lastPrices = allPrices;
    const totalValue = this.calculatePortfolioValue(allPrices);
    this.state.portfolioHistory.push({
      date: new Date(),
      value: totalValue,
      capital: this.state.capital,
      holdings: this.state.holdings.length
    });
  },

  runSimulationStep(predictions, currentPrices) {
    if (!this.state.isRunning) {
      this.state.isRunning = true;
    }

    this.state.lastPrices = { ...this.state.lastPrices, ...currentPrices };

    const buySignals = predictions
      .filter(p =>
        (p.recommendation.action === 'BUY' || p.recommendation.action === 'STRONG_BUY') &&
        p.confidence >= 50
      )
      .sort((a, b) => b.confidence - a.confidence);

    const sellSignals = predictions.filter(p =>
      p.recommendation.action === 'SELL' || p.recommendation.action === 'AVOID' || p.recommendation.action === 'HOLD'
    );

    sellSignals.forEach(signal => {
      const holding = this.state.holdings.find(h => h.symbol === signal.symbol);
      if (holding && holding.quantity > 0) {
        const price = currentPrices[signal.symbol];
        if (price && price > 0) {
          this.executeTrade('SELL', signal, price);
        }
      }
    });

    this.state.holdings.forEach(holding => {
      const asset = predictions.find(p => p.symbol === holding.symbol);
      if (asset) {
        const price = currentPrices[holding.symbol];
        const currentPL = price ? ((price - holding.avgPrice) / holding.avgPrice) * 100 : 0;
        
        const shouldSell = 
          asset.recommendation.action === 'SELL' ||
          asset.recommendation.action === 'AVOID' ||
          asset.recommendation.action === 'HOLD' ||
          asset.confidence >= 60 && parseFloat(asset.prediction?.predictedChange || 0) < -1 ||
          currentPL < -5;

        if (price && shouldSell) {
          this.executeTrade('SELL', asset, price);
        }
      }
    });

    this.state.holdings.forEach(holding => {
      const price = currentPrices[holding.symbol];
      if (price) {
        const profitPercent = ((price - holding.avgPrice) / holding.avgPrice) * 100;
        if (profitPercent >= 10) {
          this.executeTrade('SELL', holding, price);
        }
      }
    });

    const maxPositions = 6;
    const currentPositions = this.state.holdings.length;
    
    if (currentPositions < maxPositions && this.state.capital > 50) {
      buySignals.forEach(signal => {
        if (this.state.holdings.length >= maxPositions) return;
        if (this.state.holdings.some(h => h.symbol === signal.symbol)) return;
        
        const price = currentPrices[signal.symbol];
        if (price && price > 0 && this.state.capital >= price) {
          this.executeTrade('BUY', signal, price);
        }
      });
    }

    this.recordPortfolioValue(currentPrices);
    this.notify();
  },

  startSimulation() {
    if (!this.state.isRunning) {
      this.state.isRunning = true;
      this.recordPortfolioValue();
      this.notify();
    }
  },

  stopSimulation() {
    this.state.isRunning = false;
    this.notify();
  },

  resetSimulation() {
    this.state = {
      capital: INITIAL_CAPITAL,
      holdings: [],
      tradeHistory: [],
      portfolioHistory: [],
      isRunning: false,
      lastTradeTime: null,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      initialCapital: INITIAL_CAPITAL,
      lastPrices: {}
    };
    this.notify();
  },

  getStats() {
    const currentValue = this.calculatePortfolioValue(this.state.lastPrices);
    
    const totalReturn = ((currentValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
    const winRate = this.state.totalTrades > 0
      ? (this.state.winningTrades / this.state.totalTrades) * 100
      : 0;

    return {
      initialCapital: INITIAL_CAPITAL,
      currentValue,
      totalReturn,
      totalTrades: this.state.totalTrades,
      winningTrades: this.state.winningTrades,
      losingTrades: this.state.losingTrades,
      winRate,
      holdings: this.state.holdings,
      cash: this.state.capital,
      portfolioHistory: this.state.portfolioHistory,
      lastPrices: this.state.lastPrices
    };
  },

  getTradeHistory() {
    return [...this.state.tradeHistory].reverse();
  }
};

export const getIndianStockPredictions = () => {
  const stocks = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', type: 'stock', basePrice: 2950 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', type: 'stock', basePrice: 4100 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'stock', basePrice: 1720 },
    { symbol: 'INFY', name: 'Infosys', type: 'stock', basePrice: 1850 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', type: 'stock', basePrice: 1150 },
    { symbol: 'SBIN', name: 'State Bank of India', type: 'stock', basePrice: 780 },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', type: 'stock', basePrice: 1450 },
    { symbol: 'ITC', name: 'ITC Limited', type: 'stock', basePrice: 465 },
    { symbol: 'LT', name: 'Larsen & Toubro', type: 'stock', basePrice: 3650 },
    { symbol: 'AXISBANK', name: 'Axis Bank', type: 'stock', basePrice: 1080 }
  ];

  return stocks.map(stock => {
    const change = (Math.random() - 0.5) * 8;
    const score = Math.random() * 10 - 5;
    let action = 'HOLD';
    let confidence = 50 + Math.random() * 30;

    if (score > 2 && confidence > 60) action = 'STRONG_BUY';
    else if (score > 0.5 && confidence > 55) action = 'BUY';
    else if (score < -2 && confidence > 60) action = 'AVOID';
    else if (score < -0.5 && confidence > 55) action = 'SELL';

    return {
      ...stock,
      price: stock.basePrice * (1 + change / 100),
      change24h: change,
      recommendation: { action, confidence: Math.round(confidence) },
      prediction: { score: score.toFixed(1), predictedChange: change.toFixed(2) }
    };
  });
};

export const formatINR = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export default tradingSimulation;
