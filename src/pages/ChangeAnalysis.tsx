import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ArrowRight, 
  Calendar, 
  Cloud, 
  MapPin, 
  Loader2, 
  AlertTriangle,
  Sliders,
  Maximize2,
  Eye,
  Database,
  Info,
  ExternalLink,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { searchSentinel2, analyzeSentinel2Change, getSentinel2PreviewUrl, getChangeMaskUrl } from '../services/api';
import { Sentinel2Product, Sentinel2SearchResponse, ChangeAnalysisResult } from '../types';
import { format, subDays } from 'date-fns';

export const ChangeAnalysis: React.FC = () => {
  const [availableProducts, setAvailableProducts] = useState<Sentinel2Product[]>([]);
  const [beforeProductId, setBeforeProductId] = useState<string | null>(null);
  const [afterProductId, setAfterProductId] = useState<string | null>(null);
  const [aoiBbox, setAoiBbox] = useState<[number, number, number, number] | null>([73.70, 18.40, 74.05, 18.70]); // Default Pune AOI
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>('2024-12-31');
  const [maxCloudCover, setMaxCloudCover] = useState<number>(30);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ChangeAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<'before' | 'after' | 'change'>('before');
  const [changeMaskOpacity, setChangeMaskOpacity] = useState(0.7);

  // Load available Sentinel-2 products on mount
  useEffect(() => {
    handleSearchSentinel2();
  }, []);

  const handleSearchSentinel2 = async () => {
    if (!aoiBbox) return;
    
    setIsSearching(true);
    setErrorMessage(null);
    
    try {
      const response: Sentinel2SearchResponse = await searchSentinel2({
        bbox: aoiBbox,
        start_date: startDate,
        end_date: endDate,
        max_cloud_cover: maxCloudCover,
        product_type: 'S2MSI2A',
        limit: 50,
        force_refresh: false
      });
      
      setAvailableProducts(response.results);
      
      // Auto-select two products with different dates if available
      if (response.results.length >= 2) {
        const sortedByDate = [...response.results].sort((a, b) => 
          new Date(a.acquisition_date).getTime() - new Date(b.acquisition_date).getTime()
        );
        setBeforeProductId(sortedByDate[0].id);
        setAfterProductId(sortedByDate[sortedByDate.length - 1].id);
      }
    } catch (err: any) {
      console.error('Sentinel-2 search failed:', err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Failed to search Sentinel-2 imagery');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!beforeProductId || !afterProductId) return;
    
    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisResult(null);
    
    try {
      const result: ChangeAnalysisResult = await analyzeSentinel2Change(
        beforeProductId,
        afterProductId,
        aoiBbox || undefined,
        'ndvi_differencing'
      );
      
      setAnalysisResult(result);
      setActiveView('change');
    } catch (err: any) {
      console.error('Change analysis failed:', err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Change analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const beforeProduct = availableProducts.find(p => p.id === beforeProductId);
  const afterProduct = availableProducts.find(p => p.id === afterProductId);

  const getDataModeBadge = (mode: string) => {
    if (mode === 'live_copernicus' || mode === 'real_sentinel2') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      );
    } else if (mode === 'cached') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          Cached
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Demo
        </span>
      );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
          <Activity className="w-3.5 h-3.5" />
          <span>Multi-Temporal Change Detection</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Sentinel-2 Change Analysis</h1>
        <p className="text-sm text-slate-400">
          Compare real Sentinel-2 satellite imagery over time using NDVI differencing to detect vegetation changes, urban expansion, and land cover alterations.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start space-x-2 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* Scene Selection Panel */}
      <div className="glass-effect rounded-xl p-5 border border-ui-border space-y-4">
        <div className="flex items-center justify-between border-b border-ui-border pb-3">
          <h2 className="text-base font-semibold text-white flex items-center">
            <Database className="w-4 h-4 mr-2 text-satellite-400" />
            Scene Selection
          </h2>
          <button
            onClick={handleSearchSentinel2}
            disabled={isSearching || !aoiBbox}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs rounded-lg border border-ui-border transition-colors flex items-center space-x-1"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span>Refresh Scenes</span>
              </>
            )}
          </button>
        </div>

        {/* Search Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-800 border border-ui-border rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-800 border border-ui-border rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Max Cloud Cover: {maxCloudCover}%</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={maxCloudCover}
              onChange={(e) => setMaxCloudCover(Number(e.target.value))}
              className="w-full accent-satellite-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Scene Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Before Scene */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Before Scene (Baseline)
              </span>
              {beforeProduct && getDataModeBadge(beforeProduct.data_mode)}
            </div>
            
            <select
              value={beforeProductId || ''}
              onChange={(e) => setBeforeProductId(e.target.value || null)}
              disabled={availableProducts.length === 0}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-satellite-500 disabled:opacity-50"
            >
              <option value="">Select a scene...</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {format(new Date(p.acquisition_date), 'MMM dd, yyyy')} - {p.name.slice(0, 30)}... ({p.cloud_cover}% cloud)
                </option>
              ))}
            </select>
            
            {beforeProduct && (
              <div className="text-[11px] text-slate-400 pt-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> Date:</span>
                  <span className="font-mono">{format(new Date(beforeProduct.acquisition_date), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Cloud className="w-3 h-3 mr-1" /> Cloud:</span>
                  <span>{beforeProduct.cloud_cover}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> Tile:</span>
                  <span className="font-mono">{beforeProduct.tile_id || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>

          {/* After Scene */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                After Scene (Comparison)
              </span>
              {afterProduct && getDataModeBadge(afterProduct.data_mode)}
            </div>
            
            <select
              value={afterProductId || ''}
              onChange={(e) => setAfterProductId(e.target.value || null)}
              disabled={availableProducts.length === 0}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-satellite-500 disabled:opacity-50"
            >
              <option value="">Select a scene...</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {format(new Date(p.acquisition_date), 'MMM dd, yyyy')} - {p.name.slice(0, 30)}... ({p.cloud_cover}% cloud)
                </option>
              ))}
            </select>
            
            {afterProduct && (
              <div className="text-[11px] text-slate-400 pt-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> Date:</span>
                  <span className="font-mono">{format(new Date(afterProduct.acquisition_date), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Cloud className="w-3 h-3 mr-1" /> Cloud:</span>
                  <span>{afterProduct.cloud_cover}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> Tile:</span>
                  <span className="font-mono">{afterProduct.tile_id || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Run Analysis Button */}
        <div className="flex items-center justify-between pt-2 border-t border-ui-border">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-satellite-400" />
            <span>NDVI differencing on Sentinel-2 Level-2A imagery</span>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !beforeProductId || !afterProductId || beforeProductId === afterProductId}
            className="px-6 py-2.5 bg-satellite-500 hover:bg-satellite-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-satellite-500/25 transition-all flex items-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Changes...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>Run Change Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="glass-effect rounded-xl p-5 border border-ui-border space-y-4">
          <div className="flex items-center justify-between border-b border-ui-border pb-3">
            <h2 className="text-base font-semibold text-white flex items-center">
              <Activity className="w-4 h-4 mr-2 text-satellite-400" />
              Analysis Results
            </h2>
            <div className="flex items-center space-x-2">
              {getDataModeBadge(analysisResult.data_mode)}
              {analysisResult.data_mode === 'demo_fallback' && (
                <span className="text-[10px] text-amber-400 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Demo Data
                </span>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1 text-[11px]">Change Detected</span>
              <span className="text-xl font-bold text-white">{(analysisResult.change_percentage * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1 text-[11px]">Before NDVI</span>
              <span className="text-lg font-semibold text-emerald-400">{analysisResult.before_ndvi_avg.toFixed(3)}</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1 text-[11px]">After NDVI</span>
              <span className="text-lg font-semibold text-amber-400">{analysisResult.after_ndvi_avg.toFixed(3)}</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1 text-[11px]">Processing Time</span>
              <span className="text-lg font-semibold text-slate-200">{analysisResult.metadata.processing_time_ms}ms</span>
            </div>
          </div>

          {/* Imagery Display */}
          <div className="space-y-3">
            {/* View Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveView('before')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeView === 'before'
                      ? 'bg-satellite-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Before
                </button>
                <button
                  onClick={() => setActiveView('after')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeView === 'after'
                      ? 'bg-satellite-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  After
                </button>
                <button
                  onClick={() => setActiveView('change')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeView === 'change'
                      ? 'bg-satellite-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Change Mask
                </button>
              </div>

              {activeView === 'change' && (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400">Opacity:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={changeMaskOpacity}
                    onChange={(e) => setChangeMaskOpacity(Number(e.target.value))}
                    className="w-24 accent-satellite-500 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Image Display */}
            <div className="relative h-96 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              {activeView === 'before' && beforeProduct && (
                <img
                  src={getSentinel2PreviewUrl(beforeProduct.id)}
                  alt="Before scene"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjOTQ5M2I4IiBmb250LXNpemU9IjE0Ij5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                  }}
                />
              )}
              
              {activeView === 'after' && afterProduct && (
                <img
                  src={getSentinel2PreviewUrl(afterProduct.id)}
                  alt="After scene"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzFhMWEyZCIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjOTQ5M2I4IiBmb250LXNpemU9IjE0Ij5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                  }}
                />
              )}
              
              {activeView === 'change' && (
                <div className="relative w-full h-full">
                  <img
                    src={getSentinel2PreviewUrl(afterProduct?.id || '')}
                    alt="Background"
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.5 }}
                  />
                  <img
                    src={getChangeMaskUrl(analysisResult.analysis_id)}
                    alt="Change mask"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: changeMaskOpacity }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {!beforeProduct && activeView === 'before' && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                  Select a before scene to view imagery
                </div>
              )}
              {!afterProduct && activeView === 'after' && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                  Select an after scene to view imagery
                </div>
              )}
            </div>
          </div>

          {/* Detailed Metadata */}
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Analysis Metadata</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Before Date:</span>
                <span className="text-white font-mono">{format(new Date(analysisResult.metadata.before_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">After Date:</span>
                <span className="text-white font-mono">{format(new Date(analysisResult.metadata.after_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="text-white">{analysisResult.processing_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Before Cloud:</span>
                <span className="text-white">{analysisResult.metadata.before_cloud_cover}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">After Cloud:</span>
                <span className="text-white">{analysisResult.metadata.after_cloud_cover}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Changed Pixels:</span>
                <span className="text-white">{analysisResult.statistics.changed_pixels.toLocaleString()}</span>
              </div>
            </div>
            
            {analysisResult.message && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-300">
                {analysisResult.message}
              </div>
            )}
          </div>

          {/* External Links */}
          <div className="flex items-center space-x-2 pt-2">
            {beforeProduct && (
              <a
                href={beforeProduct.cdse_browser_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-ui-border transition-colors flex items-center space-x-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Before in CDSE</span>
              </a>
            )}
            {afterProduct && (
              <a
                href={afterProduct.cdse_browser_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-ui-border transition-colors flex items-center space-x-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>After in CDSE</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeAnalysis;
