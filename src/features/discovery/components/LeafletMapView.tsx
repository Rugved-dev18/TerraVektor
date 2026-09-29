import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sentinel2Product } from '../../../types';
import { format } from 'date-fns';
import { Layers, Maximize2, Trash2, Crosshair, ExternalLink, Calendar, Cloud, Info } from 'lucide-react';

interface LeafletMapViewProps {
  aoiBbox: [number, number, number, number] | null; // [minLon, minLat, maxLon, maxLat]
  onAoiChange: (bbox: [number, number, number, number] | null) => void;
  products: Sentinel2Product[];
  selectedProductId: string | null;
  onSelectProduct: (product: Sentinel2Product | null) => void;
  isDrawingAoi: boolean;
  setIsDrawingAoi: (drawing: boolean) => void;
  center?: [number, number]; // [lat, lon]
  zoom?: number;
}

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  aoiBbox,
  onAoiChange,
  products,
  selectedProductId,
  onSelectProduct,
  isDrawingAoi,
  setIsDrawingAoi,
  center = [18.5204, 73.8567], // Default near Pune, India
  zoom = 7
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const aoiLayerRef = useRef<L.Rectangle | null>(null);
  const footprintsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawStartPointRef = useRef<L.LatLng | null>(null);
  const tempDrawRectRef = useRef<L.Rectangle | null>(null);
  const [activeBaseLayer, setActiveBaseLayer] = useState<'osm' | 'satellite'>('osm');
  const baseLayersRef = useRef<{ osm: L.TileLayer; satellite: L.TileLayer } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
      attributionControl: false
    });

    // Custom attribution control bottom right
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | <a href="https://dataspace.copernicus.eu/">Copernicus CDSE</a>')
      .addTo(map);

    // Zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Basemaps
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    osmLayer.addTo(map);
    baseLayersRef.current = { osm: osmLayer, satellite: satelliteLayer };

    // Layer group for product footprints
    const footprintsGroup = L.layerGroup().addTo(map);
    footprintsLayerGroupRef.current = footprintsGroup;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch Basemap
  const handleToggleBaseLayer = () => {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    if (!map || !layers) return;

    if (activeBaseLayer === 'osm') {
      map.removeLayer(layers.osm);
      layers.satellite.addTo(map);
      setActiveBaseLayer('satellite');
    } else {
      map.removeLayer(layers.satellite);
      layers.osm.addTo(map);
      setActiveBaseLayer('osm');
    }
  };

  // Drawing AOI logic (Click two opposite corners)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isDrawingAoi) {
      map.getContainer().style.cursor = 'crosshair';

      const handleMapClick = (e: L.LeafletMouseEvent) => {
        if (!drawStartPointRef.current) {
          // First corner clicked
          drawStartPointRef.current = e.latlng;
          const tempRect = L.rectangle(L.latLngBounds(e.latlng, e.latlng), {
            color: '#eab308',
            weight: 2,
            dashArray: '4, 4',
            fillColor: '#eab308',
            fillOpacity: 0.15
          }).addTo(map);
          tempDrawRectRef.current = tempRect;
        } else {
          // Second corner clicked
          const start = drawStartPointRef.current;
          const end = e.latlng;
          const minLat = Math.min(start.lat, end.lat);
          const maxLat = Math.max(start.lat, end.lat);
          const minLon = Math.min(start.lng, end.lng);
          const maxLon = Math.max(start.lng, end.lng);

          if (tempDrawRectRef.current) {
            map.removeLayer(tempDrawRectRef.current);
            tempDrawRectRef.current = null;
          }
          drawStartPointRef.current = null;
          setIsDrawingAoi(false);
          map.getContainer().style.cursor = '';

          // Only set if non-zero dimensions
          if (Math.abs(maxLon - minLon) > 0.001 && Math.abs(maxLat - minLat) > 0.001) {
            onAoiChange([
              Number(minLon.toFixed(4)),
              Number(minLat.toFixed(4)),
              Number(maxLon.toFixed(4)),
              Number(maxLat.toFixed(4))
            ]);
          }
        }
      };

      const handleMouseMove = (e: L.LeafletMouseEvent) => {
        if (drawStartPointRef.current && tempDrawRectRef.current) {
          const bounds = L.latLngBounds(drawStartPointRef.current, e.latlng);
          tempDrawRectRef.current.setBounds(bounds);
        }
      };

      map.on('click', handleMapClick);
      map.on('mousemove', handleMouseMove);

      return () => {
        map.off('click', handleMapClick);
        map.off('mousemove', handleMouseMove);
        map.getContainer().style.cursor = '';
        if (tempDrawRectRef.current) {
          map.removeLayer(tempDrawRectRef.current);
          tempDrawRectRef.current = null;
        }
        drawStartPointRef.current = null;
      };
    } else {
      map.getContainer().style.cursor = '';
      if (tempDrawRectRef.current) {
        map.removeLayer(tempDrawRectRef.current);
        tempDrawRectRef.current = null;
      }
      drawStartPointRef.current = null;
    }
  }, [isDrawingAoi, onAoiChange, setIsDrawingAoi]);

  // Update AOI Layer on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (aoiLayerRef.current) {
      map.removeLayer(aoiLayerRef.current);
      aoiLayerRef.current = null;
    }

    if (aoiBbox) {
      const [minLon, minLat, maxLon, maxLat] = aoiBbox;
      const bounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);

      const aoiRect = L.rectangle(bounds, {
        color: '#f59e0b', // Amber-500
        weight: 2.5,
        dashArray: '6, 6',
        fillColor: '#f59e0b',
        fillOpacity: 0.12
      }).addTo(map);

      aoiRect.bindTooltip(
        `<div style="font-weight:600; font-size:12px; color:#d97706;">Area of Interest (AOI)</div><div style="font-size:10px; color:#64748b;">${minLat.toFixed(
          2
        )}, ${minLon.toFixed(2)} to ${maxLat.toFixed(2)}, ${maxLon.toFixed(2)}</div>`,
        { permanent: false, direction: 'top' }
      );

      aoiLayerRef.current = aoiRect;
    }
  }, [aoiBbox]);

  // Update Footprint Polygons on map
  useEffect(() => {
    const map = mapRef.current;
    const group = footprintsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (!products || products.length === 0) return;

    const layersToFit: L.Layer[] = [];

    products.forEach((prod) => {
      const isSelected = prod.id === selectedProductId;

      // Extract coordinates from geometry
      let latLngs: [number, number][] = [];
      if (prod.geometry && prod.geometry.coordinates && prod.geometry.coordinates[0]) {
        // GeoJSON is [lon, lat], Leaflet wants [lat, lon]
        latLngs = prod.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
      } else if (prod.bbox) {
        const [minLon, minLat, maxLon, maxLat] = prod.bbox;
        latLngs = [
          [minLat, minLon],
          [minLat, maxLon],
          [maxLat, maxLon],
          [maxLat, minLon],
          [minLat, minLon]
        ];
      }

      if (latLngs.length > 0) {
        const polygon = L.polygon(latLngs, {
          color: isSelected ? '#0d9488' : '#0f766e',
          weight: isSelected ? 3 : 1.5,
          fillColor: '#0f766e',
          fillOpacity: isSelected ? 0.3 : 0.12,
          className: 'sentinel2-footprint-poly'
        });

        // Popup content
        const cloudColor = prod.cloud_cover < 10 ? '#15803d' : prod.cloud_cover < 30 ? '#b45309' : '#b91c1c';
        const formattedDate = prod.acquisition_date ? format(new Date(prod.acquisition_date), 'MMM dd, yyyy HH:mm') : 'Unknown';

        const modeBadgeHtml =
          prod.data_mode === 'live_copernicus'
            ? `<span style="font-size: 10px; font-weight: 700; color: #166534; background: #dcfce7; border: 1px solid #bbf7d0; padding: 1px 6px; border-radius: 4px;">● LIVE CDSE</span>`
            : prod.data_mode === 'cached'
            ? `<span style="font-size: 10px; font-weight: 700; color: #854d0e; background: #fef9c3; border: 1px solid #fef08a; padding: 1px 6px; border-radius: 4px;">● CACHED</span>`
            : `<span style="font-size: 10px; font-weight: 700; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; padding: 1px 6px; border-radius: 4px;">● DEMO</span>`;

        const popupHtml = `
          <div style="min-width: 250px; font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px; gap: 6px;">
              <div style="display:flex; align-items:center; gap: 4px;">
                <span style="font-size: 11px; font-weight: 700; color: #0f766e; background: #f0fdfa; border: 1px solid #ccfbf1; padding: 2px 6px; border-radius: 4px;">${prod.product_type}</span>
                ${modeBadgeHtml}
              </div>
              <span style="font-size: 11px; font-weight: 600; color: ${cloudColor}; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px;">☁️ ${prod.cloud_cover}% Cloud</span>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 4px; word-break: break-all; line-height: 1.3;">
              ${prod.name}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
              📅 ${formattedDate} UTC &bull; ${prod.platform} &bull; Tile: ${prod.tile_id || 'N/A'}
            </div>
            <div style="display:flex; gap: 8px; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <a href="${prod.cdse_browser_url}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #0f766e; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: 500;">
                Open in CDSE Browser &rarr;
              </a>
            </div>
          </div>
        `;

        const popup = L.popup({
          offset: [0, -10],
          className: 'sentinel2-custom-popup'
        }).setContent(popupHtml);

        polygon.bindPopup(popup);

        polygon.on('click', () => {
          onSelectProduct(prod);
        });

        polygon.on('mouseover', () => {
          if (prod.id !== selectedProductId) {
            polygon.setStyle({ fillOpacity: 0.3, weight: 2.5 });
          }
        });

        polygon.on('mouseout', () => {
          if (prod.id !== selectedProductId) {
            polygon.setStyle({ fillOpacity: 0.15, weight: 1.8 });
          }
        });

        polygon.addTo(group);
        layersToFit.push(polygon);

        if (isSelected) {
          polygon.openPopup();
        }
      }
    });

    // If new results came in and user is not currently inspecting a single product, fit view to results
    if (layersToFit.length > 0 && !selectedProductId) {
      const featGroup = L.featureGroup(layersToFit);
      map.fitBounds(featGroup.getBounds().pad(0.1), { maxZoom: 11, duration: 1 });
    }
  }, [products, selectedProductId, onSelectProduct]);

  // Zoom to selected product when selectedProductId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProductId || !products) return;

    const selectedProd = products.find((p) => p.id === selectedProductId);
    if (selectedProd && selectedProd.bbox) {
      const [minLon, minLat, maxLon, maxLat] = selectedProd.bbox;
      map.flyToBounds([[minLat, minLon], [maxLat, maxLon]], {
        padding: [30, 30],
        maxZoom: 11,
        duration: 1.2
      });
    }
  }, [selectedProductId, products]);

  // Fit bounds to AOI or all footprints
  const handleFitToExtent = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (aoiBbox) {
      const [minLon, minLat, maxLon, maxLat] = aoiBbox;
      map.flyToBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [40, 40], duration: 1 });
    } else if (products && products.length > 0) {
      const lGroup = footprintsLayerGroupRef.current;
      if (lGroup && lGroup.getLayers().length > 0) {
        const featGroup = L.featureGroup(lGroup.getLayers());
        map.flyToBounds(featGroup.getBounds().pad(0.1), { padding: [30, 30], duration: 1 });
      }
    }
  }, [aoiBbox, products]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-lg overflow-hidden border border-slate-300 shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px] bg-slate-100 relative z-0 isolate" />

      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col space-y-2">
        <button
          type="button"
          onClick={() => setIsDrawingAoi(!isDrawingAoi)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors ${
            isDrawingAoi
              ? 'bg-amber-100 text-amber-900 border border-amber-400 ring-2 ring-amber-300'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
          }`}
          title="Click to activate bounding box drawing mode on map (click 2 opposite corners)"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{isDrawingAoi ? 'Click 2 Corners on Map...' : 'Draw AOI Rectangle'}</span>
        </button>

        {aoiBbox && (
          <button
            type="button"
            onClick={() => onAoiChange(null)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 shadow-xs transition-colors"
            title="Clear the selected Area of Interest"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear AOI</span>
          </button>
        )}
      </div>

      {/* Map Tools Top Right */}
      <div className="absolute top-4 right-14 z-[1000] flex items-center space-x-2">
        <button
          type="button"
          onClick={handleToggleBaseLayer}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
          title="Toggle between Satellite Imagery and Cartographic Streets"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>{activeBaseLayer === 'osm' ? 'Satellite View' : 'Map View'}</span>
        </button>

        <button
          type="button"
          onClick={handleFitToExtent}
          className="p-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
          title="Fit view to current AOI / search results"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Drawing Mode Guide Banner */}
      {isDrawingAoi && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-amber-50 text-amber-950 px-3.5 py-1.5 rounded text-xs font-semibold shadow-md border border-amber-300 flex items-center space-x-2">
          <Crosshair className="w-3.5 h-3.5 animate-spin text-amber-800" />
          <span>Click top-left corner, then click bottom-right corner on the map to define AOI</span>
          <button
            onClick={() => setIsDrawingAoi(false)}
            className="ml-2 text-xs bg-slate-800 text-white px-2 py-0.5 rounded hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-300 rounded p-2.5 shadow-sm text-xs space-y-1 pointer-events-none">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-xs border-2 border-amber-600 bg-amber-500/20" />
          <span className="text-slate-700 font-medium">Selected AOI</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-xs border-2 border-teal-700 bg-teal-600/20" />
          <span className="text-slate-700 font-medium">Sentinel-2 Footprint</span>
        </div>
      </div>
    </div>
  );
};

export default LeafletMapView;
