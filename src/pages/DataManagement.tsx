import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Search, 
  FileText, 
  History, 
  Calendar, 
  MapPin, 
  Layers, 
  Cloud, 
  Check, 
  Loader2,
  X
} from 'lucide-react';
import { getScenes, ingestScene, getSceneProvenance } from '../services/api';
import { Scene, ProvenanceData } from '../types';

export const DataManagement: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [selectedProvenance, setSelectedProvenance] = useState<ProvenanceData | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Scene Form State
  const [newSceneName, setNewSceneName] = useState('');
  const [newSensor, setNewSensor] = useState('Sentinel-2');
  const [newLat, setNewLat] = useState('18.5204');
  const [newLon, setNewLon] = useState('73.8567');
  const [newCloud, setNewCloud] = useState('5.0');
  const [newSource, setNewSource] = useState('Copernicus CDSE');

  const loadScenes = async () => {
    setIsLoading(true);
    try {
      const data = await getScenes();
      setScenes(data);
    } catch (err) {
      console.error('Failed to load scenes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIngesting(true);
    try {
      await ingestScene({
        scene_name: newSceneName || `Scene_${Date.now()}`,
        sensor: newSensor,
        latitude: parseFloat(newLat),
        longitude: parseFloat(newLon),
        cloud_percentage: parseFloat(newCloud),
        source: newSource,
        acquisition_date: new Date().toISOString()
      });
      setShowIngestModal(false);
      setNewSceneName('');
      loadScenes();
    } catch (err) {
      console.error('Failed to ingest scene:', err);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleViewProvenance = async (sceneId: number) => {
    try {
      const prov = await getSceneProvenance(sceneId);
      setSelectedProvenance(prov);
    } catch (err) {
      console.error('Failed to fetch provenance:', err);
    }
  };

  const filteredScenes = scenes.filter(s => 
    s.scene_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.sensor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
            <Database className="w-3.5 h-3.5" />
            <span>Catalog Ingestion & Provenance Records</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Scene Registry & Provenance</h1>
          <p className="text-sm text-slate-400">
            Audit catalog scenes, review data lineage pipelines, and manually ingest new satellite datasets.
          </p>
        </div>

        <button
          onClick={() => setShowIngestModal(true)}
          className="px-4 py-2.5 bg-satellite-500 hover:bg-satellite-600 text-white text-xs font-semibold rounded-lg shadow-lg shadow-satellite-500/25 transition-all flex items-center space-x-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Ingest New Scene</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center bg-ui-dark border border-ui-border rounded-xl px-4 py-2.5 max-w-md">
        <Search className="w-4 h-4 text-slate-400 mr-2.5" />
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by scene title, sensor platform, or agency..."
          className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Scenes Catalog Table */}
      <div className="bg-ui-dark border border-ui-border rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-ui-border">
              <tr>
                <th className="px-5 py-3.5">Scene Identifier</th>
                <th className="px-5 py-3.5">Sensor</th>
                <th className="px-5 py-3.5">Acquisition Date</th>
                <th className="px-5 py-3.5">Coordinates</th>
                <th className="px-5 py-3.5">Cloud Cover</th>
                <th className="px-5 py-3.5">Source</th>
                <th className="px-5 py-3.5 text-right">Lineage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <span>Loading scene registry...</span>
                  </td>
                </tr>
              ) : filteredScenes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No scenes found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredScenes.map((scene) => (
                  <tr key={scene.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white font-mono">
                      {scene.scene_name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {scene.sensor}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {new Date(scene.acquisition_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">
                      {scene.latitude.toFixed(4)}, {scene.longitude.toFixed(4)}
                    </td>
                    <td className="px-5 py-3.5">
                      {scene.cloud_percentage}%
                    </td>
                    <td className="px-5 py-3.5">
                      {scene.source}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleViewProvenance(scene.id)}
                        className="text-xs text-satellite-400 hover:text-satellite-300 font-medium inline-flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Audit Trail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingest Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ui-dark border border-ui-border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white">Ingest New Satellite Scene</h3>
              <button 
                onClick={() => setShowIngestModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIngest} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Scene Name / Product Tag</label>
                <input 
                  type="text" 
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder="e.g. Pune_Urban_West_2026"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-satellite-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Sensor</label>
                  <select 
                    value={newSensor}
                    onChange={(e) => setNewSensor(e.target.value)}
                    aria-label="Sensor"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-satellite-500"
                  >
                    <option value="Sentinel-2">Sentinel-2 (MSI)</option>
                    <option value="Landsat-8">Landsat-8 (OLI)</option>
                    <option value="Landsat-9">Landsat-9</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Source Agency</label>
                  <input 
                    type="text" 
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="ESA / Copernicus CDSE"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-satellite-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Latitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-satellite-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Longitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={newLon}
                    onChange={(e) => setNewLon(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-satellite-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Cloud %</label>
                  <input 
                    type="number" 
                    value={newCloud}
                    onChange={(e) => setNewCloud(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-satellite-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting}
                  className="px-4 py-2 rounded-lg bg-satellite-500 text-white text-xs font-semibold hover:bg-satellite-600 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isIngesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Register Scene</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provenance Audit Modal */}
      {selectedProvenance && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ui-dark border border-ui-border rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Data Provenance & Audit Log</h3>
                <span className="text-xs text-slate-400 font-mono">{selectedProvenance.scene_name}</span>
              </div>
              <button 
                onClick={() => setSelectedProvenance(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {selectedProvenance.processing_logs?.map((log) => (
                <div key={log.id} className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-satellite-400 uppercase tracking-wider">
                      {log.operation}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono break-all bg-slate-950 p-2 rounded border border-slate-900">
                    Model: {log.model_version} • Parameters: {log.parameters}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
