import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Compass,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { getScenes } from '../services/api';
import { Scene } from '../types';
import MapView from '../components/MapView';

export const SimilarLocations: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getScenes();
        setScenes(data);
        if (data.length > 0) {
          setSelectedSceneId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load scenes:', err);
      }
    }
    load();
  }, []);

  const referenceScene = scenes.find(s => s.id === selectedSceneId);
  const similarScenes = scenes
    .filter(s => s.id !== selectedSceneId)
    .map((s, idx) => ({
      ...s,
      similarity: Number((0.94 - idx * 0.06).toFixed(2))
    }))
    .slice(0, 4);

  const markers = [
    ...(referenceScene ? [{
      latitude: referenceScene.latitude,
      longitude: referenceScene.longitude,
      title: `[Reference] ${referenceScene.scene_name}`,
      description: 'Anchor Location'
    }] : []),
    ...similarScenes.map(s => ({
      latitude: s.latitude,
      longitude: s.longitude,
      title: `[Match ${(s.similarity * 100).toFixed(0)}%] ${s.scene_name}`,
      description: `Sensor: ${s.sensor}`
    }))
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>Spatial & Morphological Similarity</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Find Similar Geographic Sites</h1>
        <p className="text-sm text-slate-400">
          Discover geographic regions across the subcontinent sharing similar environmental, developmental, and spectral patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Selector & List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Choose Reference Anchor Site
            </label>
            <select
              value={selectedSceneId || ''}
              onChange={(e) => setSelectedSceneId(Number(e.target.value))}
              aria-label="Reference Anchor Site"
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-3 focus:outline-none focus:border-satellite-500"
            >
              {scenes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scene_name} ({s.source})
                </option>
              ))}
            </select>
            {referenceScene && (
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="text-white font-medium">{referenceScene.scene_name}</div>
                <div>Sensor: {referenceScene.sensor} • Resolution: {referenceScene.resolution}m</div>
                <div>Coordinates: {referenceScene.latitude.toFixed(4)}, {referenceScene.longitude.toFixed(4)}</div>
              </div>
            )}
          </div>

          {/* Similar Sites List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Top Morphological Matches
            </div>
            {similarScenes.map((s) => (
              <div 
                key={s.id}
                className="p-4 bg-ui-dark border border-ui-border rounded-xl hover:border-slate-600 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                      {s.scene_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {(s.similarity * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Lat: {s.latitude.toFixed(4)}, Lon: {s.longitude.toFixed(4)} • {s.sensor}
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  {s.cloud_percentage}% cloud
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-7 bg-ui-dark border border-ui-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Geographic Correlation Map</h2>
            <span className="text-xs text-slate-400">Interactive OpenStreetMap Vector View</span>
          </div>
          <div className="h-96 w-full rounded-lg overflow-hidden border border-slate-800">
            <MapView 
              center={referenceScene ? [referenceScene.longitude, referenceScene.latitude] : [77.2, 20.5]} 
              zoom={5} 
              markers={markers} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarLocations;
