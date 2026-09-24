import React, { useState, useEffect } from 'react';
import { Database, Search, Filter, Calendar, MapPin, Eye } from 'lucide-react';
import { getScenes } from '../services/api';
import { Scene } from '../types';
import { format } from 'date-fns';

const DataManagement: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [filteredScenes, setFilteredScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sensorFilter, setSensorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  useEffect(() => {
    loadScenes();
  }, []);

  useEffect(() => {
    filterScenes();
  }, [scenes, searchTerm, sensorFilter, statusFilter]);

  const loadScenes = async () => {
    setIsLoading(true);
    try {
      const data = await getScenes(0, 100);
      setScenes(data);
    } catch (error) {
      console.error('Error loading scenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterScenes = () => {
    let filtered = [...scenes];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(scene =>
        scene.scene_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scene.sensor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sensor filter
    if (sensorFilter !== 'all') {
      filtered = filtered.filter(scene => scene.sensor === sensorFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(scene => scene.processing_status === statusFilter);
    }

    setFilteredScenes(filtered);
  };

  const sensors = Array.from(new Set(scenes.map(s => s.sensor)));
  const statuses = Array.from(new Set(scenes.map(s => s.processing_status)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-satellite-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading scene data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="glass-effect rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Data Management</h2>
        <p className="text-slate-400 mb-6">
          Browse and manage the complete satellite imagery database.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{scenes.length}</div>
            <div className="text-sm text-slate-400">Total Scenes</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{sensors.length}</div>
            <div className="text-sm text-slate-400">Sensors</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{filteredScenes.length}</div>
            <div className="text-sm text-slate-400">Filtered Results</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {scenes.filter(s => s.processing_status === 'completed').length}
            </div>
            <div className="text-sm text-slate-400">Processed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scenes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-ui-border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-satellite-500"
            />
          </div>
          <select
            value={sensorFilter}
            onChange={(e) => setSensorFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-ui-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
          >
            <option value="all">All Sensors</option>
            {sensors.map(sensor => (
              <option key={sensor} value={sensor}>{sensor}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-ui-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
          >
            <option value="all">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setSensorFilter('all');
              setStatusFilter('all');
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Scene Grid */}
      <div className="glass-effect rounded-xl overflow-hidden">
        <div className="p-4 border-b border-ui-border">
          <h3 className="text-lg font-semibold text-white">
            Satellite Scenes ({filteredScenes.length})
          </h3>
        </div>
        
        {filteredScenes.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No scenes match your filters</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenes.map((scene) => (
              <div 
                key={scene.id} 
                className="bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => setSelectedScene(scene)}
              >
                <div className="aspect-video bg-slate-700 flex items-center justify-center">
                  <Database className="w-8 h-8 text-slate-500" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-white truncate flex-1">{scene.scene_name}</h4>
                    <span className={`status-badge ${scene.processing_status} ml-2`}>
                      {scene.processing_status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(scene.acquisition_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {scene.latitude.toFixed(2)}, {scene.longitude.toFixed(2)}
                    </div>
                    <div className="flex justify-between">
                      <span>{scene.sensor}</span>
                      <span>{scene.resolution}m</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scene Detail Modal */}
      {selectedScene && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedScene(null)}>
          <div className="glass-effect rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-ui-border flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">{selectedScene.scene_name}</h3>
              <button 
                onClick={() => setSelectedScene(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center">
                <Database className="w-12 h-12 text-slate-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Sensor</p>
                  <p className="text-sm text-white">{selectedScene.sensor}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Resolution</p>
                  <p className="text-sm text-white">{selectedScene.resolution}m</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Acquisition Date</p>
                  <p className="text-sm text-white">{format(new Date(selectedScene.acquisition_date), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Cloud Cover</p>
                  <p className="text-sm text-white">{selectedScene.cloud_percentage.toFixed(1)}%</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Location</p>
                  <p className="text-sm text-white">{selectedScene.latitude.toFixed(4)}, {selectedScene.longitude.toFixed(4)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Source</p>
                  <p className="text-sm text-white">{selectedScene.source}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-slate-400 mb-1">Bounding Box</p>
                  <p className="text-sm text-white font-mono">{selectedScene.bbox}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-slate-400 mb-1">CRS</p>
                  <p className="text-sm text-white font-mono">{selectedScene.crs}</p>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">File Path</p>
                <p className="text-sm text-white font-mono text-xs">{selectedScene.file_path}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
