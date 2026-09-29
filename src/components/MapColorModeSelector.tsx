import React, { useState, useRef, useEffect } from 'react';
import { Eye, Radio, Sparkles, Info, X, HelpCircle, Layers } from 'lucide-react';
import { MapColorMode, MAP_COLOR_MODES } from '../types/mapModes';

interface MapColorModeSelectorProps {
  currentMode: MapColorMode;
  onModeChange: (mode: MapColorMode) => void;
  className?: string;
  compact?: boolean;
}

export const MapColorModeSelector: React.FC<MapColorModeSelectorProps> = ({
  currentMode,
  onModeChange,
  className = '',
  compact = false
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close info popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowInfoModal(false);
      }
    }
    if (showInfoModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoModal]);

  const activeConfig = MAP_COLOR_MODES[currentMode];

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      {/* Mode Button Group */}
      <div 
        className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-md p-0.5 border border-slate-700/80 shadow-md text-xs font-mono"
        role="group"
        aria-label="Map Color Changing Mode"
      >
        {/* 1. Optical RGB */}
        <button
          type="button"
          onClick={() => onModeChange('optical-rgb')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-xs ${
            currentMode === 'optical-rgb'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
          title="Optical RGB: Natural True Color composite (Sentinel-2 B04, B03, B02)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className={compact ? 'hidden sm:inline' : 'inline'}>Optical RGB</span>
        </button>

        {/* 2. C-Band SAR */}
        <button
          type="button"
          onClick={() => onModeChange('c-band-sar')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-xs ${
            currentMode === 'c-band-sar'
              ? 'bg-amber-600 text-white font-bold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
          title="C-Band SAR: Sentinel-1 5.4 GHz microwave radar backscatter (VV/VH dual-pol)"
        >
          <Radio className="w-3 h-3 text-amber-300 shrink-0" />
          <span className={compact ? 'hidden sm:inline' : 'inline'}>C-Band SAR</span>
        </button>

        {/* 3. False Colour NIR */}
        <button
          type="button"
          onClick={() => onModeChange('false-color-nir')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-xs ${
            currentMode === 'false-color-nir'
              ? 'bg-rose-600 text-white font-bold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
          title="False Colour NIR: Sentinel-2 B08 Near-Infrared Color-Infrared (CIR) composite"
        >
          <Sparkles className="w-3 h-3 text-rose-300 shrink-0" />
          <span className={compact ? 'hidden sm:inline' : 'inline'}>False Colour NIR</span>
        </button>
      </div>

      {/* Info / Legend Toggle Button */}
      <button
        type="button"
        onClick={() => setShowInfoModal(!showInfoModal)}
        className={`p-1.5 rounded-md border text-xs transition-colors shadow-sm flex items-center justify-center ${
          showInfoModal
            ? 'bg-slate-900 text-amber-300 border-slate-600'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
        }`}
        title="View active spectral bands, physics, and interpretation legend"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Spectral Mode Information & Legend Popover */}
      {showInfoModal && (
        <div
          ref={popoverRef}
          className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 z-[1100] w-80 sm:w-96 bg-white border border-slate-300 rounded-lg shadow-xl p-3 text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{activeConfig.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${activeConfig.badgeBg} ${activeConfig.badgeText} border ${activeConfig.badgeBorder}`}>
                  ACTIVE MODE
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                {activeConfig.tagline}
              </div>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-slate-600 text-[11px] mt-2 leading-relaxed">
            {activeConfig.description}
          </p>

          {/* Spectral Metadata */}
          <div className="grid grid-cols-2 gap-2 my-2.5 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-[10px]">
            <div>
              <span className="text-slate-400 block uppercase">Bands:</span>
              <span className="text-slate-800 font-semibold">{activeConfig.bands}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase">Sensor:</span>
              <span className="text-slate-800 font-semibold">{activeConfig.sensor}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block uppercase">Wavelength:</span>
              <span className="text-slate-800 font-semibold">{activeConfig.wavelength}</span>
            </div>
          </div>

          {/* Interpretation Legend */}
          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
              <span>Interpretation Guide</span>
              <span className="text-[10px] text-slate-400 font-normal">Spectral Response</span>
            </div>
            <div className="space-y-1.5">
              {activeConfig.legend.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-1 rounded bg-slate-50 border border-slate-100">
                  <span
                    className="w-3.5 h-3.5 rounded shrink-0 shadow-2xs border border-black/20"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-[11px] leading-tight">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Switch Buttons */}
          <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Switch Mode:</span>
            <div className="flex items-center gap-1">
              {(['optical-rgb', 'c-band-sar', 'false-color-nir'] as MapColorMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onModeChange(mode)}
                  className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                    currentMode === mode
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {MAP_COLOR_MODES[mode].shortName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
