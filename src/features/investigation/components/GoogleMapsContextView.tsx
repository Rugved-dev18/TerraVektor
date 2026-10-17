import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { AlertCircle, ExternalLink, Layers, MapPin, Eye, Compass } from 'lucide-react';

interface GoogleMapsContextViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  aoiBbox?: [number, number, number, number] | null; // [minLon, minLat, maxLon, maxLat]
  selectedCandidateCentroid?: [number, number] | null; // [lon, lat]
  selectedCandidateLabel?: string;
  onViewportChange?: (center: { lat: number; lng: number }, zoom: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Inner helper component to draw AOI rectangle and markers using native google.maps objects once loaded
const GoogleMapOverlays: React.FC<{
  aoiBbox?: [number, number, number, number] | null;
  selectedCandidateCentroid?: [number, number] | null;
  selectedCandidateLabel?: string;
  center: { lat: number; lng: number };
  zoom: number;
  onViewportChange?: (center: { lat: number; lng: number }, zoom: number) => void;
}> = ({ aoiBbox, selectedCandidateCentroid, selectedCandidateLabel, center, zoom, onViewportChange }) => {
  const map = useMap();
  const aoiRectRef = useRef<google.maps.Rectangle | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const isInternalMove = useRef(false);

  // Sync center and zoom when changed from Leaflet
  useEffect(() => {
    if (!map) return;
    isInternalMove.current = true;
    map.panTo(center);
    if (Math.abs(map.getZoom()! - zoom) > 0.5) {
      map.setZoom(zoom);
    }
    const t = setTimeout(() => { isInternalMove.current = false; }, 400);
    return () => clearTimeout(t);
  }, [map, center.lat, center.lng, zoom]);

  // Sync viewport changes back to parent
  useEffect(() => {
    if (!map || !onViewportChange) return;

    const idleListener = map.addListener('idle', () => {
      if (isInternalMove.current) return;
      const c = map.getCenter();
      const z = map.getZoom();
      if (c && z !== undefined) {
        onViewportChange({ lat: c.lat(), lng: c.lng() }, z);
      }
    });

    return () => {
      google.maps.event.removeListener(idleListener);
    };
  }, [map, onViewportChange]);

  // Draw AOI rectangle
  useEffect(() => {
    if (!map) return;

    if (aoiRectRef.current) {
      aoiRectRef.current.setMap(null);
      aoiRectRef.current = null;
    }

    if (aoiBbox && aoiBbox.length === 4) {
      const [minLon, minLat, maxLon, maxLat] = aoiBbox;
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(minLat, minLon),
        new google.maps.LatLng(maxLat, maxLon)
      );

      aoiRectRef.current = new google.maps.Rectangle({
        bounds,
        strokeColor: '#0f766e',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#0f766e',
        fillOpacity: 0.08,
        map
      });
    }

    return () => {
      if (aoiRectRef.current) {
        aoiRectRef.current.setMap(null);
      }
    };
  }, [map, aoiBbox]);

  // Draw Candidate Pin
  useEffect(() => {
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (selectedCandidateCentroid) {
      const [lon, lat] = selectedCandidateCentroid;
      markerRef.current = new google.maps.Marker({
        position: { lat, lng: lon },
        map,
        title: selectedCandidateLabel || 'Candidate Region',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#ea580c',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [map, selectedCandidateCentroid, selectedCandidateLabel]);

  return null;
};

export const GoogleMapsContextView: React.FC<GoogleMapsContextViewProps> = ({
  center,
  zoom,
  aoiBbox,
  selectedCandidateCentroid,
  selectedCandidateLabel,
  onViewportChange,
  className = '',
  style
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string)?.trim() || '';
  const [authFailed, setAuthFailed] = useState<boolean>(false);
  const [mapTypeId, setMapTypeId] = useState<string>('hybrid'); // hybrid, roadmap, terrain

  useEffect(() => {
    const handleAuthFail = () => setAuthFailed(true);
    window.addEventListener('gmp-auth-failed', handleAuthFail);
    return () => window.removeEventListener('gmp-auth-failed', handleAuthFail);
  }, []);

  if (!apiKey || authFailed) {
    return (
      <div 
        className={`relative flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded text-center text-slate-700 min-h-[300px] h-full ${className}`}
        style={style}
      >
        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 mb-2.5">
          <MapPin className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide font-mono">
          Google Maps Geographic Context
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          {authFailed 
            ? 'Google Maps API authorization failed or quota reached. Leaflet baseline map remains active.'
            : 'Configure your Google Maps API key in the environment to activate real-time street and hybrid orientation context.'}
        </p>

        <div className="mt-4 p-2.5 bg-white border border-slate-200 rounded max-w-md w-full text-left text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-semibold text-slate-800">Environment Key:</span>
            <span className="text-teal-800 font-bold">VITE_GOOGLE_MAPS_API_KEY</span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
            When enabled, Google Maps provides synchronized terrain, roads, municipal boundaries, and geographic reference without disturbing Sentinel-2 radiometric analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[360px] overflow-hidden rounded border border-slate-200 bg-slate-100 ${className}`} style={style}>
      {/* Map Type Bar */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center bg-white/95 backdrop-blur-xs rounded shadow-xs border border-slate-200 p-0.5 text-[11px] font-mono">
        <button
          type="button"
          onClick={() => setMapTypeId('hybrid')}
          className={`px-2 py-0.5 rounded transition-colors ${
            mapTypeId === 'hybrid' ? 'bg-teal-800 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Hybrid
        </button>
        <button
          type="button"
          onClick={() => setMapTypeId('roadmap')}
          className={`px-2 py-0.5 rounded transition-colors ${
            mapTypeId === 'roadmap' ? 'bg-teal-800 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Roadmap
        </button>
        <button
          type="button"
          onClick={() => setMapTypeId('terrain')}
          className={`px-2 py-0.5 rounded transition-colors ${
            mapTypeId === 'terrain' ? 'bg-teal-800 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Terrain
        </button>
      </div>

      {/* Attribution Watermark Badge */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600 font-mono">
        <Compass className="w-3 h-3 text-teal-800" />
        <span>Context Layer (Google Maps)</span>
      </div>

      <APIProvider apiKey={apiKey}>
        <Map
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          defaultCenter={center}
          defaultZoom={zoom}
          mapTypeId={mapTypeId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          streetViewControl={false}
          mapTypeControl={false}
        >
          <GoogleMapOverlays
            aoiBbox={aoiBbox}
            selectedCandidateCentroid={selectedCandidateCentroid}
            selectedCandidateLabel={selectedCandidateLabel}
            center={center}
            zoom={zoom}
            onViewportChange={onViewportChange}
          />
        </Map>
      </APIProvider>
    </div>
  );
};
