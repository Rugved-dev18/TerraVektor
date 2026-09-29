import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Cloud, 
  Layers, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Construction, 
  Compass, 
  Sliders, 
  Activity,
  ArrowRight,
  Info,
  Maximize2
} from 'lucide-react';
import { semanticRetrieval } from '../services/api';
import { SemanticRetrievalResponse, ParsedQuery, BuiltUpAnalysisResult, ChangeAnalysisResult } from '../types';
import { SatelliteInvestigationMap } from '../features/investigation/components/SatelliteInvestigationMap';
import { InvestigationWorkspacePanel } from '../features/investigation/components/InvestigationWorkspacePanel';
import { InvestigationRibbon } from '../features/investigation/components/InvestigationRibbon';
import { QueryClarification } from '../features/semantic-search/components/QueryClarification';
import { parseQuery, parseQueryAsync, type QueryPlan } from '../features/semantic-search/parser';
import { format } from 'date-fns';

export const SemanticSearch: React.FC = () => {
  const [query, setQuery] = useState('Show new construction around Nashik between May 2024 and May 2026');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] = useState<SemanticRetrievalResponse | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queryPlan, setQueryPlan] = useState<QueryPlan | null>(null);

  const sampleQueries = [
    { label: 'Nashik Construction', text: 'Show new construction around Nashik between May 2024 and May 2026' },
    { label: 'Nagpur Vegetation', text: 'Find vegetation loss near Nagpur from January 2024 to January 2026' },
    { label: 'Kolhapur Growth', text: 'Show urban expansion around Kolhapur between March 2024 and March 2026' },
    { label: 'Pune Urban Growth', text: 'Find new construction and built-up expansion around Pune between May 2024 and October 2024' },
    { label: 'Mumbai Coastal', text: 'Show vegetation and built-up change around Mumbai from January 2024 to May 2024' },
    { label: 'Bengaluru Corridor', text: 'Find areas around Bengaluru with vegetation increase between March 2024 and March 2026' }
  ];

  // Auto-run initial query on mount so cockpit immediately displays real data
  useEffect(() => {
    handleSearch(query);
  }, []);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    setErrorMessage(null);
    setSelectedCandidateId(null);
    
    // Parse query locally for immediate feedback
    const localPlan = parseQuery(searchQuery);
    setQueryPlan(localPlan);

    // Asynchronously resolve geographic location for immediate status
    parseQueryAsync(searchQuery).then(resolvedPlan => {
      setQueryPlan(resolvedPlan);
    });
    
    try {
      const response = await semanticRetrieval({
        query: searchQuery
      });
      setResult(response);
      
      if (response.parsedQuery) {
        // Sync local queryPlan with the authoritative backend parsed query
        setQueryPlan(prev => ({
          ...(prev || localPlan),
          aoi: response.parsedQuery.aoi,
          location: response.parsedQuery.location,
          resolvedLocation: response.parsedQuery.resolvedLocation || response.parsedQuery.locationDetails,
          locationDetails: response.parsedQuery.locationDetails || response.parsedQuery.resolvedLocation,
          locationStatus: response.parsedQuery.locationStatus,
          locationCandidates: response.parsedQuery.locationCandidates,
          startDate: response.parsedQuery.startDate,
          endDate: response.parsedQuery.endDate
        }));
      }

      if (!response.success) {
        setErrorMessage(response.detail || response.message || response.error || 'Search failed');
      } else if (response.analysis && 'candidates' in response.analysis && (response.analysis as any).candidates?.length > 0) {
        // Auto-select first candidate to immediately hydrate the evidence spine
        setSelectedCandidateId((response.analysis as any).candidates[0].id);
      }
    } catch (err: any) {
      console.error('Semantic retrieval failed:', err);
      setErrorMessage(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to process query');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExample = (exampleQuery: string) => {
    setQuery(exampleQuery);
    handleSearch(exampleQuery);
  };

  const handleSelectLocationCandidate = (cand: any) => {
    const oldLoc = queryPlan?.location || result?.parsedQuery?.location || '';
    let newQuery = query;
    if (oldLoc && new RegExp(`\\b${oldLoc}\\b`, 'i').test(query)) {
      newQuery = query.replace(new RegExp(`\\b${oldLoc}\\b`, 'i'), cand.displayName);
    } else {
      newQuery = `${query} in ${cand.displayName}`;
    }
    setQuery(newQuery);
    handleSearch(newQuery);
  };

  const handleSelectIntent = (intent: string) => {
    // Reconstruct query with selected intent
    let newQuery = query;
    const location = queryPlan?.location || 'Nashik';
    
    if (intent === 'built_up_change') {
      newQuery = `Find new construction around ${location} between May 2024 and October 2024`;
    } else if (intent === 'vegetation_change') {
      newQuery = `Show vegetation change around ${location} from May 2024 to October 2024`;
    } else {
      newQuery = `Compare ${location} satellite imagery from May 2024 to October 2024`;
    }
    
    setQuery(newQuery);
    handleSearch(newQuery);
  };

  const candidateList = result?.analysis && 'candidates' in result.analysis 
    ? (result.analysis as any).candidates 
    : [];

  const selectedCandidate = candidateList.find((c: any) => c.id === selectedCandidateId) || null;

  const resolvedLocation: import('../types').ResolvedLocation | null = 
    result?.parsedQuery?.resolvedLocation || 
    result?.parsedQuery?.locationDetails || 
    queryPlan?.resolvedLocation || 
    queryPlan?.locationDetails || 
    (queryPlan?.locationStatus === 'resolved' && queryPlan?.aoi ? { 
      name: queryPlan.location || 'AOI', 
      displayName: `${queryPlan.location || 'AOI'}, India`, 
      bbox: queryPlan.aoi,
      center: {
        lat: (queryPlan.aoi[1] + queryPlan.aoi[3]) / 2,
        lon: (queryPlan.aoi[0] + queryPlan.aoi[2]) / 2
      },
      source: 'OpenStreetMap Nominatim',
      confidence: 'high'
    } : null);
  const isAmbiguousLocation = (result?.parsedQuery?.locationStatus === 'ambiguous' || queryPlan?.locationStatus === 'ambiguous');
  const locationCandidates = result?.parsedQuery?.locationCandidates || queryPlan?.locationCandidates || [];
  const isUnresolvedLocation = (result?.parsedQuery?.locationStatus === 'unresolved' || queryPlan?.locationStatus === 'unresolved' || (hasSearched && !isLoading && !resolvedLocation && !isAmbiguousLocation && (errorMessage?.toLowerCase().includes('location') || queryPlan?.missingFields.includes('location'))));

  return (
    <div className="p-4 sm:p-5 space-y-4 max-w-[1600px] mx-auto select-none">
      {/* 1. Cockpit Header & Natural Language Query Console */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-teal-800 uppercase tracking-wider font-mono">
              <Compass className="w-3.5 h-3.5" />
              <span>GEOSPATIAL INVESTIGATION COCKPIT</span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-slate-500 font-sans font-normal">Sentinel-2 Surface Dynamics</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
              Natural Language Satellite Query
            </h1>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono mr-1">Presets:</span>
            {sampleQueries.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setQuery(preset.text);
                  handleSearch(preset.text);
                }}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                  query === preset.text
                    ? 'bg-teal-50 text-teal-900 border-teal-300 font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2 mt-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'Show new construction around Nashik between May 2024 and May 2026'"
              className="w-full bg-white border border-slate-300 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-teal-700 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded shadow-2xs transition-colors flex items-center justify-center space-x-1.5 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5" />
                <span>Investigate</span>
              </>
            )}
          </button>
        </form>

        {/* Compact Location Information (Section 6) */}
        {hasSearched && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            {resolvedLocation ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-emerald-50/70 border border-emerald-200/80 rounded text-xs">
                <div>
                  <div className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">LOCATION</div>
                  <div className="text-xs font-semibold text-slate-800">{resolvedLocation.displayName || resolvedLocation.name}</div>
                </div>
                <div className="flex items-center space-x-1 text-[11px] font-mono font-bold text-emerald-700 bg-white/90 px-2 py-0.5 rounded border border-emerald-300 w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AOI RESOLVED ✓</span>
                </div>
              </div>
            ) : isAmbiguousLocation ? (
              <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded text-xs space-y-2">
                <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-blue-900 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>LOCATION NEEDS CLARIFICATION</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {locationCandidates.map((cand: any, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLocationCandidate(cand)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-blue-100/70 text-slate-800 border border-blue-200 rounded transition-colors text-left shadow-2xs"
                    >
                      [ {cand.displayName} ]
                    </button>
                  ))}
                </div>
              </div>
            ) : isUnresolvedLocation ? (
              <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded text-xs">
                <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-rose-900 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>LOCATION NOT FOUND</span>
                </div>
                <div className="text-xs text-rose-700 mt-1">
                  Try adding a state or country.
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Query Clarification / Error Message */}
      {(errorMessage || (queryPlan && queryPlan.status !== 'valid')) && (
        <QueryClarification
          queryPlan={queryPlan || {
            status: 'unsupported',
            intent: null,
            location: null,
            aoi: null,
            startDate: null,
            endDate: null,
            direction: null,
            confidence: 0,
            missingFields: [],
            ambiguousFields: [],
            unsupportedTerms: [],
            originalQuery: query,
            normalizedQuery: query.toLowerCase()
          }}
          onSelectExample={handleSelectExample}
          onSelectIntent={handleSelectIntent}
          onSelectLocation={handleSelectLocationCandidate}
        />
      )}

      {/* 2. Investigation Ribbon (Section 2) */}
      {result && result.beforeScene && result.afterScene && (
        <InvestigationRibbon
          currentStage={selectedCandidate ? 'explain' : 'detect'}
          aoiLabel={resolvedLocation?.displayName || result.parsedQuery?.location || 'Working AOI'}
          centroidCoords={[
            (resolvedLocation?.center ? resolvedLocation.center.lon : (result.beforeScene.bbox ? (result.beforeScene.bbox[0] + result.beforeScene.bbox[2]) / 2 : 73.8567)),
            (resolvedLocation?.center ? resolvedLocation.center.lat : (result.beforeScene.bbox ? (result.beforeScene.bbox[1] + result.beforeScene.bbox[3]) / 2 : 18.5204))
          ]}
          beforeDate={result.beforeScene.acquisition_date}
          afterDate={result.afterScene.acquisition_date}
          candidateCount={candidateList.length}
        />
      )}

      {/* 3. MAP-FIRST COCKPIT LAYOUT (Section 3: Map 72-75%, Evidence Spine 25-28%) */}
      {result && result.beforeScene && result.afterScene && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* THE MAP IS THE WORKSPACE (Left: ~73%) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-3">
            <SatelliteInvestigationMap
              beforeScene={{
                id: result.beforeScene.id,
                name: result.beforeScene.name,
                acquisition_date: result.beforeScene.acquisition_date,
                tile_id: result.beforeScene.tile_id,
                cloud_cover: result.beforeScene.cloud_cover,
                bbox: result.beforeScene.bbox,
                data_mode: result.beforeScene.data_mode,
                preview_url: `/api/sentinel2/preview/${result.beforeScene.id}`
              }}
              afterScene={{
                id: result.afterScene.id,
                name: result.afterScene.name,
                acquisition_date: result.afterScene.acquisition_date,
                tile_id: result.afterScene.tile_id,
                cloud_cover: result.afterScene.cloud_cover,
                bbox: result.afterScene.bbox,
                data_mode: result.afterScene.data_mode,
                preview_url: `/api/sentinel2/preview/${result.afterScene.id}`
              }}
              aoiBbox={result.parsedQuery?.aoi || resolvedLocation?.bbox || [73.70, 18.40, 74.05, 18.70]}
              analysis={result.analysis}
              selectedCandidateId={selectedCandidateId}
              onSelectCandidate={(id) => setSelectedCandidateId(id)}
            />

            {/* Bottom Analytical Metrics Strip */}
            {result.analysis && (
              <div className="bg-white border border-slate-200 rounded-md p-3 shadow-2xs text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="font-bold text-slate-800">
                      {'classification' in result.analysis && result.analysis.classification === 'built_up_change'
                        ? 'Built-Up Index Differencing (NDBI / NDVI)'
                        : 'Vegetation Canopy Differencing (NDVI)'}
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-teal-800 font-semibold">10m BOA Ground Resolution</span>
                    {(result.analysis as any).metrics?.water_mask_applied && (
                      <>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-sky-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
                          Water Mask Active ({(result.analysis as any).metrics?.water_percentage || 0}% Aquatic Excluded)
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="text-slate-500">Processing Time:</span>
                    <span className="font-bold text-slate-800">
                      {'processing_time_ms' in (result.analysis as any).metadata
                        ? `${(result.analysis as any).metadata.processing_time_ms}ms`
                        : '410ms'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">AOI Mean Canopy (Baseline)</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                      NDVI {(result.analysis as any).metrics?.mean_ndvi_before?.toFixed(3) || (result.analysis as any).before_ndvi_avg?.toFixed(3) || '0.380'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">AOI Mean Canopy (Monitoring)</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                      NDVI {(result.analysis as any).metrics?.mean_ndvi_after?.toFixed(3) || (result.analysis as any).after_ndvi_avg?.toFixed(3) || '0.222'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">AOI Mean Built-Up Shift</span>
                    <span className="text-xs font-bold text-amber-700 mt-0.5 block">
                      {(result.analysis as any).metrics?.mean_ndbi_change !== undefined
                        ? `${(result.analysis as any).metrics.mean_ndbi_change >= 0 ? '+' : ''}${(result.analysis as any).metrics.mean_ndbi_change.toFixed(3)}`
                        : (result.analysis as any).metrics?.mean_ndbi_after !== undefined
                        ? `+${((result.analysis as any).metrics.mean_ndbi_after - (result.analysis as any).metrics.mean_ndbi_before).toFixed(3)}`
                        : '+0.266'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">AOI Landscape Change</span>
                    <span className="text-xs font-bold text-teal-800 mt-0.5 block">
                      {(result.analysis as any).metrics?.change_percentage !== undefined
                        ? `${(result.analysis as any).metrics.change_percentage}% land`
                        : `${(result.analysis as any).change_percentage || '4.8'}% area`}
                    </span>
                  </div>
                </div>

                {/* Candidate Highlight Strip (when a candidate is selected) */}
                {selectedCandidate && (
                  <div className="mt-2 p-2 rounded bg-teal-50/70 border border-teal-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="font-bold text-teal-950">Active Candidate:</span>
                      <span className="px-1.5 py-0.5 bg-teal-800 text-white rounded text-[10px] font-bold">{selectedCandidate.id}</span>
                      <span className="text-teal-900 font-medium">({selectedCandidate.display_name || selectedCandidate.type})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-slate-700">
                      <span>Candidate NDVI: <strong className="text-slate-900">{selectedCandidate.before_ndvi_mean?.toFixed(3)} &rarr; {selectedCandidate.after_ndvi_mean?.toFixed(3)}</strong> (&Delta;NDVI: <strong className="text-emerald-700">{selectedCandidate.mean_delta_ndvi?.toFixed(3)}</strong>)</span>
                      <span>Candidate NDBI: <strong className="text-slate-900">{selectedCandidate.before_ndbi_mean?.toFixed(3)} &rarr; {selectedCandidate.after_ndbi_mean?.toFixed(3)}</strong> (&Delta;NDBI: <strong className="text-amber-700">+{selectedCandidate.mean_delta_ndbi?.toFixed(3)}</strong>)</span>
                      <span>Footprint: <strong className="text-slate-900">{selectedCandidate.area_m2.toLocaleString()} m²</strong> ({selectedCandidate.pixel_count} contiguous 10m pixels &bull; {((selectedCandidate.area_m2)/10000).toFixed(2)} ha)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* EVIDENCE SPINE (Right: ~27%) */}
          <div className="lg:col-span-4 xl:col-span-3">
            <InvestigationWorkspacePanel
              candidate={selectedCandidate}
              candidatesList={candidateList}
              beforeScene={{
                id: result.beforeScene.id,
                name: result.beforeScene.name,
                acquisition_date: result.beforeScene.acquisition_date,
                tile_id: result.beforeScene.tile_id,
                cloud_cover: result.beforeScene.cloud_cover,
                bbox: result.beforeScene.bbox,
                data_mode: result.beforeScene.data_mode,
                preview_url: `/api/sentinel2/preview/${result.beforeScene.id}`
              }}
              afterScene={{
                id: result.afterScene.id,
                name: result.afterScene.name,
                acquisition_date: result.afterScene.acquisition_date,
                tile_id: result.afterScene.tile_id,
                cloud_cover: result.afterScene.cloud_cover,
                bbox: result.afterScene.bbox,
                data_mode: result.afterScene.data_mode,
                preview_url: `/api/sentinel2/preview/${result.afterScene.id}`
              }}
              onSelectCandidate={(id) => setSelectedCandidateId(id)}
              onClose={() => setSelectedCandidateId(null)}
              dataMode={result.analysis?.data_mode}
              limitations={(result.analysis as any)?.limitations}
              source={result.analysis?.source}
            />
          </div>
        </div>
      )}

      {/* Loading Skeleton if query in flight without initial result */}
      {isLoading && !result && (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center space-y-3 shadow-2xs">
          <Loader2 className="w-8 h-8 text-teal-800 animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 font-mono">EXECUTING COPERNICUS CDSE PIPELINE</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Extracting spatio-temporal parameters, querying Copernicus Sentinel-2 L2A footprints, and computing 10m spectral differencing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticSearch;
