import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapColorMode } from '../types/mapModes';
import { MapColorFilters, getMapColorFilterStyle } from './MapColorFilters';
import { MapColorModeSelector } from './MapColorModeSelector';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
  }>;
  onMarkerClick?: (marker: any) => void;
  colorMode?: MapColorMode;
}

const MapView: React.FC<MapViewProps> = ({
  center = [77.2090, 28.6139], // Default to Delhi
  zoom = 5,
  markers = [],
  onMarkerClick,
  colorMode: initialColorMode = 'optical-rgb'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapColorMode, setMapColorMode] = useState<MapColorMode>(initialColorMode);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: center,
      zoom: zoom,
      pitch: 0,
      bearing: 0
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.custom-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add new markers
    markers.forEach((markerData) => {
      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker';
      markerElement.style.width = '20px';
      markerElement.style.height = '20px';
      markerElement.style.backgroundColor = '#0f766e';
      markerElement.style.borderRadius = '50%';
      markerElement.style.border = '2px solid white';
      markerElement.style.cursor = 'pointer';
      markerElement.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';

      const popup = new maplibregl.Popup({ offset: 20 })
        .setHTML(`
          <div style="padding: 6px; min-width: 180px; color: #0f172a; font-family: system-ui, sans-serif;">
            <h3 style="margin: 0 0 3px 0; font-weight: 600; font-size: 13px; color: #0f172a;">${markerData.title || 'Location'}</h3>
            <p style="margin: 0; font-size: 11px; color: #475569;">${markerData.description || ''}</p>
            <p style="margin: 4px 0 0 0; font-size: 10px; font-family: monospace; color: #64748b;">
              ${markerData.latitude.toFixed(4)}, ${markerData.longitude.toFixed(4)}
            </p>
          </div>
        `);

      const marker = new maplibregl.Marker({
        element: markerElement
      })
        .setLngLat([markerData.longitude, markerData.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markerElement.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(markerData);
        }
      });
    });
  }, [markers, mapLoaded, onMarkerClick]);

  // Update center when it changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        duration: 1000
      });
    }
  }, [center, zoom, mapLoaded]);

  // Apply spectral filter when mapColorMode changes
  useEffect(() => {
    if (!mapContainer.current) return;
    const filterStyle = getMapColorFilterStyle(mapColorMode);
    const canvas = mapContainer.current.querySelector('canvas');
    if (canvas) {
      canvas.style.filter = filterStyle.filter as string;
      (canvas.style as any).WebkitFilter = filterStyle.WebkitFilter as string;
    }
  }, [mapColorMode, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <MapColorFilters />
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Floating Map Color Changing Mode Selector */}
      <div className="absolute top-3 left-3 z-10 pointer-events-auto">
        <MapColorModeSelector
          currentMode={mapColorMode}
          onModeChange={setMapColorMode}
          compact={true}
        />
      </div>

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-mono">Loading basemap...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
