import React, { useState } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import MapView from '../components/MapView';
import { getScenes } from '../services/api';
import { Scene } from '../types';
import { format } from 'date-fns';

const SimilarLocations: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([77.2090, 28.6139]);

  const loadScenes = async () => {
    setIsLoading(true);
    try {
      const scenesData = await getScenes(0, 50);
      setScenes(scenesData);
    } catch (error) {
      console.error('Error loading scenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadScenes();
  }, []);

  const handleSceneSelect = (scene: Scene) => {
    setSelectedScene(scene);
    setMapCenter([scene.longitude, scene.latitude]);
  };

  const findSimilarLocations = () => {
    // Mock implementation - would use actual location similarity in production
    if (selectedScene) {
      const similar = scenes
        .filter(s => s.id !== selectedScene.id)
        .filter(s => {
          const distance = Math.sqrt(
            Math.pow(s.latitude - selectedScene.latitude, 2) +
            Math.pow(s.longitude - selectedScene.longitude, 2)
          );
          return distance < 2; // Within 2 degrees
        })
        .slice(0, 5);
      
      return similar;
    }
    return [];
  };

  const similarLocations = selectedScene ? findSimilarLocations() : [];

  return (
    <div className="p-6 space-y-6">
      <div className="glass-effect rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Similar Locations</h2>
        <p className="text-slate-400 mb-6">
          Discover locations with similar geographic characteristics and development patterns.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Reference Scene</label>
          <select
            value={selectedScene?.id || ''}
            onChange={(e) => {
              const scene = scenes.find(s => s.id === Number(e.target.value));
              if (scene) handleSceneSelect(scene);
            }}
            className="w-full px-4 py-2.5 bg-slate-800 border border-ui-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
            disabled={isLoading}
          >
            <option value="">Select a scene to find similar locations</option>
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.scene_name} - {format(new Date(scene.acquisition_date), 'MMM dd, yyyy')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map View */}
        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="p-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-satellite-400" />
              Geographic View
            </h3>
          </div>
          <div className="h-96">
            <MapView 
              center={mapCenter} 
              zoom={6}
              markers={scenes.map(scene => ({
                latitude: scene.latitude,
                longitude: scene.longitude,
                title: scene.scene_name,
                description: `${scene.sensor} - ${format(new Date(scene.acquisition_date), 'MMM dd, yyyy')}`
              }))}
            />
          </div>
        </div>

        {/* Similar Locations */}
        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="p-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Search className="w-5 h-5 mr-2 text-satellite-400" />
              Similar Locations
            </h3>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-satellite-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-400">Loading scenes...</p>
            </div>
          ) : !selectedScene ? (
            <div className="p-8 text-center">
              <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">Select a reference scene to find similar locations</p>
            </div>
          ) : similarLocations.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No similar locations found nearby</p>
            </div>
          ) : (
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {similarLocations.map((location) => {
                const distance = Math.sqrt(
                  Math.pow(location.latitude - selectedScene.latitude, 2) +
                  Math.pow(location.longitude - selectedScene.longitude, 2)
                );
                
                return (
                  <div key={location.id} className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleSceneSelect(location)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white mb-1">{location.scene_name}</h4>
                        <p className="text-xs text-slate-400">{location.sensor}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-satellite-400">
                          {(distance * 111).toFixed(0)} km
                        </div>
                        <div className="text-xs text-slate-400">away</div>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span className="text-slate-300">{location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="text-slate-300">{format(new Date(location.acquisition_date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Scene Details */}
      {selectedScene && (
        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="p-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-white">Selected Scene Details</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">{selectedScene.scene_name}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sensor:</span>
                    <span className="text-slate-300">{selectedScene.sensor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolution:</span>
                    <span className="text-slate-300">{selectedScene.resolution}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cloud Cover:</span>
                    <span className="text-slate-300">{selectedScene.cloud_percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start">
          <MapPin className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Mock Location Similarity</h4>
            <p className="text-xs text-yellow-400/80">
              The similar locations feature is currently using geographic proximity as a similarity metric. 
              In the full implementation, this would use actual geographic and environmental feature similarity analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarLocations;
