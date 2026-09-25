import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Cloud, 
  MapPin, 
  Layers, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  Info, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Database,
  Crosshair,
  ArrowUpDown
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import LeafletMapView from '../components/LeafletMapView';
import { searchSentinel2 } from '../services/api';
import { Sentinel2Product, Sentinel2SearchResponse } from '../types';

interface PresetAOI {
  name: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  description: string;
}

const PRESET_AOIS: PresetAOI[] = [
  {
    name: 'Pune & Western Ghats',
    bbox: [73.70, 18.40, 74.05, 18.70],
    description: 'Urban expansion and vegetation zone in Maharashtra'
  },
  {
    name: 'Mumbai Coastal Region',
    bbox: [72.75, 18.90, 73.10, 19.25],
    description: 'Harbor, mangroves, and dense coastal metropolitan area'
  },
  {
    name: 'Bengaluru Tech Corridor',
    bbox: [77.45, 12.85, 77.75, 13.10],
    description: 'Urban lakes, rapid development, and technology parks'
  },
  {
    name: 'Delhi NCR Metropolitan',
    bbox: [76.90, 28.45, 77.35, 28.85],
    description: 'National capital region, Yamuna river basin'
  },
  {
    name: 'Jaipur & Aravalli Region',
    bbox: [75.65, 26.80, 75.95, 27.05],
    description: 'Heritage urban center and semi-arid terrain'
  },
  {
    name: 'Chennai Coastal Zone',
    bbox: [80.10, 12.90, 80.35, 13.20],
    description: 'Port city and coastal wetlands along Coromandel Coast'
  }
];

export const Sentinel2Search: React.FC = () => {
  // Query Parameters State
  const [aoiBbox, setAoiBbox] = useState<[number, number, number, number] | null>(PRESET_AOIS[0].bbox);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | ''>(0);
  
  // Default to May 2024 verified clear-sky benchmark window for instant live ESA results
  const [startDate, setStartDate] = useState<string>('2024-05-01');
  const [endDate, setEndDate] = useState<string>('2024-05-25');
  const [maxCloudCover, setMaxCloudCover] = useState<number>(30);
  const [productType, setProductType] = useState<'S2MSI2A' | 'S2MSI1C' | 'ALL'>('S2MSI2A');
  const [limit, setLimit] = useState<number>(20);

  // UI / Map Interaction State
  const [isDrawingAoi, setIsDrawingAoi] = useState<boolean>(false);
  const [isForceRefresh, setIsForceRefresh] = useState<boolean>(false);
  const [showManualCoords, setShowManualCoords] = useState<boolean>(false);
  const [showVerificationGuide, setShowVerificationGuide] = useState<boolean>(false);
  const [showOdataInspector, setShowOdataInspector] = useState<boolean>(false);
  const [manualMinLon, setManualMinLon] = useState<string>(String(PRESET_AOIS[0].bbox[0]));
  const [manualMinLat, setManualMinLat] = useState<string>(String(PRESET_AOIS[0].bbox[1]));
  const [manualMaxLon, setManualMaxLon] = useState<string>(String(PRESET_AOIS[0].bbox[2]));
  const [manualMaxLat, setManualMaxLat] = useState<string>(String(PRESET_AOIS[0].bbox[3]));

  // Search Results State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResponse, setSearchResponse] = useState<Sentinel2SearchResponse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Sentinel2Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'date' | 'cloud'>('date');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync manual inputs when AOI bbox changes
  useEffect(() => {
    if (aoiBbox) {
      setManualMinLon(String(aoiBbox[0]));
      setManualMinLat(String(aoiBbox[1]));
      setManualMaxLon(String(aoiBbox[2]));
      setManualMaxLat(String(aoiBbox[3]));
    }
  }, [aoiBbox]);

  // Handle Preset selection
  const handlePresetChange = (indexStr: string) => {
    if (indexStr === '') {
      setSelectedPresetIndex('');
      return;
    }
    const idx = Number(indexStr);
    setSelectedPresetIndex(idx);
    const preset = PRESET_AOIS[idx];
    if (preset) {
      setAoiBbox(preset.bbox);
    }
  };

  // Apply manual coordinate inputs
  const handleApplyManualCoords = () => {
    const minLon = parseFloat(manualMinLon);
    const minLat = parseFloat(manualMinLat);
    const maxLon = parseFloat(manualMaxLon);
    const maxLat = parseFloat(manualMaxLat);

    if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) {
      setErrorMessage('All 4 coordinate values must be valid decimal numbers.');
      return;
    }
    if (minLon >= maxLon || minLat >= maxLat) {
      setErrorMessage('Bounding box requires minLon < maxLon and minLat < maxLat.');
      return;
    }
    if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
      setErrorMessage('Coordinates must be in valid WGS84 range (-180 to 180, -90 to 90).');
      return;
    }

    setErrorMessage(null);
    setSelectedPresetIndex('');
    setAoiBbox([minLon, minLat, maxLon, maxLat]);
  };

  // Quick Date Range helpers
  const handleSetDatePreset = (daysAgo: number) => {
    const end = new Date();
    const start = subDays(end, daysAgo);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  // Perform Sentinel-2 Search
  const handleSearch = async (e?: React.FormEvent, overrideForceRefresh?: boolean) => {
    if (e) e.preventDefault();

    if (!aoiBbox) {
      setErrorMessage('Please select or draw an Area of Interest (AOI) on the map.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage('Start date must be earlier than or equal to End date.');
      return;
    }

    const force = overrideForceRefresh !== undefined ? overrideForceRefresh : isForceRefresh;

    setErrorMessage(null);
    setIsLoading(true);
    setHasSearched(true);
    setSelectedProduct(null);

    try {
      const response = await searchSentinel2({
        bbox: aoiBbox,
        start_date: startDate,
        end_date: endDate,
        max_cloud_cover: maxCloudCover,
        product_type: productType,
        limit,
        force_refresh: force
      });

      setSearchResponse(response);
      if (response.results.length > 0) {
        setSelectedProduct(response.results[0]);
      }
    } catch (err: any) {
      console.error('Sentinel-2 search failed:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to search Sentinel-2 imagery.';
      setErrorMessage(detail);
      setSearchResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search once on mount with default Pune preset
  useEffect(() => {
    handleSearch();
  }, []);

  // Sorted Results
  const sortedProducts = React.useMemo(() => {
    if (!searchResponse || !searchResponse.results) return [];
    const list = [...searchResponse.results];
    if (sortBy === 'date') {
      list.sort((a, b) => new Date(b.acquisition_date).getTime() - new Date(a.acquisition_date).getTime());
    } else if (sortBy === 'cloud') {
      list.sort((a, b) => a.cloud_cover - b.cloud_cover);
    }
    return list;
  }, [searchResponse, sortBy]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Copernicus Header */}
      <div className="glass-effect rounded-xl p-6 border border-ui-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-2.5 py-1 bg-satellite-500/20 text-satellite-400 border border-satellite-500/30 rounded-md text-xs font-semibold uppercase tracking-wider">
                Copernicus Data Space Ecosystem
              </span>
              <span className="text-xs text-slate-400">SIH 2026 Problem Statement 26227</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Sentinel-2 Satellite Imagery Discovery
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Query official European Space Agency (ESA) Copernicus Data Space APIs for multi-spectral Sentinel-2 Level-2A/1C imagery.
              Select an Area of Interest (AOI) on the Leaflet map, filter by sensing date and maximum cloud cover, and inspect real scene footprints.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto">
            <a
              href="https://dataspace.copernicus.eu/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-ui-border rounded-lg text-xs font-medium transition-colors"
            >
              <span>CDSE Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Control Panel & Right Leaflet Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Search Filter Panel */}
        <div className="lg:col-span-4 space-y-5">
          <form onSubmit={handleSearch} className="glass-effect rounded-xl p-5 border border-ui-border space-y-5">
            <div className="flex items-center justify-between border-b border-ui-border pb-3">
              <h2 className="text-base font-semibold text-white flex items-center">
                <SlidersHorizontal className="w-4 h-4 mr-2 text-satellite-400" />
                Search Parameters
              </h2>
              <span className="text-xs text-slate-400">OData API</span>
            </div>

            {/* Error Message banner */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start space-x-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* AOI Section */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider">
                1. Area of Interest (AOI)
              </label>

              {/* Quick AOI Presets */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400">Regional Presets:</span>
                <select
                  value={selectedPresetIndex}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-ui-border rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
                >
                  <option value="">-- Custom Drawn / Coordinate BBox --</option>
                  {PRESET_AOIS.map((preset, idx) => (
                    <option key={preset.name} value={idx}>
                      {preset.name} ({preset.bbox[1].toFixed(2)}N, {preset.bbox[0].toFixed(2)}E)
                    </option>
                  ))}
                </select>
              </div>

              {/* Map Draw Trigger */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDrawingAoi(!isDrawingAoi)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                    isDrawingAoi
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{isDrawingAoi ? 'Drawing Active...' : 'Draw AOI on Map'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualCoords(!showManualCoords)}
                  className="px-2.5 py-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-ui-border flex items-center space-x-1"
                  title="Edit bounding box numbers directly"
                >
                  <span>BBox</span>
                  {showManualCoords ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Collapsible Manual BBox input */}
              {showManualCoords && (
                <div className="p-3 bg-slate-800/70 border border-ui-border rounded-lg space-y-2 text-xs">
                  <p className="text-[11px] text-slate-400">WGS84 Coordinates [minLon, minLat, maxLon, maxLat]:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400">Min Lon (West)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={manualMinLon}
                        onChange={(e) => setManualMinLon(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-900 border border-ui-border rounded text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Min Lat (South)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={manualMinLat}
                        onChange={(e) => setManualMinLat(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-900 border border-ui-border rounded text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Max Lon (East)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={manualMaxLon}
                        onChange={(e) => setManualMaxLon(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-900 border border-ui-border rounded text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Max Lat (North)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={manualMaxLat}
                        onChange={(e) => setManualMaxLat(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-900 border border-ui-border rounded text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyManualCoords}
                    className="w-full py-1 text-center bg-satellite-600 hover:bg-satellite-500 text-white rounded font-medium text-[11px] transition-colors"
                  >
                    Apply Coordinates
                  </button>
                </div>
              )}

              {/* Current Active AOI summary pill */}
              {aoiBbox && (
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[11px] text-amber-300">
                  <div className="flex items-center space-x-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono">
                      {aoiBbox[1].toFixed(2)}, {aoiBbox[0].toFixed(2)} &rarr; {aoiBbox[3].toFixed(2)}, {aoiBbox[2].toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-amber-400">Active</span>
                </div>
              )}
            </div>

            {/* Date Range Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider">
                  2. Sensing Date Range
                </label>
                <div className="flex items-center space-x-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('2024-05-01');
                      setEndDate('2024-05-25');
                    }}
                    className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded font-medium"
                    title="Verified clear-sky benchmark window with guaranteed live Copernicus Sentinel-2 Level-2A imagery"
                  >
                    Benchmark: May 2024
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDatePreset(14)}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    14d
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDatePreset(30)}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    30d
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Start Date</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-ui-border rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">End Date</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-ui-border rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud Cover Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold uppercase text-slate-300 tracking-wider">
                  3. Max Cloud Cover: <span className="text-satellite-400 font-bold">{maxCloudCover}%</span>
                </label>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setMaxCloudCover(10)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-green-400 rounded"
                  >
                    &le;10%
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxCloudCover(30)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded"
                  >
                    &le;30%
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxCloudCover(100)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    All
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={maxCloudCover}
                onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                className="w-full accent-satellite-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0% (Clear Sky)</span>
                <span>50%</span>
                <span>100% (Any)</span>
              </div>
            </div>

            {/* Product Type & Limit */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Product Level</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-ui-border rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
                >
                  <option value="S2MSI2A">Level-2A (Bottom of Atmos.)</option>
                  <option value="S2MSI1C">Level-1C (Top of Atmos.)</option>
                  <option value="ALL">All Levels</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Result Limit</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-ui-border rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-satellite-500"
                >
                  <option value="10">10 products</option>
                  <option value="20">20 products</option>
                  <option value="50">50 products</option>
                </select>
              </div>
            </div>

            {/* Cache Control Toggle */}
            <div className="pt-1 flex items-center justify-between text-xs text-slate-300">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isForceRefresh}
                  onChange={(e) => setIsForceRefresh(e.target.checked)}
                  className="rounded border-ui-border bg-slate-800 text-satellite-500 focus:ring-satellite-500"
                />
                <span className="text-[11px] text-slate-400">Force Live CDSE Query (bypass cache)</span>
              </label>
            </div>

            {/* Search Submit Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={isLoading || !aoiBbox}
                className="py-2.5 px-3 bg-satellite-500 hover:bg-satellite-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-satellite-500/25 transition-all flex items-center justify-center space-x-1.5 text-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search Imagery</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSearch(undefined, true)}
                disabled={isLoading || !aoiBbox}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center space-x-1.5 text-xs"
                title="Bypass in-memory cache and directly query live Copernicus OData"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span>Force Live CDSE</span>
              </button>
            </div>
          </form>

          {/* Search Statistics / Provenance Card */}
          {searchResponse && (
            <div className="glass-effect rounded-xl p-4 border border-ui-border text-xs space-y-3">
              {/* Primary Data Mode Banner */}
              <div className="flex items-center justify-between pb-2 border-b border-ui-border/60">
                <span className="text-slate-400 font-medium">Data Status:</span>
                {searchResponse.data_mode === 'live_copernicus' ? (
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE Copernicus API
                  </span>
                ) : searchResponse.data_mode === 'cached' ? (
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    Cached Data ({searchResponse.cache_age_seconds || 0}s old)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Demo / Fallback Data
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Endpoint:</span>
                <span className="text-white font-mono text-[10px] truncate max-w-[200px]" title={searchResponse.api_endpoint}>
                  catalogue.dataspace.copernicus.eu
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Query Latency:</span>
                <span className="text-white font-mono">{searchResponse.execution_time_ms} ms</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Products Discovered:</span>
                <span className="text-white font-bold">{searchResponse.total_results} scenes</span>
              </div>
              {searchResponse.data_mode === 'cached' && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Cache Status:</span>
                  <button
                    type="button"
                    onClick={() => handleSearch(undefined, true)}
                    className="text-satellite-400 hover:text-satellite-300 underline text-[11px] font-medium"
                  >
                    Query Live CDSE Now &rarr;
                  </button>
                </div>
              )}

              {/* Action buttons for verification and inspection */}
              <div className="pt-2 border-t border-ui-border/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOdataInspector(!showOdataInspector)}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-ui-border transition-colors text-center"
                >
                  {showOdataInspector ? 'Hide Query' : 'Inspect OData'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVerificationGuide(true)}
                  className="flex-1 py-1.5 px-2 bg-satellite-500/20 hover:bg-satellite-500/30 text-satellite-300 rounded text-[11px] border border-satellite-500/40 transition-colors text-center font-medium"
                >
                  Verify Live ESA &rarr;
                </button>
              </div>

              {/* Collapsible OData Query String Inspector */}
              {showOdataInspector && searchResponse.odata_filter && (
                <div className="p-2.5 bg-slate-900 border border-ui-border rounded-lg text-[10px] space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400 font-semibold">
                    <span>OData $filter Expression:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(searchResponse.odata_filter || '')}
                      className="text-satellite-400 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="font-mono text-slate-300 break-all whitespace-pre-wrap bg-slate-950 p-2 rounded max-h-32 overflow-y-auto">
                    {searchResponse.odata_filter}
                  </pre>
                </div>
              )}

              {searchResponse.message && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-[11px] text-yellow-300">
                  {searchResponse.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leaflet Map Visualizer */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="glass-effect rounded-xl overflow-hidden border border-ui-border p-2 flex-1 min-h-[500px] flex flex-col">
            <div className="px-3 py-2 flex items-center justify-between border-b border-ui-border/60 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold text-white">Interactive Leaflet Map</span>
                <span className="text-slate-400 text-[11px]">&bull; Click a scene footprint to inspect details</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                {sortedProducts.length > 0 ? `${sortedProducts.length} Footprints Rendered` : 'No Footprints'}
              </div>
            </div>

            <div className="flex-1 min-h-[460px] relative mt-2">
              <LeafletMapView
                aoiBbox={aoiBbox}
                onAoiChange={setAoiBbox}
                products={sortedProducts}
                selectedProductId={selectedProduct?.id || null}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
                isDrawingAoi={isDrawingAoi}
                setIsDrawingAoi={setIsDrawingAoi}
                center={[
                  aoiBbox ? (aoiBbox[1] + aoiBbox[3]) / 2 : 18.5204,
                  aoiBbox ? (aoiBbox[0] + aoiBbox[2]) / 2 : 73.8567
                ]}
                zoom={7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="glass-effect rounded-xl border border-ui-border overflow-hidden">
        {/* Results Header */}
        <div className="p-4 border-b border-ui-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-satellite-400" />
            <div>
              <h3 className="text-base font-semibold text-white">
                Discovered Sentinel-2 Scenes ({sortedProducts.length})
              </h3>
              <p className="text-xs text-slate-400">
                Filtered by AOI, sensing dates {startDate} to {endDate}, cloud cover &le; {maxCloudCover}%
              </p>
            </div>
          </div>

          {sortedProducts.length > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 flex items-center">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                Sort:
              </span>
              <button
                type="button"
                onClick={() => setSortBy('date')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  sortBy === 'date'
                    ? 'bg-satellite-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Date (Newest)
              </button>
              <button
                type="button"
                onClick={() => setSortBy('cloud')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  sortBy === 'cloud'
                    ? 'bg-satellite-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Cloud Cover (Lowest)
              </button>
            </div>
          )}
        </div>

        {/* Results Grid / List */}
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-satellite-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Searching Copernicus Data Space Ecosystem catalog...</p>
            <p className="text-xs text-slate-500">Checking spatial intersection and sensing attributes</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-white">No Sentinel-2 Imagery Found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No products matched the exact AOI, date range ({startDate} to {endDate}), and maximum cloud cover limit ({maxCloudCover}%).
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMaxCloudCover(100);
                  handleSetDatePreset(60);
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-satellite-400 text-xs font-medium rounded-lg border border-satellite-500/30 transition-colors"
              >
                Widen Date to 60 Days & Max Cloud 100%
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedProducts.map((product) => {
              const isSelected = selectedProduct?.id === product.id;
              const cloudColor =
                product.cloud_cover < 10
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : product.cloud_cover < 30
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30';

              const formattedDate = product.acquisition_date
                ? format(new Date(product.acquisition_date), 'MMM dd, yyyy HH:mm')
                : 'Unknown';

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`rounded-xl border transition-all p-4 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-satellite-400 shadow-md shadow-satellite-500/10'
                      : 'bg-slate-800/40 border-ui-border hover:bg-slate-800/70 hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 bg-satellite-500/20 text-satellite-400 border border-satellite-500/30 rounded text-[11px] font-semibold">
                          {product.product_type}
                        </span>
                        {product.data_mode === 'live_copernicus' ? (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                          </span>
                        ) : product.data_mode === 'cached' ? (
                          <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            Cached
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Demo
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 border rounded text-[11px] font-semibold flex items-center space-x-1 ${cloudColor}`}>
                        <Cloud className="w-3 h-3" />
                        <span>{product.cloud_cover}% Cloud</span>
                      </span>
                    </div>

                    {/* Product Name */}
                    <div>
                      <h4
                        className="text-xs font-semibold text-white line-clamp-2 hover:text-satellite-300 transition-colors"
                        title={product.name}
                      >
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {product.id.slice(0, 8)}...{product.id.slice(-6)}
                      </p>
                    </div>

                    {/* Metadata details */}
                    <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          Acquisition:
                        </span>
                        <span className="font-medium text-slate-200">{formattedDate} UTC</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Platform:</span>
                        <span className="font-medium text-slate-200">{product.platform}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Tile ID:</span>
                        <span className="font-mono text-slate-200">{product.tile_id || 'N/A'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Centroid:</span>
                        <span className="font-mono text-slate-200 text-[11px]">
                          {product.center[1].toFixed(2)}&deg;N, {product.center[0].toFixed(2)}&deg;E
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors ${
                        isSelected
                          ? 'bg-satellite-500 text-white'
                          : 'bg-slate-700/70 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Viewing on Map' : 'View on Map'}</span>
                    </button>

                    <a
                      href={product.cdse_browser_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-slate-700/70 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                      title="Open full interactive Sentinel-2 scene in Copernicus Browser"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(product.id);
                      }}
                      className="p-1.5 bg-slate-700/70 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                      title="Copy Copernicus Product UUID"
                    >
                      {copiedId === product.id ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Product Inspection Details Modal/Card */}
      {selectedProduct && (
        <div className="glass-effect rounded-xl p-5 border border-satellite-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ui-border pb-3">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-semibold text-satellite-400 uppercase tracking-wider">
                  Inspecting Sentinel-2 Scene Footprint
                </span>
                {selectedProduct.data_mode === 'live_copernicus' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE Copernicus API
                  </span>
                ) : selectedProduct.data_mode === 'cached' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    Cached Data
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Demo / Fallback Data
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white break-all">{selectedProduct.name}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={selectedProduct.cdse_browser_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-satellite-600 hover:bg-satellite-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <span>Copernicus Browser</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1">Copernicus UUID</span>
              <span className="font-mono text-white text-[11px] break-all">{selectedProduct.id}</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1">Acquisition Date</span>
              <span className="text-white font-medium">
                {selectedProduct.acquisition_date
                  ? format(new Date(selectedProduct.acquisition_date), 'MMM dd, yyyy HH:mm')
                  : 'N/A'}{' '}
                UTC
              </span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1">Cloud Coverage</span>
              <span className="text-white font-semibold">{selectedProduct.cloud_cover}%</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1">Processing Level</span>
              <span className="text-white font-semibold">{selectedProduct.product_type}</span>
            </div>
          </div>

          {selectedProduct.metadata && Object.keys(selectedProduct.metadata).length > 0 && (
            <div className="pt-2 text-xs">
              <p className="text-slate-400 mb-1">Satellite Metadata Attributes:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedProduct.metadata).map(([key, val]) => (
                  val ? (
                    <span key={key} className="px-2 py-1 bg-slate-800 text-slate-300 rounded font-mono text-[11px]">
                      {key}: {String(val)}
                    </span>
                  ) : null
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sentinel2Search;
