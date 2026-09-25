import React from 'react';
import { 
  Search, 
  Image as ImageIcon, 
  Activity, 
  MapPin, 
  ClipboardCheck, 
  Database, 
  Settings,
  Satellite,
  Compass
} from 'lucide-react';
import { HealthResponse } from '../types';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  healthStatus: HealthResponse | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, healthStatus }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Satellite },
    { id: 'sentinel2-search', label: 'Sentinel-2 Discovery', icon: Compass },
    { id: 'semantic-search', label: 'Semantic Search', icon: Search },
    { id: 'image-search', label: 'Image Search', icon: ImageIcon },
    { id: 'change-analysis', label: 'Change Analysis', icon: Activity },
    { id: 'similar-locations', label: 'Similar Locations', icon: MapPin },
    { id: 'review-queue', label: 'Review Queue', icon: ClipboardCheck },
    { id: 'data', label: 'Data / Scenes', icon: Database },
    { id: 'status', label: 'System Status', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-ui-dark border-r border-ui-border flex flex-col">
      <div className="p-4 border-b border-ui-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-satellite-500 rounded-lg flex items-center justify-center">
            <Satellite className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Change Analysis</h2>
            <p className="text-xs text-slate-400">v1.0.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-satellite-500/20 text-satellite-400 border border-satellite-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-satellite-400' : 'text-slate-400'}`} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-ui-border">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">System Status</span>
            <div className={`w-2 h-2 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <div className="text-xs text-slate-300">
            {healthStatus?.status === 'healthy' ? 'All systems operational' : 'System degraded'}
          </div>
          {healthStatus && (
            <div className="mt-2 text-xs text-slate-500">
              Services: {Object.keys(healthStatus.services).length} active
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
