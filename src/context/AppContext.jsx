// Global State Management - React Context for TraderAI

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { generateMarketData, updateMarketPrices, generateNewsData, generateMarketIndices, generateSectorPerformance } from '../data/marketData';

const AppContext = createContext();

const initialState = {
  marketData: null,
  news: [],
  indices: [],
  sectors: [],
  selectedAsset: null,
  selectedCategory: 'stocks',
  selectedSymbol: 'AAPL',
  isLoading: true,
  lastUpdate: null,
  portfolio: {
    cash: 100000,
    holdings: [],
    totalValue: 100000,
    dailyPnL: 0,
    totalPnL: 0
  },
  watchlist: ['AAPL', 'BTC', 'GOLD'],
  alerts: []
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MARKET_DATA':
      return { ...state, marketData: action.payload, isLoading: false, lastUpdate: new Date() };
    
    case 'UPDATE_PRICES':
      return { ...state, marketData: action.payload, lastUpdate: new Date() };
    
    case 'SET_NEWS':
      return { ...state, news: action.payload };
    
    case 'SET_INDICES':
      return { ...state, indices: action.payload };
    
    case 'SET_SECTORS':
      return { ...state, sectors: action.payload };
    
    case 'SELECT_ASSET':
      return { 
        ...state, 
        selectedCategory: action.payload.category,
        selectedSymbol: action.payload.symbol 
      };
    
    case 'UPDATE_PORTFOLIO':
      return { ...state, portfolio: { ...state.portfolio, ...action.payload } };
    
    case 'ADD_TO_WATCHLIST':
      if (state.watchlist.includes(action.payload)) return state;
      return { ...state, watchlist: [...state.watchlist, action.payload] };
    
    case 'REMOVE_FROM_WATCHLIST':
      return { ...state, watchlist: state.watchlist.filter(s => s !== action.payload) };
    
    case 'ADD_ALERT':
      return { ...state, alerts: [...state.alerts, action.payload] };
    
    case 'REMOVE_ALERT':
      return { ...state, alerts: state.alerts.filter(a => a.id !== action.payload) };
    
    case 'BUY_ASSET':
      const { symbol, quantity, price } = action.payload;
      const existingHolding = state.portfolio.holdings.find(h => h.symbol === symbol);
      const cost = quantity * price;
      
      if (cost > state.portfolio.cash) return state;
      
      let newHoldings;
      if (existingHolding) {
        const totalQty = existingHolding.quantity + quantity;
        const avgPrice = (existingHolding.avgPrice * existingHolding.quantity + cost) / totalQty;
        newHoldings = state.portfolio.holdings.map(h => 
          h.symbol === symbol ? { ...h, quantity: totalQty, avgPrice } : h
        );
      } else {
        newHoldings = [...state.portfolio.holdings, { symbol, quantity, avgPrice: price }];
      }
      
      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          cash: state.portfolio.cash - cost,
          holdings: newHoldings
        }
      };
    
    case 'SELL_ASSET':
      const { symbol: sellSymbol, quantity: sellQty, price: sellPrice } = action.payload;
      const holding = state.portfolio.holdings.find(h => h.symbol === sellSymbol);
      
      if (!holding || holding.quantity < sellQty) return state;
      
      const proceeds = sellQty * sellPrice;
      const newHoldingsAfterSale = holding.quantity === sellQty
        ? state.portfolio.holdings.filter(h => h.symbol !== sellSymbol)
        : state.portfolio.holdings.map(h => 
            h.symbol === sellSymbol ? { ...h, quantity: h.quantity - sellQty } : h
          );
      
      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          cash: state.portfolio.cash + proceeds,
          holdings: newHoldingsAfterSale
        }
      };
    
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  useEffect(() => {
    const marketData = generateMarketData();
    dispatch({ type: 'SET_MARKET_DATA', payload: marketData });
    dispatch({ type: 'SET_NEWS', payload: generateNewsData() });
    dispatch({ type: 'SET_INDICES', payload: generateMarketIndices() });
    dispatch({ type: 'SET_SECTORS', payload: generateSectorPerformance() });
  }, []);
  
  useEffect(() => {
    if (!state.marketData) return;
    
    const interval = setInterval(() => {
      const updated = updateMarketPrices(state.marketData);
      dispatch({ type: 'UPDATE_PRICES', payload: updated });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [state.marketData]);
  
  useEffect(() => {
    if (!state.marketData) return;
    
    const interval = setInterval(() => {
      dispatch({ type: 'SET_NEWS', payload: generateNewsData() });
      dispatch({ type: 'SET_INDICES', payload: generateMarketIndices() });
      dispatch({ type: 'SET_SECTORS', payload: generateSectorPerformance() });
    }, 60000);
    
    return () => clearInterval(interval);
  }, [state.marketData]);
  
  const selectAsset = (category, symbol) => {
    dispatch({ type: 'SELECT_ASSET', payload: { category, symbol } });
  };
  
  const addToWatchlist = (symbol) => {
    dispatch({ type: 'ADD_TO_WATCHLIST', payload: symbol });
  };
  
  const removeFromWatchlist = (symbol) => {
    dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: symbol });
  };
  
  const buyAsset = (symbol, quantity, price) => {
    dispatch({ type: 'BUY_ASSET', payload: { symbol, quantity, price } });
  };
  
  const sellAsset = (symbol, quantity, price) => {
    dispatch({ type: 'SELL_ASSET', payload: { symbol, quantity, price } });
  };
  
  const addAlert = (alert) => {
    dispatch({ type: 'ADD_ALERT', payload: { id: Date.now(), ...alert } });
  };
  
  const removeAlert = (id) => {
    dispatch({ type: 'REMOVE_ALERT', payload: id });
  };
  
  const getSelectedAsset = () => {
    if (!state.marketData) return null;
    return state.marketData[state.selectedCategory]?.[state.selectedSymbol] || null;
  };
  
  const value = {
    ...state,
    selectAsset,
    addToWatchlist,
    removeFromWatchlist,
    buyAsset,
    sellAsset,
    addAlert,
    removeAlert,
    getSelectedAsset
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export default AppContext;
