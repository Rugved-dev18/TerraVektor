import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ArrowRight, 
  Calendar, 
  Layers, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Sliders,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { getScenes, analyzeChanges } from '../services/api';
import { Scene, ChangeCandidate } from '../types';

export const ChangeAnalysis: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [beforeSceneId, setBeforeSceneId] = useState<number | null>(null);
  const [afterSceneId, setAfterSceneId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedCandidates, setDetectedCandidates] = useState<ChangeCandidate[]>([]);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'candidates'>('visualizer');
  const [sliderPosition, setSliderPosition] = useState(50);

  useEffect(() => {
    async function load() {
      try {
        const data = await getScenes();
        setScenes(data);
        if (data.length >= 2) {
          setBeforeSceneId(data[0].id);
          setAfterSceneId(data[1].id);
        }
      } catch (err) {
        console.error('Failed to load scenes:', err);
      }
    }
    load();
  }, []);

  const handleRunAnalysis = async () => {
    if (!beforeSceneId || !afterSceneId) return;
    setIsAnalyzing(true);
    try {
      const response = await analyzeChanges(beforeSceneId, afterSceneId);
      if (response.change_candidates) {
        setDetectedCandidates(response.change_candidates);
        setActiveTab('candidates');
      }
    } catch (err) {
      console.error('Change analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const beforeScene = scenes.find(s => s.id === beforeSceneId);
  const afterScene = scenes.find(s => s.id === afterSceneId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
          <Activity className="w-3.5 h-3.5" />
          <span>Bi-Temporal Feature Analysis</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Multi-Temporal Change Detection</h1>
        <p className="text-sm text-slate-400">
          Compare satellite acquisitions over the same geographic footprint to identify surface alterations, deforestation, or urban growth.
        </p>
      </div>

      {/* Temporal Pair Selection */}
      <div className="bg-ui-dark border border-ui-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* T1 Baseline */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              T1 Baseline (Before Scene)
            </span>
            <select
              value={beforeSceneId || ''}
              onChange={(e) => setBeforeSceneId(Number(e.target.value))}
              aria-label="T1 Baseline Scene"
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-satellite-500"
            >
              {scenes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scene_name} ({new Date(s.acquisition_date).toLocaleDateString()} - {s.sensor})
                </option>
              ))}
            </select>
            {beforeScene && (
              <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                <span>Cloud: {beforeScene.cloud_percentage}%</span>
                <span>Coord: {beforeScene.latitude.toFixed(2)}, {beforeScene.longitude.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* T2 Target */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              T2 Follow-Up (After Scene)
            </span>
            <select
              value={afterSceneId || ''}
              onChange={(e) => setAfterSceneId(Number(e.target.value))}
              aria-label="T2 Follow-Up Scene"
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-satellite-500"
            >
              {scenes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scene_name} ({new Date(s.acquisition_date).toLocaleDateString()} - {s.sensor})
                </option>
              ))}
            </select>
            {afterScene && (
              <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                <span>Cloud: {afterScene.cloud_percentage}%</span>
                <span>Coord: {afterScene.latitude.toFixed(2)}, {afterScene.longitude.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-satellite-400" />
            <span>Deep feature embedding subtraction with semantic classification</span>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !beforeSceneId || !afterSceneId || beforeSceneId === afterSceneId}
            className="px-6 py-2.5 bg-satellite-500 hover:bg-satellite-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-satellite-500/25 transition-all flex items-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Computing Differences...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>Compute Change Map</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Analysis Display */}
      <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-4">
        {/* Sub Navigation */}
        <div className="flex items-center space-x-4 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`text-xs font-semibold pb-1 transition-all ${
              activeTab === 'visualizer' 
                ? 'text-satellite-400 border-b-2 border-satellite-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Interactive Swipe Visualizer
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`text-xs font-semibold pb-1 transition-all flex items-center gap-1.5 ${
              activeTab === 'candidates' 
                ? 'text-satellite-400 border-b-2 border-satellite-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Change Candidates</span>
            {detectedCandidates.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-satellite-500 text-white text-[10px] flex items-center justify-center">
                {detectedCandidates.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Swipe Visualizer */}
        {activeTab === 'visualizer' && (
          <div className="space-y-4">
            <div className="relative h-96 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 select-none">
              {/* Layer T1 Baseline */}
              <div 
                className="absolute inset-0 bg-cover bg-center flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #09203f 0%, #537895 100%)'
                }}
              >
                <div className="text-center p-6 bg-slate-900/80 rounded-xl border border-slate-700 max-w-sm">
                  <div className="text-xs font-semibold text-slate-300">T1 Baseline Scene</div>
                  <div className="text-sm font-bold text-white mt-1">{beforeScene?.scene_name || 'Select Scene'}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    Acquired: {beforeScene ? new Date(beforeScene.acquisition_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Layer T2 Target with clip */}
              <div 
                className="absolute inset-0 bg-cover bg-center flex items-center justify-center"
                style={{
                  clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
                  background: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)'
                }}
              >
                <div className="text-center p-6 bg-slate-900/80 rounded-xl border border-slate-700 max-w-sm ml-auto mr-12">
                  <div className="text-xs font-semibold text-emerald-400">T2 Target Scene</div>
                  <div className="text-sm font-bold text-white mt-1">{afterScene?.scene_name || 'Select Scene'}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    Acquired: {afterScene ? new Date(afterScene.acquisition_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Swipe Handle */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-2xl"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-7 h-7 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-lg text-xs font-bold">
                  ↔
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 px-2">
              <span className="text-xs text-slate-400">T1 (Before)</span>
              <input 
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                aria-label="Swipe Split Slider"
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-satellite-500"
              />
              <span className="text-xs text-slate-400">T2 (After)</span>
            </div>
          </div>
        )}

        {/* Tab 2: Candidates */}
        {activeTab === 'candidates' && (
          <div className="space-y-3">
            {detectedCandidates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No change candidates detected yet. Run the change analysis above to identify surface differences.
              </div>
            ) : (
              detectedCandidates.map((c) => (
                <div 
                  key={c.id}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white capitalize">
                        {c.change_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-satellite-500/10 text-satellite-400 border border-satellite-500/30">
                        {(c.confidence * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Latitude: {c.latitude.toFixed(4)}, Longitude: {c.longitude.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-amber-400 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                      Pending Analyst Review
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeAnalysis;
