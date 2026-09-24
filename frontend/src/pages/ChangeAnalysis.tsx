import React, { useState, useEffect } from 'react';
import { Activity, Loader2, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { getScenes, getChangeCandidates, analyzeChanges } from '../services/api';
import { Scene, ChangeCandidate } from '../types';
import { format } from 'date-fns';

const ChangeAnalysis: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [changeCandidates, setChangeCandidates] = useState<ChangeCandidate[]>([]);
  const [selectedBeforeScene, setSelectedBeforeScene] = useState<number | null>(null);
  const [selectedAfterScene, setSelectedAfterScene] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [scenesData, changesData] = await Promise.all([
        getScenes(0, 20),
        getChangeCandidates()
      ]);
      setScenes(scenesData);
      setChangeCandidates(changesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedBeforeScene || !selectedAfterScene) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeChanges(selectedBeforeScene, selectedAfterScene);
      // Reload change candidates after analysis
      const updatedChanges = await getChangeCandidates();
      setChangeCandidates(updatedChanges);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getChangeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      construction: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      vegetation: 'bg-green-500/20 text-green-400 border-green-500/30',
      water: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      urban_expansion: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      deforestation: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-satellite-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading change analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="glass-effect rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Change Analysis</h2>
        <p className="text-slate-400 mb-6">
          Analyze changes between satellite scenes to detect construction, vegetation changes, urban expansion, and more.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Before Scene</label>
            <select
              value={selectedBeforeScene || ''}
              onChange={(e) => setSelectedBeforeScene(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-slate-800 border border-ui-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
            >
              <option value="">Select a scene</option>
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.scene_name} - {format(new Date(scene.acquisition_date), 'MMM dd, yyyy')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">After Scene</label>
            <select
              value={selectedAfterScene || ''}
              onChange={(e) => setSelectedAfterScene(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-slate-800 border border-ui-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
            >
              <option value="">Select a scene</option>
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.scene_name} - {format(new Date(scene.acquisition_date), 'MMM dd, yyyy')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!selectedBeforeScene || !selectedAfterScene || isAnalyzing}
          className="w-full px-6 py-3 bg-satellite-500 hover:bg-satellite-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Changes...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 mr-2" />
              Analyze Changes
            </>
          )}
        </button>
      </div>

      {/* Change Candidates */}
      <div className="glass-effect rounded-xl overflow-hidden">
        <div className="p-4 border-b border-ui-border">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-satellite-400" />
            Change Candidates ({changeCandidates.length})
          </h3>
        </div>
        
        {changeCandidates.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No change candidates found</p>
            <p className="text-sm text-slate-500 mt-1">Select two scenes and analyze to detect changes</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {changeCandidates.map((candidate) => (
              <div key={candidate.id} className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getChangeTypeColor(candidate.change_type)}`}>
                        {candidate.change_type.replace('_', ' ')}
                      </span>
                      <span className={`status-badge ${candidate.status}`}>
                        {candidate.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(candidate.earliest_detection_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-satellite-400">
                      {(candidate.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-400">confidence</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-700">
                  <div>
                    <span className="text-slate-400">Before Scene ID:</span>
                    <span className="text-slate-300 ml-2">#{candidate.before_scene_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">After Scene ID:</span>
                    <span className="text-slate-300 ml-2">#{candidate.after_scene_id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start">
          <Activity className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Mock Change Detection</h4>
            <p className="text-xs text-yellow-400/80">
              The change detection is currently using a mock service. In the full implementation, 
              this would use actual AI models to detect and classify changes between satellite imagery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeAnalysis;
