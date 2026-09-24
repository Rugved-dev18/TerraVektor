import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { semanticSearch } from '../services/api';
import { SearchResult } from '../types';
import { format } from 'date-fns';

const SemanticSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const response = await semanticSearch({
        query: query,
        limit: 10
      });
      setResults(response.results);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const exampleQueries = [
    "urban development in Mumbai",
    "agricultural land in Punjab",
    "coastal changes in Chennai",
    "industrial zones in Gujarat",
    "deforestation in Western Ghats"
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="glass-effect rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Semantic Search</h2>
        <p className="text-slate-400 mb-6">
          Search satellite imagery using natural language queries to find scenes based on content and context.
        </p>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your search query (e.g., 'urban development in Mumbai')"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-ui-border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-satellite-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-6 py-2.5 bg-satellite-500 hover:bg-satellite-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {!hasSearched && (
          <div className="mt-6">
            <p className="text-sm text-slate-400 mb-3">Example queries:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasSearched && (
        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="p-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-white">
              Search Results ({results.length})
            </h3>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-satellite-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-400">Searching satellite imagery...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No results found for your query</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {results.map((result, index) => (
                <div key={result.scene_id} className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-satellite-400">#{index + 1}</span>
                        <h4 className="text-sm font-medium text-white">{result.scene_name}</h4>
                      </div>
                      <p className="text-xs text-slate-400">Similarity: {(result.similarity_score * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-satellite-400">
                        {(result.similarity_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400">match</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Acquisition Date:</span>
                      <span className="text-slate-300 ml-2">
                        {format(new Date(result.acquisition_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Location:</span>
                      <span className="text-slate-300 ml-2">
                        {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {result.metadata && Object.keys(result.metadata).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">Additional Metadata:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(result.metadata).slice(0, 3).map(([key, value]) => (
                          <span key={key} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start">
          <Search className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Mock Search Service</h4>
            <p className="text-xs text-yellow-400/80">
              The semantic search is currently using a mock embedding service. In the full implementation, 
              this would use actual AI embeddings and vector similarity search to find relevant satellite imagery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemanticSearch;
