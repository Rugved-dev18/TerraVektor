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

      // Scientific nomenclature: Sentinel-2 10m surface-change footprints, not confirmed buildings
      const typeLabel = isPossibleConstruction 
        ? 'Potential New Construction' 
        : isBuiltUp 
        ? 'Detected Change Footprint' 
        : (cand.display_name || 'Detected Spectral Change');
      const iconSymbol = isPossibleConstruction ? '🟧' : isBuiltUp ? '🟪' : '🟦';

      const candidateGroup = L.featureGroup();

      // 1. Render actual candidate GeoJSON Polygon / MultiPolygon
      let hasGeometry = false;
      if (cand.geometry && cand.geometry.coordinates) {
        if (cand.geometry.type === 'Polygon' && Array.isArray(cand.geometry.coordinates[0]) && cand.geometry.coordinates[0].length >= 3) {
          const latLngs = (cand.geometry.coordinates as number[][][]).map(ring =>
            ring.map(pt => [pt[1], pt[0]] as [number, number])
          );

          const poly = L.polygon(latLngs, {
            color: strokeColor,
            weight: isSelected ? 2.5 : 1.5,
            dashArray: isSelected ? undefined : '3, 3',
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.35 : 0.12,
            className: isSelected ? 'candidate-selected-pulsing' : 'candidate-vector'
          });
          candidateGroup.addLayer(poly);
          hasGeometry = true;
        } else if (cand.geometry.type === 'MultiPolygon') {
          const multiLatLngs = (cand.geometry.coordinates as number[][][][]).map(poly =>
            poly.map(ring => ring.map(pt => [pt[1], pt[0]] as [number, number]))
          );

          const poly = L.polygon(multiLatLngs, {
            color: strokeColor,
            weight: isSelected ? 2.5 : 1.5,
            dashArray: isSelected ? undefined : '3, 3',
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.35 : 0.12,
            className: isSelected ? 'candidate-selected-pulsing' : 'candidate-vector'
          });
          candidateGroup.addLayer(poly);
          hasGeometry = true;
        }
      }

      // 2. Render individual 10m detected change pixel footprints (10m x 10m ≈ 100 m² per pixel)
      const pixelCoords = cand.pixel_coordinates || (cand as any).pixelCoords;
      if (Array.isArray(pixelCoords) && pixelCoords.length > 0) {
        const halfPixelDeg = 0.000045; // ~5m half-width in degrees for Sentinel-2 10m grid
        pixelCoords.forEach(pc => {
          const pxBounds = L.latLngBounds(
            [pc.lat - halfPixelDeg, pc.lon - halfPixelDeg],
            [pc.lat + halfPixelDeg, pc.lon + halfPixelDeg]
          );
          const pxRect = L.rectangle(pxBounds, {
            color: strokeColor,
            weight: 0.75,
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.45 : 0.18,
            interactive: false
          });
          candidateGroup.addLayer(pxRect);
        });
        hasGeometry = true;
      }

      // If no polygon or pixels available, create a tight 10m cell from centroid (never the large bbox!)
      if (!hasGeometry && cand.centroid) {
        const halfPixelDeg = 0.000045;
        const cellBounds = L.latLngBounds(
          [cand.centroid[1] - halfPixelDeg * 2, cand.centroid[0] - halfPixelDeg * 2],
          [cand.centroid[1] + halfPixelDeg * 2, cand.centroid[0] + halfPixelDeg * 2]
        );
        const cell = L.rectangle(cellBounds, {
          color: strokeColor,
          weight: isSelected ? 2.5 : 1.5,
          fillColor: fillColor,
          fillOpacity: isSelected ? 0.35 : 0.12
        });
        candidateGroup.addLayer(cell);
      }

      // 3. Candidate Label / Tooltip
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
            Support: <strong class="text-slate-900">${cand.pixel_count}</strong> contiguous 10m Sentinel-2 pixels
          </div>
          <div class="text-[10px] text-slate-500 font-mono mt-0.5">
            &Delta;NDVI: ${cand.mean_delta_ndvi?.toFixed(3) ?? cand.delta_ndvi?.toFixed(3)} | &Delta;NDBI: +${cand.mean_delta_ndbi?.toFixed(3) ?? cand.delta_ndbi?.toFixed(3)}
          </div>
          <div class="text-[10px] text-teal-800 font-semibold mt-1 font-sans">
            Click to load in Evidence Spine &rarr;
          </div>
        </div>
      `;

      candidateGroup.bindTooltip(tooltipHtml, {
        sticky: true,
        direction: 'top',
        className: 'candidate-custom-tooltip'
      });

      // Floating badge on selected candidate
      if (isSelected && cand.centroid) {
        const badgeIcon = L.divIcon({
          className: 'candidate-active-badge-marker',
          html: `<div style="background: rgba(15,23,42,0.92); color: #facc15; border: 1px solid #facc15; font-family: monospace; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.4); transform: translate(-50%, -100%); margin-top: -8px;">
            <span>${cand.id}: ${typeLabel} (${cand.pixel_count} px &bull; ${(cand.area_m2 / 10000).toFixed(2)} ha)</span>
          </div>`,
          iconSize: [0, 0]
        });
        const marker = L.marker([cand.centroid[1], cand.centroid[0]], { icon: badgeIcon, interactive: false });
        candidateGroup.addLayer(marker);
      }

      candidateGroup.on('click', () => {
        if (onSelectCandidate) {
          onSelectCandidate(cand.id);
        }
      });

      candidateGroup.addTo(map);
      candidateLayersRef.current.set(cand.id, candidateGroup);
    });
  }, [candidateList, selectedCandidateId, showCandidates, onSelectCandidate]);

  // Zoom to candidate actual geometry when selection changes (Section 7)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCandidate) return;

    // Prefer zooming to the actual candidate geometry bounds
    let targetBounds: L.LatLngBounds | null = null;

    const layerGroup = candidateLayersRef.current.get(selectedCandidate.id);
    if (layerGroup && typeof (layerGroup as any).getBounds === 'function') {
      const gb = (layerGroup as any).getBounds();
      if (gb && gb.isValid()) {
        targetBounds = gb;
      }
    }

    if (!targetBounds && selectedCandidate.geometry?.coordinates) {
      try {
        const coords = selectedCandidate.geometry.type === 'MultiPolygon'
          ? (selectedCandidate.geometry.coordinates as any[]).flat(2)
          : (selectedCandidate.geometry.coordinates as any[]).flat(1);
        if (coords.length > 0) {
          const latLngs = coords.map((pt: number[]) => L.latLng(pt[1], pt[0]));
          targetBounds = L.latLngBounds(latLngs);
        }
      } catch {
        // Fallback to centroid
      }
    }

    if (targetBounds && targetBounds.isValid()) {
      map.flyToBounds(targetBounds.pad(0.6), {
        duration: 1.0,
        maxZoom: 18
      });
    } else if (selectedCandidate.centroid) {
      map.flyTo([selectedCandidate.centroid[1], selectedCandidate.centroid[0]], 17, {
        duration: 1.0
      });
    }
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
      {/* 1. Underlying Leaflet Map Canvas with isolated stacking context */}
      <div 
        ref={sliderContainerRef}
        className="w-full h-full relative cursor-grab active:cursor-grabbing"
      >
        <div ref={mapContainerRef} className="w-full h-full relative z-0 isolate" />

        {/* 2. Draggable Vertical Swipe Divider Bar */}
        <div
          className="absolute top-0 bottom-0 z-[1040] pointer-events-none transition-transform"
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
        <div className="absolute top-3 left-3 z-[1050] flex flex-col gap-2 pointer-events-auto">
          {/* Mode & Layer Dock */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-md p-1.5 shadow-lg flex items-center space-x-1.5 text-xs">
            {/* View Split Presets: Before / Split / After buttons */}
            <div className="flex items-center bg-slate-100 rounded p-0.5 text-xs font-medium border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setSliderPosition(100)}
                className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 ${
                  sliderPosition >= 98
                    ? 'bg-teal-800 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 font-semibold'
                }`}
                title="View 100% Before Scene"
              >
                <span className={`w-2 h-2 rounded-full ${sliderPosition >= 98 ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                <span>Before</span>
              </button>
              <button
                type="button"
                onClick={() => setSliderPosition(50)}
                className={`px-3 py-1 rounded transition-all flex items-center gap-1 ${
                  sliderPosition > 2 && sliderPosition < 98
                    ? 'bg-teal-800 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 font-semibold'
                }`}
                title="Split 50/50 View"
              >
                <Sliders className="w-3 h-3 rotate-90" />
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => setSliderPosition(0)}
                className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 ${
                  sliderPosition <= 2
                    ? 'bg-teal-800 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 font-semibold'
                }`}
                title="View 100% After Scene"
              >
                <span>After</span>
                <span className={`w-2 h-2 rounded-full ${sliderPosition <= 2 ? 'bg-sky-400' : 'bg-sky-600'}`} />
              </button>
            </div>

            <div className="w-px h-5 bg-slate-300 mx-0.5" />

            {/* Change Mask Toggle */}
            <button
              type="button"
              onClick={() => setShowChangeOverlay(!showChangeOverlay)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                showChangeOverlay
                  ? 'bg-orange-50 text-orange-900 border border-orange-300 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Toggle Change Mask Layer"
            >
              {showChangeOverlay ? <Eye className="w-3.5 h-3.5 text-orange-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">Mask</span>
            </button>

            {/* Candidate Toggle */}
            {candidateList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCandidates(!showCandidates)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  showCandidates
                    ? 'bg-purple-50 text-purple-900 border border-purple-300 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Toggle Candidate Vectors"
              >
                <Building2 className={`w-3.5 h-3.5 ${showCandidates ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Candidates ({candidateList.length})</span>
              </button>
            )}

            {/* AOI Boundary Toggle */}
            <button
              type="button"
              onClick={() => setShowAoiBoundary(!showAoiBoundary)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                showAoiBoundary ? 'text-teal-900 bg-teal-50 border border-teal-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
              title="Toggle AOI Boundary"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Basemap Switcher */}
            <button
              type="button"
              onClick={handleToggleBaseMap}
              className="flex items-center space-x-1 px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium"
              title="Toggle Satellite vs Street Basemap"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline font-mono">{activeBaseLayer === 'satellite' ? 'Sat' : 'OSM'}</span>
            </button>
          </div>
        </div>

        {/* 4. FLOATING MAP NAVIGATION TOOLS (Right side) */}
        <div className="absolute top-3 right-3 z-[1050] flex flex-col gap-1.5 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-md p-1 shadow-lg flex flex-col space-y-1">
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
        <div className="absolute bottom-3 left-3 z-[1030] pointer-events-auto">
          <button
            type="button"
            onClick={() => setSliderPosition(100)}
            className={`bg-slate-900/95 hover:bg-slate-800/95 backdrop-blur-xs text-white border transition-all rounded px-2.5 py-1.5 shadow-md flex items-center space-x-2 text-xs font-mono cursor-pointer ${
              sliderPosition >= 98 ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-slate-800' : 'border-slate-700/80'
            }`}
            title="Click to view 100% Before Scene"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-slate-300 font-sans font-semibold">BEFORE BASELINE</div>
              <div className="text-[11px] font-bold text-white">
                {format(new Date(beforeScene.acquisition_date), 'yyyy-MM-dd')}
              </div>
            </div>
          </button>
        </div>

        {/* After Scene Indicator (Right Edge) */}
        <div className="absolute bottom-3 right-3 z-[1030] pointer-events-auto">
          <button
            type="button"
            onClick={() => setSliderPosition(0)}
            className={`bg-slate-900/95 hover:bg-slate-800/95 backdrop-blur-xs text-white border transition-all rounded px-2.5 py-1.5 shadow-md flex items-center space-x-2 text-xs font-mono text-right cursor-pointer ${
              sliderPosition <= 2 ? 'border-sky-400 ring-2 ring-sky-400/40 bg-slate-800' : 'border-slate-700/80'
            }`}
            title="Click to view 100% After Scene"
          >
            <div className="text-right">
              <div className="text-[10px] text-slate-300 font-sans font-semibold">AFTER MONITORING</div>
              <div className="text-[11px] font-bold text-white">
                {format(new Date(afterScene.acquisition_date), 'yyyy-MM-dd')}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
          </button>
        </div>

        {/* Center Split Percentage Tag */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1030] pointer-events-auto">
          <button
            type="button"
            onClick={() => setSliderPosition(50)}
            className="bg-white/95 hover:bg-white backdrop-blur-xs text-slate-800 border border-slate-300 rounded px-2.5 py-1 text-[11px] font-mono shadow-md cursor-pointer transition-colors hover:text-teal-900"
            title="Click to reset to 50/50 Split View"
          >
            Split: {sliderPosition.toFixed(0)}% / {(100 - sliderPosition).toFixed(0)}%
          </button>
        </div>
      </div>
    </div>
  );
};

export default SatelliteInvestigationMap;
