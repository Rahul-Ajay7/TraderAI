import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  LineChart,
  Brain,
  TrendingUp,
  Briefcase,
  Newspaper,
  Settings,
  Bell,
  ChevronRight,
  Activity
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analysis', label: 'Analysis', icon: LineChart },
  { id: 'predictions', label: 'Predictions', icon: Brain },
  { id: 'strategies', label: 'Strategies', icon: TrendingUp },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'news', label: 'News Feed', icon: Newspaper }
];

const Sidebar = ({ currentPage, onNavigate }) => {
  const { lastUpdate, alerts } = useApp();
  
  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col">
      <div className="p-6 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TraderAI</h1>
            <p className="text-xs text-gray-400">Mini Aladdin Platform</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30' 
                      : 'text-gray-400 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-dark-600">
        <div className="card bg-dark-700/50">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
            <span>Live Data Connected</span>
          </div>
          <div className="text-xs text-gray-500">
            Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Loading...'}
          </div>
        </div>
        
        {alerts.length > 0 && (
          <div className="mt-4 card bg-accent-danger/10 border-accent-danger/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent-danger" />
              <span className="text-sm text-accent-danger font-medium">
                {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-dark-600">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-all">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
