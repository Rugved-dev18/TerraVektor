import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Eye, 
  EyeOff, 
  Layers, 
  Maximize2, 
  Sliders, 
  Building2, 
  CheckCircle2, 
  Info,
  Construction,
  Compass,
  Crosshair,
  Plus,
  Minus,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { BuiltUpAnalysisResult, ChangeAnalysisResult, CandidateRegion } from '../../../types';

export interface SceneSummary {
  id: string;
  name?: string;
  acquisition_date: string;
  tile_id?: string;
  cloud_cover: number;
  bbox?: [number, number, number, number];
  data_mode?: string;
  preview_url?: string;
}

export type { CandidateRegion };

interface SatelliteInvestigationMapProps {
  beforeScene: SceneSummary;
  afterScene: SceneSummary;
  aoiBbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  analysis?: BuiltUpAnalysisResult | ChangeAnalysisResult | null;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string | null) => void;
}

export const SatelliteInvestigationMap: React.FC<SatelliteInvestigationMapProps> = ({
  beforeScene,
  afterScene,
  aoiBbox,
  analysis,
  selectedCandidateId,
  onSelectCandidate
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Panes
  const beforePaneRef = useRef<HTMLElement | null>(null);
  const afterPaneRef = useRef<HTMLElement | null>(null);
  const maskPaneRef = useRef<HTMLElement | null>(null);

  // Layers
  const baseLayersRef = useRef<{ osm: L.TileLayer; satellite: L.TileLayer } | null>(null);
  const beforeOverlayRef = useRef<L.ImageOverlay | null>(null);
  const afterOverlayRef = useRef<L.ImageOverlay | null>(null);
  const maskOverlayRef = useRef<L.ImageOverlay | null>(null);
  const aoiRectRef = useRef<L.Rectangle | null>(null);
  const candidateLayersRef = useRef<Map<string, L.Layer>>(new Map());

  // Component state
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 - 100
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [showChangeOverlay, setShowChangeOverlay] = useState<boolean>(true);
  const [showCandidates, setShowCandidates] = useState<boolean>(true);
  const [showAoiBoundary, setShowAoiBoundary] = useState<boolean>(true);
  const [activeBaseLayer, setActiveBaseLayer] = useState<'satellite' | 'osm'>('satellite');

  // Extract candidate regions if built-up analysis
  const builtUpAnalysis = analysis && 'classification' in analysis && analysis.classification === 'built_up_change' 
    ? (analysis as BuiltUpAnalysisResult) 
    : null;
  
  const candidateList: CandidateRegion[] = builtUpAnalysis?.candidates || [];
  const selectedCandidate = candidateList.find(c => c.id === selectedCandidateId) || null;

  // Initialize Map and Leaflet Panes
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    const bPane = map.createPane('beforePane');
    bPane.style.zIndex = '400';

    const aPane = map.createPane('afterPane');
    aPane.style.zIndex = '420';

    const mPane = map.createPane('maskPane');
    mPane.style.zIndex = '440';

    beforePaneRef.current = bPane;
    afterPaneRef.current = aPane;
    maskPaneRef.current = mPane;

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Esri World Imagery'
      }
    );

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: 'OpenStreetMap'
    });

    satelliteLayer.addTo(map);
    baseLayersRef.current = { osm: osmLayer, satellite: satelliteLayer };

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://dataspace.copernicus.eu/">Copernicus Sentinel-2</a>')
      .addTo(map);

    mapRef.current = map;

    // Attach ResizeObserver to container to call invalidateSize() when dimensions change (Section 12)
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Clip Paths on Panes when slider position changes
  const applyPaneClips = useCallback((pos: number) => {
    if (beforePaneRef.current) {
      beforePaneRef.current.style.clipPath = `inset(0 ${100 - pos}% 0 0)`;
    }
    if (afterPaneRef.current) {
      afterPaneRef.current.style.clipPath = `inset(0 0 0 ${pos}%)`;
    }
    if (maskPaneRef.current) {
      maskPaneRef.current.style.clipPath = `inset(0 0 0 ${pos}%)`;
    }
  }, []);

  useEffect(() => {
    applyPaneClips(sliderPosition);
  }, [sliderPosition, applyPaneClips]);

  // Load Imagery Overlays and AOI Boundary
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (beforeOverlayRef.current) {
      map.removeLayer(beforeOverlayRef.current);
      beforeOverlayRef.current = null;
    }
    if (afterOverlayRef.current) {
      map.removeLayer(afterOverlayRef.current);
      afterOverlayRef.current = null;
    }
    if (aoiRectRef.current) {
      map.removeLayer(aoiRectRef.current);
      aoiRectRef.current = null;
    }

    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    const aoiBounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);

    if (showAoiBoundary) {
      const aoiRect = L.rectangle(aoiBounds, {
        color: '#0f766e',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#0f766e',
        fillOpacity: 0.04
      }).addTo(map);

      aoiRect.bindTooltip(
        `<div class="text-[10px] font-mono text-teal-900 font-semibold">AOI Grid</div>
         <div class="text-[9px] text-slate-500 font-mono">${minLat.toFixed(3)}°N, ${minLon.toFixed(3)}°E to ${maxLat.toFixed(3)}°N, ${maxLon.toFixed(3)}°E</div>`,
        { permanent: false, direction: 'top' }
      );
      aoiRectRef.current = aoiRect;
    }

    const beforeBounds = beforeScene.bbox 
      ? L.latLngBounds([beforeScene.bbox[1], beforeScene.bbox[0]], [beforeScene.bbox[3], beforeScene.bbox[2]])
      : aoiBounds;

    const afterBounds = afterScene.bbox 
      ? L.latLngBounds([afterScene.bbox[1], afterScene.bbox[0]], [afterScene.bbox[3], afterScene.bbox[2]])
      : aoiBounds;

    const beforeUrl = beforeScene.preview_url || `/api/sentinel2/preview/${beforeScene.id}`;
    const beforeOverlay = L.imageOverlay(beforeUrl, beforeBounds, {
      pane: 'beforePane',
      opacity: 0.95
    }).addTo(map);
    beforeOverlayRef.current = beforeOverlay;

    const afterUrl = afterScene.preview_url || `/api/sentinel2/preview/${afterScene.id}`;
    const afterOverlay = L.imageOverlay(afterUrl, afterBounds, {
      pane: 'afterPane',
      opacity: 0.95
    }).addTo(map);
    afterOverlayRef.current = afterOverlay;

    map.fitBounds(aoiBounds.pad(0.1), { duration: 0.6 });
  }, [beforeScene, afterScene, aoiBbox, showAoiBoundary]);

  // Load Built-Up Change Mask Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (maskOverlayRef.current) {
      map.removeLayer(maskOverlayRef.current);
      maskOverlayRef.current = null;
    }

    if (!showChangeOverlay || !analysis) return;

    const maskUrl = analysis.change_mask_url || (builtUpAnalysis ? `/api/change/built-up-mask/${builtUpAnalysis.analysis_id}` : null);
    if (!maskUrl) return;

    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    const aoiBounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);

    const maskOverlay = L.imageOverlay(maskUrl, aoiBounds, {
      pane: 'maskPane',
      opacity: 0.85
    }).addTo(map);

    maskOverlayRef.current = maskOverlay;
  }, [showChangeOverlay, analysis, builtUpAnalysis, aoiBbox]);

  // Render Interactive Candidate Vectors (Section 7)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    candidateLayersRef.current.forEach(layer => map.removeLayer(layer));
    candidateLayersRef.current.clear();

    if (!showCandidates || candidateList.length === 0) return;

    candidateList.forEach(cand => {
      const isSelected = cand.id === selectedCandidateId;
      const isPossibleConstruction = cand.type === 'possible_construction_candidate';
      const isBuiltUp = cand.type === 'built_up_change_candidate';
      const strokeColor = isSelected ? '#facc15' : isPossibleConstruction ? '#f97316' : isBuiltUp ? '#a855f7' : '#0284c7';
      const fillColor = isPossibleConstruction ? '#ea580c' : isBuiltUp ? '#9333ea' : '#0369a1';

      const typeLabel = cand.display_name || (isPossibleConstruction ? 'Possible Construction Activity' : isBuiltUp ? 'Built-up Change Candidate' : 'Spectral Change Candidate');
      const iconSymbol = isPossibleConstruction ? '🟧' : isBuiltUp ? '🟪' : '🟦';

      let layer: L.Layer;

      // Render actual polygon geometry if available
      if (cand.geometry?.coordinates?.[0] && cand.geometry.coordinates[0].length >= 4) {
        // Convert GeoJSON [lon, lat] coordinates to Leaflet [lat, lon]
        const latLngs = cand.geometry.coordinates.map(ring =>
          ring.map(pt => [pt[1], pt[0]] as [number, number])
        );

        layer = L.polygon(latLngs, {
          color: strokeColor,
          weight: isSelected ? 3.5 : 2,
          dashArray: isSelected ? undefined : '3, 3',
          fillColor: fillColor,
          fillOpacity: isSelected ? 0.45 : 0.25,
          className: isSelected ? 'candidate-selected-pulsing' : 'candidate-vector'
        }).addTo(map);
      } else {
        const [cMinLon, cMinLat, cMaxLon, cMaxLat] = cand.bounding_box;
        const bounds = L.latLngBounds([cMinLat, cMinLon], [cMaxLat, cMaxLon]);

        layer = L.rectangle(bounds, {
          color: strokeColor,
          weight: isSelected ? 3.5 : 2,
          dashArray: isSelected ? undefined : '3, 3',
          fillColor: fillColor,
          fillOpacity: isSelected ? 0.42 : 0.22,
          className: isSelected ? 'candidate-selected-pulsing' : 'candidate-vector'
        }).addTo(map);
      }

      const tooltipHtml = `
        <div class="p-1 font-sans text-xs">
          <div class="font-bold flex items-center gap-1.5" style="color: ${strokeColor};">
            <span>${iconSymbol}</span>
            <span>${cand.id} &bull; ${typeLabel}</span>
          </div>
          <div class="text-[11px] text-slate-700 mt-1 font-mono">
            Footprint: <strong class="text-slate-900">${cand.area_m2.toLocaleString()} m²</strong> (${(cand.area_m2 / 10000).toFixed(2)} ha)
          </div>
          <div class="text-[10px] text-slate-600 font-mono mt-0.5">
            Support: <strong class="text-slate-900">${cand.pixel_count}</strong> contiguous 10m pixels
          </div>
          <div class="text-[10px] text-slate-500 font-mono mt-0.5">
            &Delta;NDVI: ${cand.mean_delta_ndvi?.toFixed(3) ?? cand.delta_ndvi?.toFixed(3)} | &Delta;NDBI: +${cand.mean_delta_ndbi?.toFixed(3) ?? cand.delta_ndbi?.toFixed(3)}
          </div>
          <div class="text-[10px] text-teal-800 font-semibold mt-1 font-sans">
            Click to load in Evidence Spine &rarr;
          </div>
        </div>
      `;

      layer.bindTooltip(tooltipHtml, {
        sticky: true,
        direction: 'top',
        className: 'candidate-custom-tooltip'
      });

      layer.on('click', () => {
        if (onSelectCandidate) {
          onSelectCandidate(cand.id);
        }
      });

      candidateLayersRef.current.set(cand.id, layer);
    });
  }, [candidateList, selectedCandidateId, showCandidates, onSelectCandidate]);

  // Zoom to candidate when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCandidate) return;

    const [cMinLon, cMinLat, cMaxLon, cMaxLat] = selectedCandidate.bounding_box;
    const bounds = L.latLngBounds([cMinLat, cMinLon], [cMaxLat, cMaxLon]);

    map.flyToBounds(bounds.pad(0.35), {
      duration: 1.0,
      maxZoom: 14
    });
  }, [selectedCandidate]);

  // Draggable Slider Mouse / Touch Handlers
  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPercentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPosition(clampedPercentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSlider(true);
    handleSliderMove(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDraggingSlider(true);
      handleSliderMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) handleSliderMove(e.clientX);
    };
    const onMouseUp = () => setIsDraggingSlider(false);
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches.length > 0) handleSliderMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => setIsDraggingSlider(false);

    if (isDraggingSlider) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDraggingSlider, handleSliderMove]);

  // Map Controls (Section 6)
  const handleFitAoi = () => {
    const map = mapRef.current;
    if (!map) return;
    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    map.flyToBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [30, 30], duration: 0.8 });
  };

  const handleFitCandidate = () => {
    const map = mapRef.current;
    if (!map || !selectedCandidate) return;
    const [cMinLon, cMinLat, cMaxLon, cMaxLat] = selectedCandidate.bounding_box;
    map.flyToBounds([[cMinLat, cMinLon], [cMaxLat, cMaxLon]], { padding: [50, 50], maxZoom: 14, duration: 0.8 });
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleToggleBaseMap = () => {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    if (!map || !layers) return;

    if (activeBaseLayer === 'satellite') {
      map.removeLayer(layers.satellite);
      layers.osm.addTo(map);
      setActiveBaseLayer('osm');
    } else {
      map.removeLayer(layers.osm);
      layers.satellite.addTo(map);
      setActiveBaseLayer('satellite');
    }
  };

  return (
    <div className="relative w-full h-[620px] lg:h-[700px] rounded-md overflow-hidden border border-slate-200 shadow-xs bg-slate-950 select-none">
      {/* 1. Underlying Leaflet Map Canvas */}
      <div 
        ref={sliderContainerRef}
        className="w-full h-full relative cursor-grab active:cursor-grabbing"
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* 2. Draggable Vertical Swipe Divider Bar */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none transition-transform"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-[1.5px] h-full bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)] mx-auto" />
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-ew-resize w-8 h-8 rounded-full bg-white border border-slate-400 shadow-md flex items-center justify-center text-slate-800 hover:scale-105 active:scale-95 transition-transform"
            title="Drag horizontally to compare Before & After scenes"
          >
            <Sliders className="w-3.5 h-3.5 text-teal-800 rotate-90" />
          </div>
        </div>

        {/* 3. FLOATING MAP INSTRUMENT DOCK (Section 6) */}
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-2 pointer-events-auto">
          {/* Mode & Layer Dock */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded p-1 shadow-md flex items-center space-x-1 text-xs">
            {/* View Split Presets */}
            <div className="flex items-center bg-slate-100 rounded p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setSliderPosition(100)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sliderPosition >= 98 ? 'bg-teal-800 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View 100% Before Scene"
              >
                Before
              </button>
              <button
                type="button"
                onClick={() => setSliderPosition(50)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sliderPosition > 2 && sliderPosition < 98 ? 'bg-teal-800 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Split 50/50 View"
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setSliderPosition(0)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sliderPosition <= 2 ? 'bg-teal-800 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View 100% After Scene"
              >
                After
              </button>
            </div>

            <div className="w-px h-4 bg-slate-200 mx-0.5" />

            {/* Change Mask Toggle */}
            <button
              type="button"
              onClick={() => setShowChangeOverlay(!showChangeOverlay)}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                showChangeOverlay
                  ? 'bg-orange-50 text-orange-900 border border-orange-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle Change Mask Layer"
            >
              {showChangeOverlay ? <Eye className="w-3 h-3 text-orange-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
              <span className="hidden sm:inline">Mask</span>
            </button>

            {/* Candidate Toggle */}
            {candidateList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCandidates(!showCandidates)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  showCandidates
                    ? 'bg-purple-50 text-purple-900 border border-purple-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Toggle Candidate Vectors"
              >
                <Building2 className={`w-3 h-3 ${showCandidates ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Candidates ({candidateList.length})</span>
              </button>
            )}

            {/* AOI Boundary Toggle */}
            <button
              type="button"
              onClick={() => setShowAoiBoundary(!showAoiBoundary)}
              className={`px-1.5 py-1 rounded text-[11px] transition-colors ${
                showAoiBoundary ? 'text-teal-900 bg-teal-50' : 'text-slate-400 hover:bg-slate-100'
              }`}
              title="Toggle AOI Boundary"
            >
              <Maximize2 className="w-3 h-3" />
            </button>

            {/* Basemap Switcher */}
            <button
              type="button"
              onClick={handleToggleBaseMap}
              className="flex items-center space-x-1 px-2 py-1 rounded text-[11px] text-slate-700 hover:bg-slate-100 transition-colors"
              title="Toggle Satellite vs Street Basemap"
            >
              <Layers className="w-3 h-3 text-slate-500" />
              <span className="hidden md:inline font-mono">{activeBaseLayer === 'satellite' ? 'Sat' : 'OSM'}</span>
            </button>
          </div>
        </div>

        {/* 4. FLOATING MAP NAVIGATION TOOLS (Right side) */}
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded p-1 shadow-md flex flex-col space-y-1">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-colors"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="w-full h-px bg-slate-200" />
            <button
              type="button"
              onClick={handleFitAoi}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-colors"
              title="Reset View to AOI"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {selectedCandidate && (
              <button
                type="button"
                onClick={handleFitCandidate}
                className="p-1.5 rounded bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors"
                title="Focus Selected Candidate"
              >
                <Crosshair className="w-3.5 h-3.5 text-amber-700" />
              </button>
            )}
          </div>
        </div>

        {/* 5. FLOATING SCENE LABELS ON MAP */}
        {/* Before Scene Indicator (Left Edge) */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-xs text-white border border-slate-700/80 rounded px-2.5 py-1.5 shadow-md flex items-center space-x-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <div>
              <div className="text-[10px] text-slate-300 font-sans font-semibold">BEFORE BASELINE</div>
              <div className="text-[11px] font-bold text-white">
                {format(new Date(beforeScene.acquisition_date), 'yyyy-MM-dd')}
              </div>
            </div>
          </div>
        </div>

        {/* After Scene Indicator (Right Edge) */}
        <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-xs text-white border border-slate-700/80 rounded px-2.5 py-1.5 shadow-md flex items-center space-x-2 text-xs font-mono text-right">
            <div>
              <div className="text-[10px] text-slate-300 font-sans font-semibold">AFTER MONITORING</div>
              <div className="text-[11px] font-bold text-white">
                {format(new Date(afterScene.acquisition_date), 'yyyy-MM-dd')}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-sky-500" />
          </div>
        </div>

        {/* Center Split Percentage Tag */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-xs text-slate-800 border border-slate-200 rounded px-2 py-0.5 text-[10px] font-mono shadow-2xs">
            Split: {sliderPosition.toFixed(0)}% / {(100 - sliderPosition).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default SatelliteInvestigationMap;
