import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import { getScenes, getChangeCandidates } from '../services/api';
import { Scene, ChangeCandidate } from '../types';
import { format } from 'date-fns';
import { Activity, Database, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [changeCandidates, setChangeCandidates] = useState<ChangeCandidate[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [scenesData, changesData] = await Promise.all([
        getScenes(0, 10),
        getChangeCandidates('pending')
      ]);
      setScenes(scenesData);
      setChangeCandidates(changesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const mapMarkers = scenes.map(scene => ({
    latitude: scene.latitude,
    longitude: scene.longitude,
    title: scene.scene_name,
    description: `${scene.sensor} - ${format(new Date(scene.acquisition_date), 'MMM dd, yyyy')}`
  }));

  const stats = [
    { label: 'Total Scenes', value: scenes.length, icon: Database, color: 'text-blue-400' },
    { label: 'Pending Reviews', value: changeCandidates.length, icon: Clock, color: 'text-yellow-400' },
    { label: 'Confirmed Changes', value: changeCandidates.filter(c => c.status === 'confirmed').length, icon: CheckCircle, color: 'text-green-400' },
    { label: 'High Confidence', value: changeCandidates.filter(c => c.confidence > 0.8).length, icon: AlertTriangle, color: 'text-orange-400' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-satellite-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-effect rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Section */}
        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="p-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Activity className="w-5 h-5 mr-2 text-satellite-400" />
              Scene Coverage Map
            </h3>
            <p className="text-sm text-slate-400 mt-1">Geographic distribution of satellite scenes</p>
          </div>
          <div className="h-80">
            <MapView markers={mapMarkers} center={[77.2090, 28.6139]} zoom={5} />
          </div>
        </div>

        {/* Recent Change Candidates */}
        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="p-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-satellite-400" />
              Recent Change Candidates
            </h3>
            <p className="text-sm text-slate-400 mt-1">Latest detected changes requiring review</p>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {changeCandidates.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No pending change candidates</p>
              </div>
            ) : (
              changeCandidates.slice(0, 5).map((candidate) => (
                <div key={candidate.id} className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white capitalize">
                      {candidate.change_type.replace('_', ' ')}
                    </span>
                    <span className={`status-badge ${candidate.status}`}>
                      {candidate.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}</span>
                    <span>Confidence: {(candidate.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Scenes */}
      <div className="glass-effect rounded-xl overflow-hidden">
        <div className="p-4 border-b border-ui-border">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Database className="w-5 h-5 mr-2 text-satellite-400" />
            Recent Satellite Scenes
          </h3>
          <p className="text-sm text-slate-400 mt-1">Latest ingested satellite imagery</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.slice(0, 6).map((scene) => (
              <div 
                key={scene.id} 
                className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => setSelectedScene(scene)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white mb-1">{scene.scene_name}</h4>
                    <p className="text-xs text-slate-400">{scene.sensor}</p>
                  </div>
                  <span className={`status-badge ${scene.processing_status}`}>
                    {scene.processing_status}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="text-slate-300">{format(new Date(scene.acquisition_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="text-slate-300">{scene.latitude.toFixed(2)}, {scene.longitude.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cloud Cover:</span>
                    <span className="text-slate-300">{scene.cloud_percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Data Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Demo Data Notice</h4>
            <p className="text-xs text-yellow-400/80">
              This application is currently using mock/demo data for demonstration purposes. 
              The satellite imagery, change detections, and geographic locations are simulated 
              and do not represent real satellite data. This is a functional MVP for the SIH 2026 competition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
