import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, EyeOff, Layers, Maximize2, Sliders, Building2, Crosshair, Plus, Minus, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { simplify as turfSimplify } from '@turf/simplify';
import { polygon as turfPolygon } from '@turf/helpers';
import { MapColorFilters, getMapColorFilterStyle } from '../../../components/MapColorFilters';
import { MapColorModeSelector } from '../../../components/MapColorModeSelector';
/**
 * Traces the contiguous geographic boundary contour of a connected pixel component.
 * Converts individual 10m grid cells into a single closed GeoJSON/Leaflet polygon ring
 * without creating separate pixel squares or smoothing/rounding the authentic 10m geometry.
 */
function traceCandidatePixelFootprint(pixelCoords) {
    if (!pixelCoords || pixelCoords.length === 0)
        return null;
    const half = 0.000045; // ~5m half-width for Sentinel-2 10m pixel
    if (pixelCoords.length === 1) {
        const p = pixelCoords[0];
        return [[
                [p.lat - half, p.lon - half],
                [p.lat + half, p.lon - half],
                [p.lat + half, p.lon + half],
                [p.lat - half, p.lon + half],
                [p.lat - half, p.lon - half]
            ]];
    }
    let minLon = Infinity, minLat = Infinity;
    for (const p of pixelCoords) {
        if (p.lon < minLon)
            minLon = p.lon;
        if (p.lat < minLat)
            minLat = p.lat;
    }
    let stepLon = 0.00009, stepLat = 0.00009;
    for (let i = 0; i < pixelCoords.length; i++) {
        for (let j = i + 1; j < pixelCoords.length; j++) {
            const dLon = Math.abs(pixelCoords[i].lon - pixelCoords[j].lon);
            const dLat = Math.abs(pixelCoords[i].lat - pixelCoords[j].lat);
            if (dLon > 0.00002 && dLon < stepLon)
                stepLon = dLon;
            if (dLat > 0.00002 && dLat < stepLat)
                stepLat = dLat;
        }
    }
    const cells = new Set();
    const cellList = [];
    for (const p of pixelCoords) {
        const gx = Math.round((p.lon - minLon) / stepLon);
        const gy = Math.round((p.lat - minLat) / stepLat);
        const key = `${gx},${gy}`;
        if (!cells.has(key)) {
            cells.add(key);
            cellList.push([gx, gy]);
        }
    }
    const edges = new Map();
    function addEdge(start, end) {
        let arr = edges.get(start);
        if (!arr) {
            arr = [];
            edges.set(start, arr);
        }
        arr.push(end);
    }
    for (const [gx, gy] of cellList) {
        if (!cells.has(`${gx},${gy - 1}`))
            addEdge(`${gx},${gy}`, `${gx + 1},${gy}`);
        if (!cells.has(`${gx + 1},${gy}`))
            addEdge(`${gx + 1},${gy}`, `${gx + 1},${gy + 1}`);
        if (!cells.has(`${gx},${gy + 1}`))
            addEdge(`${gx + 1},${gy + 1}`, `${gx},${gy + 1}`);
        if (!cells.has(`${gx - 1},${gy}`))
            addEdge(`${gx},${gy + 1}`, `${gx},${gy}`);
    }
    const rings = [];
    for (const [startPoint, targets] of edges.entries()) {
        while (targets.length > 0) {
            const ring = [];
            let curr = startPoint;
            let next = targets.pop();
            const [sx, sy] = curr.split(',').map(Number);
            ring.push([sx, sy]);
            let maxSteps = cellList.length * 8 + 32;
            while (next && maxSteps-- > 0) {
                const [nx, ny] = next.split(',').map(Number);
                ring.push([nx, ny]);
                if (next === startPoint)
                    break;
                const nextTargets = edges.get(next);
                if (nextTargets && nextTargets.length > 0) {
                    curr = next;
                    next = nextTargets.pop();
                }
                else
                    break;
            }
            if (ring.length >= 4) {
                // Collinear simplification along horizontal and vertical grid segments
                const simplified = [ring[0]];
                for (let i = 1; i < ring.length - 1; i++) {
                    const prev = simplified[simplified.length - 1];
                    const c = ring[i];
                    const n = ring[i + 1];
                    const dx1 = c[0] - prev[0];
                    const dy1 = c[1] - prev[1];
                    const dx2 = n[0] - c[0];
                    const dy2 = n[1] - c[1];
                    if (dx1 * dy2 !== dx2 * dy1) {
                        simplified.push(c);
                    }
                }
                simplified.push(ring[ring.length - 1]);
                const latLngRing = simplified.map(([vx, vy]) => [
                    minLat + (vy - 0.5) * stepLat,
                    minLon + (vx - 0.5) * stepLon
                ]);
                // Turf.js geometry simplification: Convert blocky 10m pixel clusters into cleaner GeoJSON polygons
                let finalLatLngRing = latLngRing;
                try {
                    if (latLngRing.length >= 4) {
                        const geoRing = latLngRing.map(([lat, lon]) => [lon, lat]);
                        const polyFeature = turfPolygon([geoRing]);
                        const turfResult = turfSimplify(polyFeature, { tolerance: 0.00005, highQuality: true, mutate: false });
                        if (turfResult?.geometry?.coordinates?.[0]?.length >= 4) {
                            finalLatLngRing = turfResult.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
                        }
                    }
                }
                catch {
                    // Fall back to collinear-simplified latLngRing if Turf fails
                }
                rings.push(finalLatLngRing);
            }
        }
    }
    return rings.length > 0 ? rings : null;
}
export const SatelliteInvestigationMap = ({ beforeScene, afterScene, aoiBbox, analysis, selectedCandidateId, onSelectCandidate }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const sliderContainerRef = useRef(null);
    // Panes
    const beforePaneRef = useRef(null);
    const afterPaneRef = useRef(null);
    const maskPaneRef = useRef(null);
    // Layers
    const baseLayersRef = useRef(null);
    const beforeOverlayRef = useRef(null);
    const afterOverlayRef = useRef(null);
    const maskOverlayRef = useRef(null);
    const aoiRectRef = useRef(null);
    const candidateLayersRef = useRef(new Map());
    // Component state
    const [mapColorMode, setMapColorMode] = useState('optical-rgb');
    const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const [showChangeOverlay, setShowChangeOverlay] = useState(true);
    const [showCandidates, setShowCandidates] = useState(true);
    const [showAoiBoundary, setShowAoiBoundary] = useState(true);
    const [activeBaseLayer, setActiveBaseLayer] = useState('satellite');
    // Loading and error states for real Sentinel-2 imagery
    const [isBeforeLoading, setIsBeforeLoading] = useState(true);
    const [beforeError, setBeforeError] = useState(false);
    const [isAfterLoading, setIsAfterLoading] = useState(true);
    const [afterError, setAfterError] = useState(false);
    // Extract candidate regions if built-up analysis
    const builtUpAnalysis = analysis && 'classification' in analysis && analysis.classification === 'built_up_change'
        ? analysis
        : null;
    const candidateList = builtUpAnalysis?.candidates || [];
    const selectedCandidate = candidateList.find(c => c.id === selectedCandidateId) || null;
    // Initialize Map and Leaflet Panes
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current)
            return;
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
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Esri World Imagery'
        });
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
    const applyPaneClips = useCallback((pos) => {
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
    // Apply Map Color Changing Mode (Optical RGB, C-Band SAR, False Colour NIR)
    useEffect(() => {
        const filterStyle = getMapColorFilterStyle(mapColorMode);
        // Apply filter to Before and After Panes
        [beforePaneRef.current, afterPaneRef.current].forEach(pane => {
            if (pane) {
                pane.style.filter = filterStyle.filter;
                pane.style.WebkitFilter = filterStyle.WebkitFilter;
            }
        });
        // Also apply to basemap tile pane
        if (mapRef.current) {
            const tilePane = mapRef.current.getPane('tilePane');
            if (tilePane) {
                tilePane.style.filter = filterStyle.filter;
                tilePane.style.WebkitFilter = filterStyle.WebkitFilter;
            }
        }
    }, [mapColorMode]);
    // Load Imagery Overlays and AOI Boundary
    useEffect(() => {
        const map = mapRef.current;
        if (!map)
            return;
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
            aoiRect.bindTooltip(`<div class="text-[10px] font-mono text-teal-900 font-semibold">AOI Grid</div>
         <div class="text-[9px] text-slate-500 font-mono">${minLat.toFixed(3)}°N, ${minLon.toFixed(3)}°E to ${maxLat.toFixed(3)}°N, ${maxLon.toFixed(3)}°E</div>`, { permanent: false, direction: 'top' });
            aoiRectRef.current = aoiRect;
        }
        const beforeBounds = beforeScene.bbox
            ? L.latLngBounds([beforeScene.bbox[1], beforeScene.bbox[0]], [beforeScene.bbox[3], beforeScene.bbox[2]])
            : aoiBounds;
        const hasUsableAfter = Boolean(afterScene && (afterScene.cloud_cover ?? 0) <= 35 && afterScene.id);
        const afterBounds = afterScene?.bbox
            ? L.latLngBounds([afterScene.bbox[1], afterScene.bbox[0]], [afterScene.bbox[3], afterScene.bbox[2]])
            : aoiBounds;
        const beforeUrl = beforeScene.preview_url || `/api/sentinel2/preview/${beforeScene.id}`;
        const afterUrl = afterScene?.preview_url || (afterScene?.id ? `/api/sentinel2/preview/${afterScene.id}` : '');
        setIsBeforeLoading(true);
        setBeforeError(false);
        setIsAfterLoading(true);
        setAfterError(false);
        const beforeOverlay = L.imageOverlay(beforeUrl, beforeBounds, {
            pane: 'beforePane',
            opacity: 0.95
        }).addTo(map);
        beforeOverlay.on('load', () => {
            setIsBeforeLoading(false);
            setBeforeError(false);
        });
        beforeOverlay.on('error', () => {
            setIsBeforeLoading(false);
            setBeforeError(true);
        });
        beforeOverlayRef.current = beforeOverlay;
        if (hasUsableAfter && afterUrl) {
            const afterOverlay = L.imageOverlay(afterUrl, afterBounds, {
                pane: 'afterPane',
                opacity: 0.95
            }).addTo(map);
            afterOverlay.on('load', () => {
                setIsAfterLoading(false);
                setAfterError(false);
            });
            afterOverlay.on('error', () => {
                setIsAfterLoading(false);
                setAfterError(true);
            });
            afterOverlayRef.current = afterOverlay;
        }
        else {
            setIsAfterLoading(false);
            setAfterError(true);
        }
        map.fitBounds(aoiBounds.pad(0.1), { duration: 0.6 });
    }, [beforeScene, afterScene, aoiBbox, showAoiBoundary]);
    // Load Built-Up Change Mask Overlay
    useEffect(() => {
        const map = mapRef.current;
        if (!map)
            return;
        if (maskOverlayRef.current) {
            map.removeLayer(maskOverlayRef.current);
            maskOverlayRef.current = null;
        }
        if (!showChangeOverlay || !analysis)
            return;
        const maskUrl = analysis.change_mask_url || (builtUpAnalysis ? `/api/change/built-up-mask/${builtUpAnalysis.analysis_id}` : null);
        if (!maskUrl)
            return;
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
        if (!map)
            return;
        candidateLayersRef.current.forEach(layer => map.removeLayer(layer));
        candidateLayersRef.current.clear();
        if (!showCandidates || candidateList.length === 0)
            return;
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
            // 1. Convert each connected candidate pixel component into a geographic polygon/GeoJSON Polygon or MultiPolygon
            // and render the resulting polygon geometry on Leaflet instead of drawing individual 10m pixel rectangles.
            let hasGeometry = false;
            let polygonLatLngs = null;
            if (cand.geometry && cand.geometry.coordinates) {
                if (cand.geometry.type === 'Polygon' && Array.isArray(cand.geometry.coordinates[0]) && cand.geometry.coordinates[0].length >= 3) {
                    polygonLatLngs = cand.geometry.coordinates.map(ring => ring.map(pt => [pt[1], pt[0]]));
                }
                else if (cand.geometry.type === 'MultiPolygon' && Array.isArray(cand.geometry.coordinates)) {
                    polygonLatLngs = cand.geometry.coordinates.map(poly => poly.map(ring => ring.map(pt => [pt[1], pt[0]])));
                }
            }
            // If geometry was not provided or empty, convert the connected pixel component into a geographic polygon
            const pixelCoords = cand.pixel_coordinates || cand.pixelCoords;
            if (!polygonLatLngs && Array.isArray(pixelCoords) && pixelCoords.length > 0) {
                const tracedRings = traceCandidatePixelFootprint(pixelCoords);
                if (tracedRings && tracedRings.length > 0) {
                    polygonLatLngs = tracedRings;
                }
            }
            if (polygonLatLngs && polygonLatLngs.length > 0) {
                const poly = L.polygon(polygonLatLngs, {
                    color: strokeColor,
                    weight: isSelected ? 2.5 : 1.75,
                    dashArray: undefined,
                    fillColor: fillColor,
                    fillOpacity: isSelected ? 0.40 : 0.25,
                    className: isSelected ? 'candidate-selected-pulsing cursor-pointer' : 'candidate-vector cursor-pointer',
                    interactive: true
                });
                poly.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (onSelectCandidate) {
                        onSelectCandidate(cand.id);
                    }
                });
                candidateGroup.addLayer(poly);
                hasGeometry = true;
            }
            else if (cand.centroid) {
                // Fallback: If no polygon or pixels available, create a tight 10m cell from centroid (never the large bbox!)
                const halfPixelDeg = 0.000045;
                const cellBounds = L.latLngBounds([cand.centroid[1] - halfPixelDeg, cand.centroid[0] - halfPixelDeg], [cand.centroid[1] + halfPixelDeg, cand.centroid[0] + halfPixelDeg]);
                const cell = L.rectangle(cellBounds, {
                    color: strokeColor,
                    weight: isSelected ? 2.5 : 1.5,
                    fillColor: fillColor,
                    fillOpacity: isSelected ? 0.35 : 0.15,
                    className: isSelected ? 'candidate-selected-pulsing cursor-pointer' : 'candidate-vector cursor-pointer',
                    interactive: true
                });
                cell.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (onSelectCandidate) {
                        onSelectCandidate(cand.id);
                    }
                });
                candidateGroup.addLayer(cell);
                hasGeometry = true;
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
        if (!map || !selectedCandidate)
            return;
        // Prefer zooming to the actual candidate geometry bounds
        let targetBounds = null;
        const layerGroup = candidateLayersRef.current.get(selectedCandidate.id);
        if (layerGroup && typeof layerGroup.getBounds === 'function') {
            const gb = layerGroup.getBounds();
            if (gb && gb.isValid()) {
                targetBounds = gb;
            }
        }
        if (!targetBounds && selectedCandidate.geometry?.coordinates) {
            try {
                const coords = selectedCandidate.geometry.type === 'MultiPolygon'
                    ? selectedCandidate.geometry.coordinates.flat(2)
                    : selectedCandidate.geometry.coordinates.flat(1);
                if (coords.length > 0) {
                    const latLngs = coords.map((pt) => L.latLng(pt[1], pt[0]));
                    targetBounds = L.latLngBounds(latLngs);
                }
            }
            catch {
                // Fallback to centroid
            }
        }
        if (targetBounds && targetBounds.isValid()) {
            map.flyToBounds(targetBounds.pad(0.6), {
                duration: 1.0,
                maxZoom: 18
            });
        }
        else if (selectedCandidate.centroid) {
            map.flyTo([selectedCandidate.centroid[1], selectedCandidate.centroid[0]], 17, {
                duration: 1.0
            });
        }
    }, [selectedCandidate]);
    // Draggable Slider Mouse / Touch Handlers
    const handleSliderMove = useCallback((clientX) => {
        if (!sliderContainerRef.current)
            return;
        const rect = sliderContainerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const clampedPercentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
        setSliderPosition(clampedPercentage);
    }, []);
    const handleMouseDown = (e) => {
        setIsDraggingSlider(true);
        handleSliderMove(e.clientX);
    };
    const handleTouchStart = (e) => {
        if (e.touches.length > 0) {
            setIsDraggingSlider(true);
            handleSliderMove(e.touches[0].clientX);
        }
    };
    useEffect(() => {
        const onMouseMove = (e) => {
            if (isDraggingSlider)
                handleSliderMove(e.clientX);
        };
        const onMouseUp = () => setIsDraggingSlider(false);
        const onTouchMove = (e) => {
            if (isDraggingSlider && e.touches.length > 0)
                handleSliderMove(e.touches[0].clientX);
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
        if (!map)
            return;
        const [minLon, minLat, maxLon, maxLat] = aoiBbox;
        map.flyToBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [30, 30], duration: 0.8 });
    };
    const handleFitCandidate = () => {
        const map = mapRef.current;
        if (!map || !selectedCandidate)
            return;
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
        if (!map || !layers)
            return;
        if (activeBaseLayer === 'satellite') {
            map.removeLayer(layers.satellite);
            layers.osm.addTo(map);
            setActiveBaseLayer('osm');
        }
        else {
            map.removeLayer(layers.osm);
            layers.satellite.addTo(map);
            setActiveBaseLayer('satellite');
        }
    };
    return (_jsxs("div", { className: "relative w-full h-[620px] lg:h-[700px] rounded-md overflow-hidden border border-slate-200 shadow-xs bg-slate-950 select-none", children: [_jsx(MapColorFilters, {}), _jsxs("div", { ref: sliderContainerRef, className: "w-full h-full relative cursor-grab active:cursor-grabbing", children: [_jsx("div", { ref: mapContainerRef, className: "w-full h-full relative z-0 isolate" }), _jsxs("div", { className: "absolute top-0 bottom-0 z-[1040] pointer-events-none transition-transform", style: { left: `${sliderPosition}%`, transform: 'translateX(-50%)' }, children: [_jsx("div", { className: "w-[1.5px] h-full bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)] mx-auto" }), _jsx("div", { onMouseDown: handleMouseDown, onTouchStart: handleTouchStart, className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-ew-resize w-8 h-8 rounded-full bg-white border border-slate-400 shadow-md flex items-center justify-center text-slate-800 hover:scale-105 active:scale-95 transition-transform", title: "Drag horizontally to compare Before & After scenes", children: _jsx(Sliders, { className: "w-3.5 h-3.5 text-teal-800 rotate-90" }) })] }), _jsxs("div", { className: "absolute top-3 left-3 z-[1050] flex flex-col gap-2 pointer-events-auto max-w-[calc(100%-80px)]", children: [_jsx("div", { className: "flex items-center gap-2 flex-wrap", children: _jsx(MapColorModeSelector, { currentMode: mapColorMode, onModeChange: setMapColorMode }) }), _jsxs("div", { className: "bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-md p-1.5 shadow-lg flex items-center space-x-1.5 text-xs flex-wrap", children: [_jsxs("div", { className: "flex items-center bg-slate-100 rounded p-0.5 text-xs font-medium border border-slate-200 shadow-xs", children: [_jsxs("button", { type: "button", onClick: () => setSliderPosition(100), className: `px-3 py-1 rounded transition-all flex items-center gap-1.5 ${sliderPosition >= 98
                                                    ? 'bg-teal-800 text-white font-bold shadow-xs'
                                                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 font-semibold'}`, title: "View 100% Before Scene", children: [_jsx("span", { className: `w-2 h-2 rounded-full ${sliderPosition >= 98 ? 'bg-emerald-400' : 'bg-emerald-600'}` }), _jsx("span", { children: "Before" })] }), _jsxs("button", { type: "button", onClick: () => setSliderPosition(50), className: `px-3 py-1 rounded transition-all flex items-center gap-1 ${sliderPosition > 2 && sliderPosition < 98
                                                    ? 'bg-teal-800 text-white font-bold shadow-xs'
                                                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 font-semibold'}`, title: "Split 50/50 View", children: [_jsx(Sliders, { className: "w-3 h-3 rotate-90" }), _jsx("span", { children: "Split" })] }), _jsxs("button", { type: "button", onClick: () => setSliderPosition(0), className: `px-3 py-1 rounded transition-all flex items-center gap-1.5 ${sliderPosition <= 2
                                                    ? 'bg-teal-800 text-white font-bold shadow-xs'
                                                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 font-semibold'}`, title: "View 100% After Scene", children: [_jsx("span", { children: "After" }), _jsx("span", { className: `w-2 h-2 rounded-full ${sliderPosition <= 2 ? 'bg-sky-400' : 'bg-sky-600'}` })] })] }), _jsx("div", { className: "w-px h-5 bg-slate-300 mx-0.5" }), _jsxs("button", { type: "button", onClick: () => setShowChangeOverlay(!showChangeOverlay), className: `flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${showChangeOverlay
                                            ? 'bg-orange-50 text-orange-900 border border-orange-300 shadow-2xs'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`, title: "Toggle Change Mask Layer", children: [showChangeOverlay ? _jsx(Eye, { className: "w-3.5 h-3.5 text-orange-600" }) : _jsx(EyeOff, { className: "w-3.5 h-3.5 text-slate-400" }), _jsx("span", { className: "hidden sm:inline", children: "Mask" })] }), candidateList.length > 0 && (_jsxs("button", { type: "button", onClick: () => setShowCandidates(!showCandidates), className: `flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${showCandidates
                                            ? 'bg-purple-50 text-purple-900 border border-purple-300 shadow-2xs'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`, title: "Toggle Candidate Vectors", children: [_jsx(Building2, { className: `w-3.5 h-3.5 ${showCandidates ? 'text-purple-600' : 'text-slate-400'}` }), _jsxs("span", { className: "hidden sm:inline", children: ["Candidates (", candidateList.length, ")"] })] })), _jsx("button", { type: "button", onClick: () => setShowAoiBoundary(!showAoiBoundary), className: `px-2 py-1 rounded text-xs transition-colors ${showAoiBoundary ? 'text-teal-900 bg-teal-50 border border-teal-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`, title: "Toggle AOI Boundary", children: _jsx(Maximize2, { className: "w-3.5 h-3.5" }) }), _jsxs("button", { type: "button", onClick: handleToggleBaseMap, className: "flex items-center space-x-1 px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium", title: "Toggle Satellite vs Street Basemap", children: [_jsx(Layers, { className: "w-3.5 h-3.5 text-slate-500" }), _jsx("span", { className: "hidden md:inline font-mono", children: activeBaseLayer === 'satellite' ? 'Sat' : 'OSM' })] }), (isBeforeLoading || isAfterLoading) && (_jsxs("div", { className: "flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-mono text-teal-800 bg-teal-50 border border-teal-200", children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin text-teal-700" }), _jsx("span", { className: "hidden sm:inline", children: "Loading S2 Imagery..." })] }))] })] }), (beforeError || afterError || !afterScene || (afterScene && afterScene.cloud_cover > 35)) && (_jsx("div", { className: "absolute top-14 left-1/2 -translate-x-1/2 z-[1040] pointer-events-none", children: _jsxs("div", { className: "bg-rose-950/90 text-rose-200 border border-rose-500/60 rounded px-3 py-1.5 text-xs font-mono flex items-center space-x-2 shadow-lg backdrop-blur-xs", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-rose-400 shrink-0" }), _jsx("span", { children: beforeError && (afterError || !afterScene || afterScene.cloud_cover > 35)
                                        ? 'Sentinel-2 preview unavailable for both scenes'
                                        : beforeError
                                            ? 'Baseline Sentinel-2 preview unavailable'
                                            : 'No usable monitoring scene available' })] }) })), _jsx("div", { className: "absolute top-3 right-3 z-[1050] flex flex-col gap-1.5 pointer-events-auto", children: _jsxs("div", { className: "bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-md p-1 shadow-lg flex flex-col space-y-1", children: [_jsx("button", { type: "button", onClick: handleZoomIn, className: "p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-colors", title: "Zoom In", children: _jsx(Plus, { className: "w-3.5 h-3.5" }) }), _jsx("button", { type: "button", onClick: handleZoomOut, className: "p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-colors", title: "Zoom Out", children: _jsx(Minus, { className: "w-3.5 h-3.5" }) }), _jsx("div", { className: "w-full h-px bg-slate-200" }), _jsx("button", { type: "button", onClick: handleFitAoi, className: "p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-colors", title: "Reset View to AOI", children: _jsx(RotateCcw, { className: "w-3.5 h-3.5" }) }), selectedCandidate && (_jsx("button", { type: "button", onClick: handleFitCandidate, className: "p-1.5 rounded bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors", title: "Focus Selected Candidate", children: _jsx(Crosshair, { className: "w-3.5 h-3.5 text-amber-700" }) }))] }) }), _jsx("div", { className: "absolute bottom-3 left-3 z-[1030] pointer-events-auto", children: _jsxs("button", { type: "button", onClick: () => setSliderPosition(100), className: `bg-slate-900/95 hover:bg-slate-800/95 backdrop-blur-xs text-white border transition-all rounded px-2.5 py-1.5 shadow-md flex items-center space-x-2 text-xs font-mono cursor-pointer ${sliderPosition >= 98 ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-slate-800' : 'border-slate-700/80'}`, title: "Click to view 100% Before Scene", children: [_jsx("span", { className: `w-2 h-2 rounded-full shrink-0 ${beforeError ? 'bg-rose-500' : isBeforeLoading ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}` }), _jsxs("div", { className: "text-left", children: [_jsxs("div", { className: "text-[10px] text-slate-300 font-sans font-semibold flex items-center gap-1.5", children: [_jsx("span", { children: "BEFORE BASELINE" }), isBeforeLoading && _jsx(Loader2, { className: "w-2.5 h-2.5 animate-spin text-emerald-400" }), beforeError && _jsx("span", { className: "text-rose-400 font-mono text-[9px]", children: "(Unavailable)" })] }), _jsx("div", { className: "text-[11px] font-bold text-white", children: format(new Date(beforeScene.acquisition_date), 'yyyy-MM-dd') })] })] }) }), _jsx("div", { className: "absolute bottom-3 right-3 z-[1030] pointer-events-auto", children: _jsxs("button", { type: "button", onClick: () => setSliderPosition(0), className: `bg-slate-900/95 hover:bg-slate-800/95 backdrop-blur-xs text-white border transition-all rounded px-2.5 py-1.5 shadow-md flex items-center space-x-2 text-xs font-mono text-right cursor-pointer ${sliderPosition <= 2 ? 'border-sky-400 ring-2 ring-sky-400/40 bg-slate-800' : 'border-slate-700/80'}`, title: "Click to view 100% After Scene", children: [_jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-[10px] text-slate-300 font-sans font-semibold flex items-center justify-end gap-1.5", children: afterError || !afterScene || (afterScene && afterScene.cloud_cover > 35) ? (_jsx("span", { className: "text-rose-400 font-mono text-[9px]", children: "No usable monitoring scene available" })) : (_jsxs(_Fragment, { children: [isAfterLoading && _jsx(Loader2, { className: "w-2.5 h-2.5 animate-spin text-sky-400" }), _jsx("span", { children: "AFTER MONITORING" })] })) }), _jsx("div", { className: "text-[11px] font-bold text-white", children: afterError || !afterScene || (afterScene && afterScene.cloud_cover > 35) ? (_jsx("span", { className: "text-slate-400 text-[10px]", children: "Cloud > 35% or preview unavailable" })) : (afterScene?.acquisition_date ? format(new Date(afterScene.acquisition_date), 'yyyy-MM-dd') : 'N/A') })] }), _jsx("span", { className: `w-2 h-2 rounded-full shrink-0 ${afterError || !afterScene || (afterScene && afterScene.cloud_cover > 35) ? 'bg-rose-500' : isAfterLoading ? 'bg-sky-400 animate-pulse' : 'bg-sky-500'}` })] }) }), _jsx("div", { className: "absolute bottom-3 left-1/2 -translate-x-1/2 z-[1030] pointer-events-auto", children: _jsxs("button", { type: "button", onClick: () => setSliderPosition(50), className: "bg-white/95 hover:bg-white backdrop-blur-xs text-slate-800 border border-slate-300 rounded px-2.5 py-1 text-[11px] font-mono shadow-md cursor-pointer transition-colors hover:text-teal-900", title: "Click to reset to 50/50 Split View", children: ["Split: ", sliderPosition.toFixed(0), "% / ", (100 - sliderPosition).toFixed(0), "%"] }) })] })] }));
};
export default SatelliteInvestigationMap;
