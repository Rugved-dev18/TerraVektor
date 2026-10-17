import React from 'react';
import { 
  Satellite,
  Compass,
  Search,
  MapPin,
  Database,
  Activity,
  ClipboardCheck,
  ImageIcon,
  Settings,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { HealthResponse } from '../types';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  healthStatus: HealthResponse | null;
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onPageChange, 
  healthStatus,
  isOpen = true,
  onCloseMobile
}) => {
  const sections: NavSection[] = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Overview', icon: Satellite },
        { id: 'sentinel2-search', label: 'Discover', icon: Compass },
        { id: 'semantic-search', label: 'Investigate', icon: Search, badge: 'Active' },
        { id: 'similar-locations', label: 'Compare', icon: MapPin },
      ]
    },
    {
      title: 'DATA',
      items: [
        { id: 'data', label: 'Scenes Archive', icon: Database },
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        { id: 'change-analysis', label: 'Change Analysis', icon: Activity },
        { id: 'evidence-studio', label: 'Evidence Studio', icon: Sparkles, badge: 'New' },
        { id: 'review-queue', label: 'Review Queue', icon: ClipboardCheck },
        { id: 'image-search', label: 'Visual Search', icon: ImageIcon },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'status', label: 'System Status', icon: Settings },
      ]
    }
  ];

  const isHealthy = healthStatus?.status === 'healthy';
  const isCdseOnline = healthStatus?.cdse_connected;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && onCloseMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-50
        w-[218px] bg-white border-r border-slate-200 flex flex-col shrink-0 select-none
        transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 bg-teal-800 rounded flex items-center justify-center text-white shadow-xs shrink-0">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>TERRAVEKTOR</span>
              </div>
              <div className="text-[10px] text-teal-800 font-mono tracking-tight font-medium mt-0.5 truncate">
                Geospatial Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-2.5 py-2.5 space-y-3.5 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onPageChange(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors text-xs group ${
                        isActive
                          ? 'bg-teal-50/80 text-teal-950 font-semibold border-l-2 border-teal-800 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-teal-800' : 'text-slate-400 group-hover:text-slate-600'
                        }`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && !isActive && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-normal">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Subsystem Health Indicator Footer */}
        <div className="p-2.5 border-t border-slate-200 bg-slate-50/80">
          <div className="p-2 rounded bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                {isHealthy && isCdseOnline ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span className="text-[10px] font-semibold text-slate-800 tracking-tight">
                  {isHealthy && isCdseOnline ? 'Copernicus CDSE' : 'CDSE Degraded'}
                </span>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isHealthy && isCdseOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>Sentinel-2 L2A</span>
              <span>10m BOA Grid</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
