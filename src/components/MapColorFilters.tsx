import React from 'react';
import { MapColorMode } from '../types/mapModes';

/**
 * Embedded SVG Filter Definitions for Earth Observation Map Spectral Changing Modes:
 * 1. Optical RGB: Default natural human perception
 * 2. C-Band SAR: Sentinel-1 5.4 GHz microwave radar backscatter (VV/VH dual-pol, speckle, double bounce)
 * 3. False Colour NIR: Sentinel-2 B08-B04-B03 Color-Infrared (CIR) composite
 */
export const MapColorFilters: React.FC = () => {
  return (
    <svg 
      className="absolute top-0 left-0 w-0 h-0 pointer-events-none -z-50 select-none overflow-hidden" 
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0 }}
    >
      <defs>
        {/* 1. Optical RGB (True Color identity pass-through) */}
        <filter id="terravektor-optical-rgb" colorInterpolationFilters="sRGB">
          <feColorMatrix type="identity" />
        </filter>

        {/* 2. C-Band SAR (Sentinel-1 Synthetic Aperture Radar Simulation) */}
        <filter id="terravektor-cband-sar" colorInterpolationFilters="sRGB" x="-5%" y="-5%" width="110%" height="110%">
          {/* A. Radar Backscatter luminance conversion with high dynamic range dB stretch */}
          <feColorMatrix
            type="matrix"
            values="
              0.35  0.55  0.10  0  -0.08
              0.30  0.50  0.10  0  -0.08
              0.25  0.45  0.20  0  -0.05
              0     0     0     1   0"
            result="backscatter"
          />

          {/* B. Deep absorption for water & specular bounce suppression */}
          <feComponentTransfer in="backscatter" result="contrastStretched">
            <feFuncR type="linear" slope="1.45" intercept="-0.12" />
            <feFuncG type="linear" slope="1.40" intercept="-0.12" />
            <feFuncB type="linear" slope="1.50" intercept="-0.10" />
          </feComponentTransfer>

          {/* C. Dual-Polarization (VV/VH) radar coloration:
                 - Pure black for calm water
                 - Subtle olive/cyan tone for diffuse surface roughness
                 - Bright specular white/gold for urban double-bounce reflectors */}
          <feColorMatrix
            in="contrastStretched"
            type="matrix"
            values="
              1.10  0.10 -0.05  0  0.02
              0.05  1.15  0.00  0  0.03
             -0.10  0.15  1.20  0  0.04
              0     0     0     1  0"
            result="radarColored"
          />

          {/* D. Radar speckle texture (Rayleigh noise distribution) */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
            result="speckle"
          />
          <feColorMatrix
            in="speckle"
            type="matrix"
            values="
              0.15 0 0 0 0.85
              0 0.15 0 0 0.85
              0 0 0.15 0 0.85
              0 0 0 1 0"
            result="speckleNoise"
          />

          {/* E. Modulate backscatter with radar speckle */}
          <feBlend in="radarColored" in2="speckleNoise" mode="multiply" result="sarOutput" />
        </filter>

        {/* 3. False Colour NIR (Sentinel-2 B08 Near-Infrared / Color-Infrared CIR) */}
        <filter id="terravektor-false-color-nir" colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
          {/* CIR Matrix mapping:
              - High green/chlorophyll -> Striking crimson/scarlet red
              - Visible red -> Mapped to Green channel
              - Water (high blue, zero NIR) -> Deep obsidian black / navy
              - Urban/Concrete/Roads (balanced gray) -> Clean cyan / silver slate */}
          <feColorMatrix
            type="matrix"
            values="
             -0.35   1.75  -0.30   0   0.05
              0.75   0.25   0.00   0  -0.02
             -0.20   0.30   0.70   0   0.08
              0      0      0      1   0"
            result="cirRaw"
          />

          {/* Deepen water absorption and boost vegetation crimson contrast */}
          <feComponentTransfer in="cirRaw" result="cirEnhanced">
            <feFuncR type="linear" slope="1.25" intercept="-0.04" />
            <feFuncG type="linear" slope="1.05" intercept="-0.02" />
            <feFuncB type="linear" slope="1.15" intercept="-0.03" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
};

/**
 * Returns the CSS class or inline filter style string for the given MapColorMode
 */
export function getMapColorFilterStyle(mode: MapColorMode): React.CSSProperties {
  switch (mode) {
    case 'c-band-sar':
      return {
        filter: 'url(#terravektor-cband-sar) contrast(1.15) brightness(0.98)',
        WebkitFilter: 'url(#terravektor-cband-sar) contrast(1.15) brightness(0.98)',
        transition: 'filter 0.3s ease-in-out'
      };
    case 'false-color-nir':
      return {
        filter: 'url(#terravektor-false-color-nir) saturate(1.25) contrast(1.1)',
        WebkitFilter: 'url(#terravektor-false-color-nir) saturate(1.25) contrast(1.1)',
        transition: 'filter 0.3s ease-in-out'
      };
    case 'optical-rgb':
    default:
      return {
        filter: 'none',
        WebkitFilter: 'none',
        transition: 'filter 0.3s ease-in-out'
      };
  }
}

/**
 * Returns the CSS class name for the active map color mode
 */
export function getMapColorFilterClassName(mode: MapColorMode): string {
  switch (mode) {
    case 'c-band-sar':
      return 'map-mode-c-band-sar';
    case 'false-color-nir':
      return 'map-mode-false-color-nir';
    case 'optical-rgb':
    default:
      return 'map-mode-optical-rgb';
  }
}
