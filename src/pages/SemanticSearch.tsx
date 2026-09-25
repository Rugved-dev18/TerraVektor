import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Cloud, 
  Sliders, 
  Layers, 
  ArrowRight,
  Loader2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { semanticSearch } from '../services/api';
import { SearchResult } from '../types';

export const SemanticSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(6);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const sampleQueries = [
    'Urban expansion and infrastructure development in Pune',
    'Coastal mangrove and water boundary in Mumbai',
    'Industrial corridors with high resolution optical imagery',
    'Agricultural green cover and farm boundaries in Nashik'
  ];

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await semanticSearch({
        query: searchQuery,
        limit: Number(limit)
      });
      setResults(response.results || []);
      if (response.results?.length > 0) {
        setSelectedResult(response.results[0]);
      } else {
        setSelectedResult(null);
      }
    } catch (err) {
      console.error('Semantic search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Vector Embedding Retrieval</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Semantic Satellite Search</h1>
        <p className="text-sm text-slate-400">
          Query satellite scenes using conceptual descriptions, land-use features, or terrain characteristics.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-ui-dark border border-ui-border rounded-xl p-5 shadow-lg space-y-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'urban expansion and ground clearing near airport corridor'..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-satellite-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              aria-label="Result Limit"
              className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-3 focus:outline-none focus:border-satellite-500"
            >
              <option value={4}>Top 4</option>
              <option value={6}>Top 6</option>
              <option value={10}>Top 10</option>
            </select>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-6 py-3 bg-satellite-500 hover:bg-satellite-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-satellite-500/25 transition-all flex items-center justify-center space-x-2 min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium mr-1">Suggestions:</span>
          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(sample);
                handleSearch(sample);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-left"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {hasSearched && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Results List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Found <strong className="text-white">{results.length}</strong> matching scenes</span>
              <span>Sorted by Semantic Similarity</span>
            </div>

            {results.length === 0 && !isLoading ? (
              <div className="p-8 text-center bg-ui-dark border border-ui-border rounded-xl">
                <p className="text-sm text-slate-400">No scenes matched your semantic criteria. Try broadening your query terms.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => {
                  const isSelected = selectedResult?.scene_id === result.scene_id;
                  const similarityPct = Math.round(result.similarity_score * 100);

                  return (
                    <div
                      key={result.scene_id}
                      onClick={() => setSelectedResult(result)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-800/70 border-satellite-500 shadow-md shadow-satellite-500/10' 
                          : 'bg-ui-dark border-ui-border hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-white">
                              {result.scene_name}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-satellite-500/10 border border-satellite-500/30 text-satellite-400 font-medium">
                              {similarityPct}% Match
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(result.acquisition_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Cloud className="w-3.5 h-3.5 text-slate-500" />
                              Cloud: {result.metadata?.cloud_percentage || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="w-16 h-12 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                          <Layers className="w-6 h-6 text-slate-600" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scene Inspector Panel */}
          <div className="lg:col-span-5">
            {selectedResult ? (
              <div className="bg-ui-dark border border-ui-border rounded-xl p-5 sticky top-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-semibold text-white">Scene Inspector</h3>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-satellite-500/20 text-satellite-300">
                    ID #{selectedResult.scene_id}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Scene Identifier</label>
                    <div className="text-xs font-mono bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 break-all">
                      {selectedResult.scene_name}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Sensor Platform</span>
                      <span className="text-xs font-semibold text-white mt-0.5 block">
                        {selectedResult.metadata?.sensor || 'Optical'}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Spatial Resolution</span>
                      <span className="text-xs font-semibold text-white mt-0.5 block">
                        {selectedResult.metadata?.resolution || '10m'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Data Source</span>
                      <span className="text-xs font-semibold text-white mt-0.5 block">
                        {selectedResult.metadata?.source || 'Copernicus CDSE'}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Vector Similarity</span>
                      <span className="text-xs font-semibold text-emerald-400 mt-0.5 block">
                        {(selectedResult.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Geographic Coordinates</span>
                    <span className="text-xs font-mono text-slate-300">
                      Latitude: {selectedResult.latitude.toFixed(6)}, Longitude: {selectedResult.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-ui-dark border border-ui-border rounded-xl p-8 text-center text-slate-500">
                Select a scene from the results to view complete metadata inspection.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticSearch;
