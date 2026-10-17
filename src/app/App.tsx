import React, { useState, useEffect } from 'react';
import { Menu, X, Compass, Radio } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Dashboard from '../pages/Dashboard';
import SemanticSearch from '../pages/SemanticSearch';
import ImageSearch from '../pages/ImageSearch';
import ChangeAnalysis from '../pages/ChangeAnalysis';
import SimilarLocations from '../pages/SimilarLocations';
import ReviewQueue from '../pages/ReviewQueue';
import DataManagement from '../pages/DataManagement';
import SystemStatus from '../pages/SystemStatus';
import Sentinel2Search from '../pages/Sentinel2Search';
import EvidenceStudio from '../pages/EvidenceStudio';
import { getHealth, isExplicitDemoModeActive, setExplicitDemoMode } from '../services/api';
import { HealthResponse } from '../types';

type PageType = 'dashboard' | 'sentinel2-search' | 'semantic-search' | 'image-search' | 'change-analysis' | 'evidence-studio' | 'similar-locations' | 'review-queue' | 'data' | 'status';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('semantic-search');
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isExplicitDemoModeActive());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkHealth();
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    const next = !isDemoMode;
    setIsDemoMode(next);
    setExplicitDemoMode(next);
  };

  const checkHealth = async () => {
    try {
      const health = await getHealth();
      setHealthStatus(health);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={(page) => setCurrentPage(page as PageType)} />;
      case 'sentinel2-search':
        return <Sentinel2Search />;
      case 'semantic-search':
        return <SemanticSearch onNavigateToEvidenceStudio={() => setCurrentPage('evidence-studio')} />;
      case 'image-search':
        return <ImageSearch />;
      case 'change-analysis':
        return <ChangeAnalysis onOpenEvidenceStudio={() => setCurrentPage('evidence-studio')} />;
      case 'evidence-studio':
        return <EvidenceStudio />;
      case 'similar-locations':
        return <SimilarLocations />;
      case 'review-queue':
        return <ReviewQueue />;
      case 'data':
        return <DataManagement />;
      case 'status':
        return <SystemStatus healthStatus={healthStatus} />;
      default:
        return <SemanticSearch />;
    }
  };

  const isUpstreamDown = !healthStatus?.cdse_connected || healthStatus?.data_mode === 'upstream_unavailable';

  return (
    <div className="flex h-screen bg-[#f8f9fa] text-slate-800 antialiased font-sans">
      {/* 218px Compact Command Rail */}
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={(page) => setCurrentPage(page as PageType)}
        healthStatus={healthStatus}
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-[#f4f6f8] min-w-0">
        {/* Compact Instrument Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-2xs shrink-0 select-none">
          <div className="flex items-center justify-between">
            {/* Left: Mobile Toggle & Brand */}
            <div className="flex items-center space-x-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 rounded lg:hidden text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              <div className="w-6 h-6 bg-teal-800 rounded flex items-center justify-center text-white shadow-xs shrink-0 lg:hidden">
                <Compass className="w-3.5 h-3.5" />
              </div>

              <div className="min-w-0">
                <h1 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                  <span>TERRAVEKTOR</span>
                  <span className="text-slate-300 font-normal">&bull;</span>
                  <span className="text-[11px] text-teal-800 font-mono font-medium truncate">Geospatial Investigation Cockpit</span>
                </h1>
              </div>
            </div>

            {/* Right: Upstream Status & Mode Toggles */}
            <div className="flex items-center space-x-2.5 shrink-0 text-xs">
              {healthStatus && (
                <div className="hidden sm:flex items-center space-x-1.5 text-[11px] font-mono text-slate-600">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    healthStatus.status === 'healthy' && !isUpstreamDown ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  <span>
                    {healthStatus.status === 'healthy' && !isUpstreamDown ? 'CDSE Live' : 'CDSE Degraded'}
                  </span>
                </div>
              )}

              {/* Data Mode Indicator */}
              {isDemoMode || healthStatus?.data_mode === 'demo_data' ? (
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  <span>DEMO MODE</span>
                </div>
              ) : isUpstreamDown ? (
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-900 border border-rose-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  <span>UPSTREAM OFFLINE</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-900 border border-teal-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-700 animate-pulse" />
                  <span>LIVE SENTINEL-2</span>
                </div>
              )}

              {/* Mode Toggle Button */}
              <button
                onClick={toggleDemoMode}
                title={isDemoMode ? 'Switch to Live Copernicus CDSE queries' : 'Toggle Demo Mode for offline simulation'}
                className={`text-[11px] px-2 py-0.5 rounded border font-medium transition-colors ${
                  isDemoMode 
                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {isDemoMode ? 'Exit Demo' : 'Demo Mode'}
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Viewport */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
