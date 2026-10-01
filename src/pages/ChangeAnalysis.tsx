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
  XCircle,
  FileDown
} from 'lucide-react';
import { searchSentinel2, analyzeSentinel2Change, getSentinel2PreviewUrl, getChangeMaskUrl } from '../services/api';
import { Sentinel2Product, Sentinel2SearchResponse, ChangeAnalysisResult } from '../types';
import { SatelliteInvestigationMap } from '../features/investigation/components/SatelliteInvestigationMap';
import { exportAnalysisPdf } from '../utils/exportAnalysisPdf';
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportPdf = () => {
    if (!analysisResult) return;
    setIsExportingPdf(true);
    try {
      exportAnalysisPdf({
        analysis: analysisResult,
        beforeProduct,
        afterProduct,
        aoiBbox,
        locationName: 'Pune Urban Region'
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export analysis PDF summary:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

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
    } else if (mode === 'upstream_unavailable' || mode === 'processing_unavailable') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Unavailable
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
        <div className="flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono">
          <Activity className="w-3.5 h-3.5" />
          <span>Bi-Temporal Surface Monitoring</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sentinel-2 Change Analysis</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Multi-spectral NDVI and NDBI surface differencing across paired Sentinel-2 Level-2A acquisitions for land cover dynamics and urban expansion detection.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded p-4 text-rose-900 text-xs space-y-1">
          <div className="flex items-center space-x-2 text-rose-800 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Sentinel-2 processing unavailable</span>
          </div>
          <p className="text-xs text-rose-700">
            Live Copernicus data could not be retrieved.
          </p>
          <p className="text-[11px] text-slate-500">
            Try again when the data service is available.
          </p>
          {errorMessage && errorMessage !== 'Sentinel-2 processing unavailable' && errorMessage !== 'Live Copernicus data could not be retrieved.' && (
            <p className="text-[10px] font-mono text-slate-600 pt-1 border-t border-rose-200">
              Details: {errorMessage}
            </p>
          )}
        </div>
      )}

      {/* Scene Selection Panel */}
      <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
            <Database className="w-4 h-4 mr-2 text-teal-800" />
            Temporal Pair Selection
          </h2>
          <button
            onClick={handleSearchSentinel2}
            disabled={isSearching || !aoiBbox}
            className="px-3 py-1 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 text-xs rounded border border-slate-300 transition-colors flex items-center space-x-1 font-medium shadow-xs"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-800" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-teal-800" />
                <span>Refresh Scenes</span>
              </>
            )}
          </button>
        </div>

        {/* Search Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Max Cloud Cover: <span className="text-teal-800 font-mono font-bold">{maxCloudCover}%</span></label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={maxCloudCover}
              onChange={(e) => setMaxCloudCover(Number(e.target.value))}
              className="w-full accent-teal-800 cursor-pointer"
            />
          </div>
        </div>

        {/* Scene Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Before Scene */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Baseline (Before Scene)
              </span>
              {beforeProduct && getDataModeBadge(beforeProduct.data_mode)}
            </div>
            
            <select
              value={beforeProductId || ''}
              onChange={(e) => setBeforeProductId(e.target.value || null)}
              disabled={availableProducts.length === 0}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded p-2 focus:outline-none focus:border-teal-700 disabled:opacity-50 font-mono"
            >
              <option value="">Select baseline scene...</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {format(new Date(p.acquisition_date), 'MMM dd, yyyy')} - {p.name.slice(0, 30)}... ({p.cloud_cover}% cloud)
                </option>
              ))}
            </select>
            
            {beforeProduct && (
              <div className="text-[11px] text-slate-600 pt-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-500"><Calendar className="w-3 h-3 mr-1" /> Sensing:</span>
                  <span className="font-mono text-slate-800">{format(new Date(beforeProduct.acquisition_date), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-500"><Cloud className="w-3 h-3 mr-1" /> Cloud:</span>
                  <span className="font-mono text-slate-800">{beforeProduct.cloud_cover}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-500"><MapPin className="w-3 h-3 mr-1" /> Tile:</span>
                  <span className="font-mono text-slate-800">{beforeProduct.tile_id || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>

          {/* After Scene */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Monitoring (After Scene)
              </span>
              {afterProduct && getDataModeBadge(afterProduct.data_mode)}
            </div>
            
            <select
              value={afterProductId || ''}
              onChange={(e) => setAfterProductId(e.target.value || null)}
              disabled={availableProducts.length === 0}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded p-2 focus:outline-none focus:border-teal-700 disabled:opacity-50 font-mono"
            >
              <option value="">Select monitoring scene...</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {format(new Date(p.acquisition_date), 'MMM dd, yyyy')} - {p.name.slice(0, 30)}... ({p.cloud_cover}% cloud)
                </option>
              ))}
            </select>
            
            {afterProduct && (
              <div className="text-[11px] text-slate-600 pt-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-500"><Calendar className="w-3 h-3 mr-1" /> Sensing:</span>
                  <span className="font-mono text-slate-800">{format(new Date(afterProduct.acquisition_date), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-500"><Cloud className="w-3 h-3 mr-1" /> Cloud:</span>
                  <span className="font-mono text-slate-800">{afterProduct.cloud_cover}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-500"><MapPin className="w-3 h-3 mr-1" /> Tile:</span>
                  <span className="font-mono text-slate-800">{afterProduct.tile_id || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Run Analysis Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-800" />
            <span>NDVI/NDBI differencing on 10m Sentinel-2 Level-2A surface reflectance</span>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !beforeProductId || !afterProductId || beforeProductId === afterProductId}
            className="px-5 py-2 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Computing Differences...</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span>Run Change Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bi-Temporal Investigation Map */}
      {beforeProduct && afterProduct && (
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-teal-800 uppercase tracking-wider font-mono">
                <Activity className="w-3.5 h-3.5" />
                <span>Sentinel-2 Bi-Temporal Map Comparison</span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                Interactive Before vs After Satellite Inspector
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {analysisResult ? (
                <>
                  {getDataModeBadge(analysisResult.data_mode)}
                  {analysisResult.data_mode === 'demo_fallback' && (
                    <span className="text-[10px] text-amber-700 font-mono flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                      Demo Mode
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-slate-500 font-mono">
                  {isAnalyzing ? 'Computing difference...' : 'Select Before/After to inspect'}
                </span>
              )}
            </div>
          </div>

          <SatelliteInvestigationMap
            beforeScene={{
              id: beforeProduct.id,
              name: beforeProduct.name,
              acquisition_date: beforeProduct.acquisition_date,
              tile_id: beforeProduct.tile_id,
              cloud_cover: beforeProduct.cloud_cover,
              bbox: beforeProduct.bbox,
              data_mode: beforeProduct.data_mode,
              preview_url: getSentinel2PreviewUrl(beforeProduct.id)
            }}
            afterScene={{
              id: afterProduct.id,
              name: afterProduct.name,
              acquisition_date: afterProduct.acquisition_date,
              tile_id: afterProduct.tile_id,
              cloud_cover: afterProduct.cloud_cover,
              bbox: afterProduct.bbox,
              data_mode: afterProduct.data_mode,
              preview_url: getSentinel2PreviewUrl(afterProduct.id)
            }}
            aoiBbox={aoiBbox || [73.70, 18.40, 74.05, 18.70]}
            analysis={analysisResult}
          />
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-teal-800" />
              Change Detection Results
            </h2>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Export analysis metrics and findings as PDF summary"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : exportSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{isExportingPdf ? 'Exporting...' : exportSuccess ? 'PDF Downloaded' : 'Export PDF Summary'}</span>
              </button>
              {getDataModeBadge(analysisResult.data_mode)}
              {analysisResult.data_mode === 'demo_fallback' && (
                <span className="text-[10px] text-amber-700 font-mono flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                  Demo Mode
                </span>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Change Extent</span>
              <span className="text-lg font-bold text-orange-700 font-mono">{(analysisResult.change_percentage * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Before Mean NDVI</span>
              <span className="text-lg font-bold text-emerald-700 font-mono">{analysisResult.before_ndvi_avg.toFixed(3)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">After Mean NDVI</span>
              <span className="text-lg font-bold text-slate-800 font-mono">{analysisResult.after_ndvi_avg.toFixed(3)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Processing Latency</span>
              <span className="text-lg font-bold text-slate-800 font-mono">{analysisResult.metadata.processing_time_ms} ms</span>
            </div>
          </div>

          {/* Detailed Layer Inspector */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">Detailed Layer Inspector</div>
            {/* View Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setActiveView('before')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeView === 'before'
                      ? 'bg-teal-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Before
                </button>
                <button
                  onClick={() => setActiveView('after')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeView === 'after'
                      ? 'bg-teal-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  After
                </button>
                <button
                  onClick={() => setActiveView('change')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeView === 'change'
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Change Mask
                </button>
              </div>

              {activeView === 'change' && (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-500 font-medium">Mask Opacity:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={changeMaskOpacity}
                    onChange={(e) => setChangeMaskOpacity(Number(e.target.value))}
                    className="w-24 accent-orange-600 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Image Display */}
            <div className="relative h-96 w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-100">
              {activeView === 'before' && beforeProduct && (
                <img
                  src={getSentinel2PreviewUrl(beforeProduct.id)}
                  alt="Before scene"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIiBmb250LXNpemU9IjE0Ij5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                  }}
                />
              )}
              
              {activeView === 'after' && afterProduct && (
                <img
                  src={getSentinel2PreviewUrl(afterProduct.id)}
                  alt="After scene"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIiBmb250LXNpemU9IjE0Ij5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
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
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                  Select a before scene to view imagery
                </div>
              )}
              {!afterProduct && activeView === 'after' && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                  Select an after scene to view imagery
                </div>
              )}
            </div>
          </div>

          {/* Detailed Metadata */}
          <div className="bg-slate-50 rounded border border-slate-200 p-3 space-y-1.5">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Analysis Lineage Metadata</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Before Sensing:</span>
                <span className="text-slate-900 font-mono">{format(new Date(analysisResult.metadata.before_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">After Sensing:</span>
                <span className="text-slate-900 font-mono">{format(new Date(analysisResult.metadata.after_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Algorithm:</span>
                <span className="text-slate-900 font-mono">{analysisResult.processing_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Before Cloud:</span>
                <span className="text-slate-900 font-mono">{analysisResult.metadata.before_cloud_cover}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">After Cloud:</span>
                <span className="text-slate-900 font-mono">{analysisResult.metadata.after_cloud_cover}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Changed Pixels:</span>
                <span className="text-slate-900 font-bold font-mono">{analysisResult.statistics.changed_pixels.toLocaleString()}</span>
              </div>
            </div>
            
            {analysisResult.message && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900">
                {analysisResult.message}
              </div>
            )}
          </div>

          {/* External Links & Export Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <div className="flex items-center space-x-2">
              {beforeProduct && (
                <a
                  href={beforeProduct.cdse_browser_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded border border-slate-300 transition-colors flex items-center space-x-1 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Before in CDSE</span>
                </a>
              )}
              {afterProduct && (
                <a
                  href={afterProduct.cdse_browser_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded border border-slate-300 transition-colors flex items-center space-x-1 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>After in CDSE</span>
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : exportSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{isExportingPdf ? 'Generating PDF...' : exportSuccess ? 'PDF Downloaded' : 'Export PDF Summary'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeAnalysis;
