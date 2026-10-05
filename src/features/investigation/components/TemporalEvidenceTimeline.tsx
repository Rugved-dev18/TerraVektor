import React from 'react';
import { 
  Calendar, 
  Cloud, 
  Layers, 
  ArrowRight, 
  Check, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { TemporalScene } from '../../../types';

interface TemporalEvidenceTimelineProps {
  temporalScenes: TemporalScene[];
  selectedBeforeId: string | null;
  selectedAfterId: string | null;
  onSelectPair: (beforeScene: TemporalScene, afterScene: TemporalScene) => void;
  isReanalyzing?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const TemporalEvidenceTimeline: React.FC<TemporalEvidenceTimelineProps> = ({
  temporalScenes = [],
  selectedBeforeId,
  selectedAfterId,
  onSelectPair,
  isReanalyzing = false,
  isLoading = false,
  errorMessage = null
}) => {
  // Sort scenes chronologically ascending
  const sortedScenes = React.useMemo(() => {
    return [...temporalScenes].sort(
      (a, b) => new Date(a.acquisitionDate).getTime() - new Date(b.acquisitionDate).getTime()
    );
  }, [temporalScenes]);

  // Filter usable observations (Requirement 1: cloud cover <= 35%)
  const isUsable = (s: TemporalScene) => typeof s.cloudCover === 'number' && s.cloudCover <= 35;
  const usableScenes = sortedScenes.filter(isUsable);

  const selectedBefore = sortedScenes.find(s => s.productId === selectedBeforeId) || usableScenes[0] || sortedScenes[0] || null;
  const selectedAfter = sortedScenes.find(s => s.productId === selectedAfterId && isUsable(s)) || (usableScenes.length > 0 ? usableScenes[usableScenes.length - 1] : null);

  const daysSeparation = selectedBefore && selectedAfter
    ? Math.abs(differenceInDays(new Date(selectedAfter.acquisitionDate), new Date(selectedBefore.acquisitionDate)))
    : 0;

  const minYear = sortedScenes.length > 0 
    ? format(new Date(sortedScenes[0].acquisitionDate), 'yyyy') 
    : '2024';
  const maxYear = sortedScenes.length > 0 
    ? format(new Date(sortedScenes[sortedScenes.length - 1].acquisitionDate), 'yyyy') 
    : '2026';

  const handleSetBefore = (scene: TemporalScene) => {
    if (!selectedAfter) {
      onSelectPair(scene, scene);
      return;
    }
    // If chosen scene is after current After scene, swap or pair appropriately
    if (new Date(scene.acquisitionDate).getTime() >= new Date(selectedAfter.acquisitionDate).getTime()) {
      onSelectPair(selectedAfter, scene);
    } else {
      onSelectPair(scene, selectedAfter);
    }
  };

  const handleSetAfter = (scene: TemporalScene) => {
    if (scene.cloudCover > 35) return;
    if (!selectedBefore) {
      onSelectPair(scene, scene);
      return;
    }
    // If chosen scene is before current Before scene, swap or pair appropriately
    if (new Date(scene.acquisitionDate).getTime() <= new Date(selectedBefore.acquisitionDate).getTime()) {
      onSelectPair(scene, selectedBefore);
    } else {
      onSelectPair(selectedBefore, scene);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-2xs space-y-3">
      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-teal-800 uppercase tracking-wider font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>SENTINEL-2 TEMPORAL EVIDENCE</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-sans font-normal">
              {sortedScenes.length > 0 ? `${sortedScenes.length} Multi-Temporal Observations` : 'Temporal Chain'}
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            Select any pair of real Sentinel-2 observations to drive the bi-temporal change detection pipeline.
          </div>
        </div>

        {/* Selected Pair Indicator */}
        {selectedBefore && selectedAfter && (
          <div className="flex items-center space-x-2 shrink-0">
            {isReanalyzing ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                <span>Recomputing Spectral Differencing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-mono">
                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                  BEFORE: {format(new Date(selectedBefore.acquisitionDate), 'dd MMM yyyy')}
                </span>
                <span className="text-slate-400 font-bold">&rarr;</span>
                <span className="px-1.5 py-0.5 rounded bg-sky-600 text-white font-bold text-[10px]">
                  AFTER: {format(new Date(selectedAfter.acquisitionDate), 'dd MMM yyyy')}
                </span>
                <span className="text-slate-500 text-[10px] font-semibold pl-1 border-l border-slate-200">
                  {daysSeparation}d &Delta;
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center space-x-2 py-6 text-xs text-slate-500 font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-teal-800" />
          <span>Loading temporal observations...</span>
        </div>
      )}

      {/* Error / Empty State */}
      {!isLoading && errorMessage && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Single Scene State */}
      {!isLoading && !errorMessage && sortedScenes.length === 1 && (
        <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Only one suitable Sentinel-2 observation found for this range.</span>
        </div>
      )}

      {/* No Suitable Scenes State */}
      {!isLoading && !errorMessage && sortedScenes.length === 0 && (
        <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono text-center">
          No suitable Sentinel-2 observations found for this range.
        </div>
      )}

      {/* Multi-Scene Interactive Timeline (Requirement 4 & 5) */}
      {!isLoading && sortedScenes.length > 1 && (
        <div className="space-y-2 pt-1">
          {/* Timeline Visual Track: 2024 ─────●────●────●────●────●──── 2026 */}
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 px-1">
            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {minYear}
            </span>
            <div className="flex-1 mx-3 h-0.5 bg-slate-200 relative">
              <div className="absolute inset-0 bg-teal-800/30" />
            </div>
            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {maxYear}
            </span>
          </div>

          {/* Observation Points Grid / Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 pt-1">
            {sortedScenes.map((scene) => {
              const isBefore = scene.productId === selectedBeforeId;
              const isAfter = scene.productId === selectedAfterId;
              const dateObj = new Date(scene.acquisitionDate);

              return (
                <div
                  key={scene.productId}
                  className={`p-2.5 rounded border transition-all flex flex-col justify-between space-y-2 relative ${
                    isBefore
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30 shadow-2xs'
                      : isAfter
                      ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/30 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                  }`}
                >
                  {/* Status Tag Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      {scene.platform.replace('Sentinel-', 'S')}
                    </span>
                    {isBefore ? (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase tracking-tight">
                        ● BEFORE
                      </span>
                    ) : isAfter ? (
                      <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[9px] font-mono font-bold uppercase tracking-tight">
                        ● AFTER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-400">
                        {scene.tile}
                      </span>
                    )}
                  </div>

                  {/* Date & Metadata */}
                  <div>
                    <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">
                      {format(dateObj, 'MMM dd, yyyy').toUpperCase()}
                    </div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-500 mt-0.5">
                      <span className="flex items-center">
                        <Cloud className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                        {scene.cloudCover.toFixed(1)}%
                      </span>
                      <span>•</span>
                      <span>Tile {scene.tile}</span>
                    </div>
                  </div>

                  {/* Selection Buttons */}
                  <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isBefore || isReanalyzing}
                      onClick={() => handleSetBefore(scene)}
                      className={`py-0.5 text-[10px] font-mono font-semibold rounded text-center transition-colors cursor-pointer disabled:cursor-default ${
                        isBefore
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900'
                      }`}
                      title={`Select ${format(dateObj, 'yyyy-MM-dd')} as Before Scene`}
                    >
                      {isBefore ? 'Selected' : 'Set Before'}
                    </button>
                    <button
                      type="button"
                      disabled={isAfter || isReanalyzing || scene.cloudCover > 35}
                      onClick={() => handleSetAfter(scene)}
                      className={`py-0.5 text-[10px] font-mono font-semibold rounded text-center transition-colors cursor-pointer disabled:cursor-not-allowed ${
                        isAfter
                          ? 'bg-sky-600 text-white'
                          : scene.cloudCover > 35
                          ? 'bg-slate-100 text-slate-400 opacity-60'
                          : 'bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-900'
                      }`}
                      title={scene.cloudCover > 35 ? `Cloud cover (${scene.cloudCover.toFixed(1)}%) exceeds 35% threshold for visual AFTER scene` : `Select ${format(dateObj, 'yyyy-MM-dd')} as After Scene`}
                    >
                      {isAfter ? 'Selected' : scene.cloudCover > 35 ? 'Cloud >35%' : 'Set After'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
