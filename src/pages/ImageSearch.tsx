import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Loader2, 
  Check, 
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';
import { imageSearch } from '../services/api';
import { SearchResult } from '../types';

interface SamplePatch {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
}

const SAMPLE_PATCHES: SamplePatch[] = [
  {
    id: 'patch-1',
    name: 'Industrial & Earthwork Site',
    category: 'Construction',
    description: 'Ground clearing, heavy machinery tracks, and excavated red soil.',
    color: 'from-amber-600 to-orange-700'
  },
  {
    id: 'patch-2',
    name: 'Dense Deciduous Canopy',
    category: 'Vegetation',
    description: 'Western Ghats forest belt with high NDVI spectral signature.',
    color: 'from-emerald-600 to-teal-800'
  },
  {
    id: 'patch-3',
    name: 'Inland Water Reservoir',
    category: 'Water Body',
    description: 'High NIR absorption water basin with sedimentation perimeter.',
    color: 'from-cyan-600 to-blue-800'
  },
  {
    id: 'patch-4',
    name: 'High-Density Residential Grid',
    category: 'Urban',
    description: 'Impervious concrete surfaces, road networks, and building rooftops.',
    color: 'from-slate-600 to-zinc-800'
  }
];

export const ImageSearch: React.FC = () => {
  const [selectedPatch, setSelectedPatch] = useState<SamplePatch>(SAMPLE_PATCHES[0]);
  const [customFile, setCustomFile] = useState<string | null>(null);
  const [limit, setLimit] = useState(6);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await imageSearch(customFile || selectedPatch.id, limit);
      setResults(response.results || []);
    } catch (err) {
      console.error('Image search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Visual Feature Embedding</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Visual Similarity Search (CBIR)</h1>
        <p className="text-sm text-slate-400">
          Content-Based Image Retrieval using satellite visual representations to find visually identical terrain patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Query Selection */}
        <div className="lg:col-span-5 bg-ui-dark border border-ui-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Select Query Patch or Upload</h2>

          {/* Sample Patches */}
          <div className="space-y-2">
            {SAMPLE_PATCHES.map((patch) => {
              const isSelected = !customFile && selectedPatch.id === patch.id;
              return (
                <div
                  key={patch.id}
                  onClick={() => {
                    setSelectedPatch(patch);
                    setCustomFile(null);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center space-x-3 ${
                    isSelected 
                      ? 'bg-slate-800/80 border-satellite-500 shadow-md shadow-satellite-500/10' 
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${patch.color} flex items-center justify-center flex-shrink-0 shadow`}>
                    <Layers className="w-6 h-6 text-white/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate">{patch.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {patch.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{patch.description}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-satellite-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Upload Custom Tile */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-400 mb-2">Or upload imagery patch (.tif, .png, .jpg)</label>
            <label className="border-2 border-dashed border-slate-700 hover:border-satellite-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-900/40 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs text-slate-300 font-medium">Click to upload custom AOI patch</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Supports Sentinel-2 RGB, GeoTIFF, or PNG</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
            {customFile && (
              <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Custom image loaded</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full py-3 bg-satellite-500 hover:bg-satellite-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-satellite-500/25 transition-all flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Comparing Image Embeddings...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Execute Similarity Retrieval</span>
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Visual Matches</span>
            <span>Sorted by Cosine Similarity</span>
          </div>

          {!hasSearched ? (
            <div className="bg-ui-dark border border-ui-border rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">No active image query</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select a visual query patch from the left and click "Execute Similarity Retrieval" to match satellite scenes.
              </p>
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="bg-ui-dark border border-ui-border rounded-xl p-8 text-center text-slate-400 text-sm">
              No matching scenes found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((result) => (
                <div
                  key={result.scene_id}
                  className="bg-ui-dark border border-ui-border rounded-xl p-4 hover:border-slate-600 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        {Math.round(result.similarity_score * 100)}% Visual Match
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {result.metadata?.sensor || 'Sentinel-2'}
                      </span>
                    </div>

                    <h3 className="text-xs font-medium text-white truncate" title={result.scene_name}>
                      {result.scene_name}
                    </h3>

                    <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(result.acquisition_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Res: {result.metadata?.resolution || '10m'}</span>
                    <span className="text-slate-400 font-medium">Source: {result.metadata?.source || 'ESA'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageSearch;
