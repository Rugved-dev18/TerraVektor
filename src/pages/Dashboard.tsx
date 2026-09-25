import React, { useEffect, useState } from 'react';
import { 
  Satellite, 
  Search, 
  Activity, 
  ClipboardCheck, 
  MapPin, 
  Database, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Calendar,
  Compass
} from 'lucide-react';
import { getScenes, getChangeCandidates, getHealth } from '../services/api';
import { Scene, ChangeCandidate, HealthResponse } from '../types';
import MapView from '../components/MapView';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [scenesData, candidatesData, healthData] = await Promise.all([
          getScenes(),
          getChangeCandidates(),
          getHealth()
        ]);
        setScenes(scenesData);
        setCandidates(candidatesData);
        setHealth(healthData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pendingReviews = candidates.filter(c => c.status === 'pending');
  const confirmedChanges = candidates.filter(c => c.status === 'confirmed');

  const mapMarkers = scenes.map(s => ({
    latitude: s.latitude,
    longitude: s.longitude,
    title: s.scene_name,
    description: `${s.sensor} • Cloud: ${s.cloud_percentage}% • ${s.source}`
  }));

  const getChangeBadgeColor = (type: string) => {
    switch (type) {
      case 'construction': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'urban_expansion': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'vegetation': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'water': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-satellite-950 via-ui-dark to-slate-900 border border-satellite-500/20 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-satellite-500/10 border border-satellite-500/30 text-satellite-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SIH 2026 • AI Satellite Change Detection Suite</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Satellite Scene Retrieval & Change Intelligence
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Real-time multi-temporal EO analysis powered by ESA Copernicus Sentinel-2 live catalog discovery, semantic vector retrieval, and automated change verification.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button 
                onClick={() => onNavigate('sentinel2-search')}
                className="px-4 py-2.5 bg-satellite-500 hover:bg-satellite-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-satellite-500/25 transition-all flex items-center space-x-2"
              >
                <Compass className="w-4 h-4" />
                <span>Live Sentinel-2 Discovery</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Catalog Scenes</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{loading ? '...' : scenes.length}</div>
            <p className="text-xs text-slate-400 mt-1">Multi-sensor optical scenes</p>
          </div>
        </div>

        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Change Candidates</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{loading ? '...' : candidates.length}</div>
            <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{confirmedChanges.length} confirmed detections</span>
            </p>
          </div>
        </div>

        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Review</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{loading ? '...' : pendingReviews.length}</div>
            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Action required by analyst</span>
            </p>
          </div>
        </div>

        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">CDSE Connector</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Satellite className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">Connected</div>
            <p className="text-xs text-slate-400 mt-1">Copernicus OData API Ready</p>
          </div>
        </div>
      </div>

      {/* Grid: Map & Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Geographic Coverage Map */}
        <div className="lg:col-span-7 bg-ui-dark border border-ui-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Monitored Indian Regions</h2>
              <p className="text-xs text-slate-400">Spatial coverage of ingested satellite scenes and analysis points</p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-satellite-500 inline-block"></span>
              <span>10 AOI Targets</span>
            </div>
          </div>
          <div className="h-80 w-full rounded-lg overflow-hidden border border-slate-800">
            <MapView center={[77.2090, 20.5937]} zoom={4} markers={mapMarkers} />
          </div>
        </div>

        {/* Change Candidates Feed */}
        <div className="lg:col-span-5 bg-ui-dark border border-ui-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Latest Change Detections</h2>
              <p className="text-xs text-slate-400">Bi-temporal feature alerts</p>
            </div>
            {onNavigate && (
              <button 
                onClick={() => onNavigate('review-queue')}
                className="text-xs text-satellite-400 hover:text-satellite-300 font-medium flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-80 pr-1">
            {candidates.slice(0, 5).map((candidate) => (
              <div 
                key={candidate.id} 
                className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getChangeBadgeColor(candidate.change_type)}`}>
                      {candidate.change_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {(candidate.confidence * 100).toFixed(0)}% conf.
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {candidate.latitude.toFixed(2)}, {candidate.longitude.toFixed(2)}
                    </span>
                    <span>•</span>
                    <span className="capitalize text-slate-400">{candidate.status}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">
                    {new Date(candidate.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capabilities Quick Launch */}
      <div className="bg-ui-dark border border-ui-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-3">Core Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => onNavigate?.('sentinel2-search')}
            className="p-4 bg-slate-900/40 border border-slate-800 hover:border-satellite-500/50 rounded-xl cursor-pointer transition-all hover:bg-slate-800/40 group"
          >
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg w-fit group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mt-3 group-hover:text-satellite-400 transition-colors">
              Sentinel-2 Discovery
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Search real-time ESA Copernicus satellite data with AOI bounding boxes and instant cloud filters.
            </p>
          </div>

          <div 
            onClick={() => onNavigate?.('semantic-search')}
            className="p-4 bg-slate-900/40 border border-slate-800 hover:border-satellite-500/50 rounded-xl cursor-pointer transition-all hover:bg-slate-800/40 group"
          >
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg w-fit group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mt-3 group-hover:text-satellite-400 transition-colors">
              Semantic Search
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Natural language queries like "urban construction near river" to locate relevant satellite tiles.
            </p>
          </div>

          <div 
            onClick={() => onNavigate?.('change-analysis')}
            className="p-4 bg-slate-900/40 border border-slate-800 hover:border-satellite-500/50 rounded-xl cursor-pointer transition-all hover:bg-slate-800/40 group"
          >
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg w-fit group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mt-3 group-hover:text-satellite-400 transition-colors">
              Change Analysis
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Bi-temporal pair comparison to isolate pixel shifts, ground changes, and infrastructure growth.
            </p>
          </div>

          <div 
            onClick={() => onNavigate?.('review-queue')}
            className="p-4 bg-slate-900/40 border border-slate-800 hover:border-satellite-500/50 rounded-xl cursor-pointer transition-all hover:bg-slate-800/40 group"
          >
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg w-fit group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mt-3 group-hover:text-satellite-400 transition-colors">
              Analyst Review Queue
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Review flagged changes, log ground truth annotations, and confirm or reject detection candidates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
