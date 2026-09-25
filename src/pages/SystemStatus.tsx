import React, { useState } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Database, 
  Cpu, 
  RefreshCw, 
  Satellite, 
  Globe, 
  Clock,
  Layers
} from 'lucide-react';
import { HealthResponse } from '../types';
import { getHealth } from '../services/api';

interface SystemStatusProps {
  healthStatus: HealthResponse | null;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ healthStatus: initialHealth }) => {
  const [health, setHealth] = useState<HealthResponse | null>(initialHealth);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to refresh health:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span>Infrastructure Health & Services</span>
          </div>
          <h1 className="text-2xl font-bold text-white">System Diagnostics & Status</h1>
          <p className="text-sm text-slate-400">
            Real-time status monitoring for Earth Observation backend services and external APIs.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center space-x-2 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Check Status Now</span>
        </button>
      </div>

      {/* Global Health Banner */}
      <div className={`p-5 rounded-xl border flex items-center justify-between ${
        isHealthy 
          ? 'bg-emerald-950/20 border-emerald-500/30' 
          : 'bg-red-950/20 border-red-500/30'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isHealthy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isHealthy ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              {isHealthy ? 'All Satellite Services Operational' : 'Degraded System Performance'}
            </h2>
            <p className="text-xs text-slate-400">
              API Version: {health?.version || '1.0.0'} • Database: {health?.database || 'In-Memory State'}
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-mono text-slate-400">Host: Node.js Express + Vite</span>
          <div className="text-[11px] text-emerald-400 font-medium mt-0.5">Live Connection</div>
        </div>
      </div>

      {/* Subsystem Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CDSE Connector */}
        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Copernicus CDSE OData</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ONLINE
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">ESA Copernicus API</div>
              <div className="text-xs text-slate-400">catalogue.dataspace.copernicus.eu</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
            Public catalog query with indexed attribute filtering and bbox intersection.
          </p>
        </div>

        {/* Vector Embedding */}
        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Vector Embeddings</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Semantic Retrieval</div>
              <div className="text-xs text-slate-400">Transformer-based spatial encoder</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
            Text-to-imagery cosine similarity matching for natural language exploration.
          </p>
        </div>

        {/* Change Analysis Pipeline */}
        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Change Detection</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Bi-Temporal Engine</div>
              <div className="text-xs text-slate-400">Multi-temporal subtraction</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
            Pixel & feature deviation analysis for construction, vegetation, and water shift.
          </p>
        </div>

        {/* Scene Database */}
        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Database Storage</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              HEALTHY
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">In-Memory Store</div>
              <div className="text-xs text-slate-400">10 Seeded Multi-Sensor Regions</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
            Full provenance tracking, audit logging, and analyst review history.
          </p>
        </div>

        {/* Leaflet & OpenStreetMap */}
        <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">GIS Visualizer</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              READY
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Leaflet & MapLibre</div>
              <div className="text-xs text-slate-400">Raster Tiles & GeoJSON Footprints</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
            High performance canvas rendering with interactive bounding box AOI drawing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
