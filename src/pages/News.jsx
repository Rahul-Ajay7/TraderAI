import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Clock,
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Activity,
  DollarSign
} from 'lucide-react';
import { analyzeTextSentiment } from '../utils/sentimentAnalysis';

const NewsCard = ({ news, onClick }) => {
  const sentiment = analyzeTextSentiment(news.headline + ' ' + (news.summary || ''));
  
  return (
    <div 
      className="card hover:bg-dark-700/50 cursor-pointer transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          news.category === 'macro' ? 'bg-accent-primary/20' :
          news.category === 'crypto' ? 'bg-accent-warning/20' :
          news.category === 'stocks' ? 'bg-accent-success/20' :
          news.category === 'tech' ? 'bg-accent-secondary/20' :
          'bg-gray-500/20'
        }`}>
          {news.category === 'macro' ? <BarChart3 className="w-5 h-5 text-accent-primary" /> :
           news.category === 'crypto' ? <Activity className="w-5 h-5 text-accent-warning" /> :
           news.category === 'stocks' ? <TrendingUp className="w-5 h-5 text-accent-success" /> :
           news.category === 'tech' ? <Activity className="w-5 h-5 text-accent-secondary" /> :
           <DollarSign className="w-5 h-5 text-gray-400" />}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              sentiment.score > 0.3 ? 'bg-accent-success/20 text-accent-success' :
              sentiment.score < -0.3 ? 'bg-accent-danger/20 text-accent-danger' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {sentiment.score > 0.3 ? 'Bullish' : sentiment.score < -0.3 ? 'Bearish' : 'Neutral'}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-dark-600 text-gray-400">
              {news.category}
            </span>
            {news.impact === 'high' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-danger/20 text-accent-danger">
                High Impact
              </span>
            )}
          </div>
          
          <h3 className="text-white font-medium mb-2 line-clamp-2">{news.headline}</h3>
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">{news.summary}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(news.timestamp).toLocaleString()}
              </span>
              <span>{news.source}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

const SentimentBreakdown = ({ news }) => {
  const sentimentCounts = useMemo(() => {
    return news.reduce((acc, item) => {
      const sentiment = analyzeTextSentiment(item.headline + ' ' + (item.summary || ''));
      if (sentiment.score > 0.3) acc.bullish++;
      else if (sentiment.score < -0.3) acc.bearish++;
      else acc.neutral++;
      return acc;
    }, { bullish: 0, bearish: 0, neutral: 0 });
  }, [news]);
  
  const total = news.length || 1;
  
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Sentiment Breakdown</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-success" />
              <span className="text-white">Bullish</span>
            </div>
            <span className="text-accent-success font-mono">{sentimentCounts.bullish}</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-success"
              style={{ width: `${(sentimentCounts.bullish / total) * 100}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-accent-danger" />
              <span className="text-white">Bearish</span>
            </div>
            <span className="text-accent-danger font-mono">{sentimentCounts.bearish}</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-danger"
              style={{ width: `${(sentimentCounts.bearish / total) * 100}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-white">Neutral</span>
            </div>
            <span className="text-gray-400 font-mono">{sentimentCounts.neutral}</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-500"
              style={{ width: `${(sentimentCounts.neutral / total) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-dark-600">
        <div className="text-center">
          <div className={`text-3xl font-bold ${
            sentimentCounts.bullish > sentimentCounts.bearish ? 'text-accent-success' :
            sentimentCounts.bearish > sentimentCounts.bullish ? 'text-accent-danger' :
            'text-gray-400'
          }`}>
            {sentimentCounts.bullish > sentimentCounts.bearish ? 'Bullish' :
             sentimentCounts.bearish > sentimentCounts.bullish ? 'Bearish' : 'Neutral'} Overall
          </div>
          <div className="text-gray-400 text-sm mt-1">
            Based on {total} articles
          </div>
        </div>
      </div>
    </div>
  );
};

const CategoryFilter = ({ activeCategory, onCategoryChange }) => {
  const categories = [
    { id: 'all', label: 'All', icon: Newspaper },
    { id: 'macro', label: 'Macro', icon: BarChart3 },
    { id: 'stocks', label: 'Stocks', icon: TrendingUp },
    { id: 'crypto', label: 'Crypto', icon: Activity },
    { id: 'tech', label: 'Tech', icon: Activity },
    { id: 'commodities', label: 'Commodities', icon: DollarSign }
  ];
  
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {categories.map(cat => {
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-accent-primary text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};

const News = () => {
  const { news } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [selectedNews, setSelectedNews] = useState(null);
  
  const filteredNews = useMemo(() => {
    return news.filter(item => {
      const matchesSearch = 
        item.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = 
        activeCategory === 'all' || item.category === activeCategory;
      
      const sentiment = analyzeTextSentiment(item.headline + ' ' + (item.summary || ''));
      const matchesSentiment = 
        sentimentFilter === 'all' ||
        (sentimentFilter === 'bullish' && sentiment.score > 0.3) ||
        (sentimentFilter === 'bearish' && sentiment.score < -0.3) ||
        (sentimentFilter === 'neutral' && Math.abs(sentiment.score) <= 0.3);
      
      return matchesSearch && matchesCategory && matchesSentiment;
    });
  }, [news, searchTerm, activeCategory, sentimentFilter]);
  
  const handleNewsClick = (item) => {
    setSelectedNews(item);
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-secondary to-accent-primary rounded-xl flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">News Feed</h1>
            <p className="text-gray-400">Real-time market news and sentiment analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
          <span>Live Updates</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search news..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Sentiment</option>
            <option value="bullish">Bullish</option>
            <option value="neutral">Neutral</option>
            <option value="bearish">Bearish</option>
          </select>
        </div>
      </div>
      
      <CategoryFilter activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filteredNews.length === 0 ? (
            <div className="card text-center py-12">
              <Newspaper className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No news articles found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            filteredNews.map((item, i) => (
              <NewsCard 
                key={i} 
                news={item}
                onClick={() => handleNewsClick(item)}
              />
            ))
          )}
        </div>
        
        <div className="space-y-6">
          <SentimentBreakdown news={filteredNews} />
          
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Total Articles</span>
                </div>
                <span className="text-white font-mono">{filteredNews.length}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent-danger" />
                  <span className="text-gray-400">High Impact</span>
                </div>
                <span className="text-white font-mono">
                  {filteredNews.filter(n => n.impact === 'high').length}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Latest Update</span>
                </div>
                <span className="text-white text-sm">
                  {new Date(news[0]?.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
            <div className="space-y-2">
              {['macro', 'stocks', 'crypto', 'tech', 'commodities'].map(cat => (
                <div 
                  key={cat}
                  className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors"
                  onClick={() => setActiveCategory(cat)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      cat === 'macro' ? 'bg-accent-primary' :
                      cat === 'crypto' ? 'bg-accent-warning' :
                      cat === 'stocks' ? 'bg-accent-success' :
                      cat === 'tech' ? 'bg-accent-secondary' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-white capitalize">{cat}</span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {filteredNews.filter(n => n.category === cat).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedNews.category === 'macro' ? 'bg-accent-primary/20 text-accent-primary' :
                  selectedNews.category === 'crypto' ? 'bg-accent-warning/20 text-accent-warning' :
                  selectedNews.category === 'stocks' ? 'bg-accent-success/20 text-accent-success' :
                  selectedNews.category === 'tech' ? 'bg-accent-secondary/20 text-accent-secondary' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {selectedNews.category}
                </span>
                <span className="text-gray-500 text-sm">{selectedNews.source}</span>
              </div>
              <button 
                onClick={() => setSelectedNews(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">{selectedNews.headline}</h2>
            
            <p className="text-gray-300 mb-6">{selectedNews.summary}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(selectedNews.timestamp).toLocaleString()}
              </span>
              <a href="#" className="flex items-center gap-1 text-accent-primary hover:underline">
                Read Full Article <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
