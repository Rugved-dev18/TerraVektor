import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  Layers, 
  Eye, 
  EyeOff, 
  Calendar, 
  Cloud, 
  MapPin, 
  Download, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Tag, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Maximize2, 
  SplitSquareVertical, 
  Building2, 
  FileDown, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ChangeAnalysisResult, BuiltUpAnalysisResult, Sentinel2Product, CandidateRegion } from '../types';
import { exportEvidenceImage, EvidenceAnnotation } from '../utils/exportEvidenceImage';
import { exportAnalysisPdf } from '../utils/exportAnalysisPdf';
import { searchSentinel2, analyzeSentinel2Change, getSentinel2PreviewUrl, getChangeMaskUrl } from '../services/api';

interface EvidenceStudioProps {
  initialAnalysis?: ChangeAnalysisResult | BuiltUpAnalysisResult | null;
  initialBeforeProduct?: Sentinel2Product | null;
  initialAfterProduct?: Sentinel2Product | null;
  initialAoiBbox?: [number, number, number, number] | null;
  locationName?: string;
}

export const EvidenceStudio: React.FC<EvidenceStudioProps> = ({
  initialAnalysis = null,
  initialBeforeProduct = null,
  initialAfterProduct = null,
  initialAoiBbox = [73.70, 18.40, 74.05, 18.70],
  locationName = 'Pune Urban Region'
}) => {
  const [analysis, setAnalysis] = useState<ChangeAnalysisResult | BuiltUpAnalysisResult | null>(initialAnalysis);
  const [beforeProduct, setBeforeProduct] = useState<Sentinel2Product | null>(initialBeforeProduct);
  const [afterProduct, setAfterProduct] = useState<Sentinel2Product | null>(initialAfterProduct);
  const [aoiBbox, setAoiBbox] = useState<[number, number, number, number]>(initialAoiBbox || [73.70, 18.40, 74.05, 18.70]);

  // Loading states
  const [isLoadingScenes, setIsLoadingScenes] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Studio Display controls
  const [viewMode, setViewMode] = useState<'slider' | 'side_by_side' | 'difference_only'>('slider');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [showMask, setShowMask] = useState<boolean>(true);
  const [maskOpacity, setMaskOpacity] = useState<number>(0.65);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [showCandidateFootprints, setShowCandidateFootprints] = useState<boolean>(true);

  // Annotations state
  const [annotations, setAnnotations] = useState<EvidenceAnnotation[]>([
    {
      id: 'ann-1',
      type: 'point',
      label: 'Ground Disturbance Sector A',
      notes: 'Soil clearing and perimeter access road development observed between May and October acquisitions.',
      category: 'Ground Clearing',
      lat: aoiBbox ? (aoiBbox[1] + aoiBbox[3]) / 2 + 0.015 : 18.52,
      lon: aoiBbox ? (aoiBbox[0] + aoiBbox[2]) / 2 - 0.012 : 73.85,
      candidateId: 'candidate_b1',
      candidateMetrics: {
        areaM2: 24500,
        deltaNdvi: -0.28,
        deltaNdbi: 0.22,
        persistence: 'PERSISTENT'
      },
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm')
    }
  ]);

  // New annotation modal/form state
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [annLabel, setAnnLabel] = useState('');
  const [annNotes, setAnnNotes] = useState('');
  const [annCategory, setAnnCategory] = useState('Ground Clearing');
  const [annLat, setAnnLat] = useState<number>((aoiBbox[1] + aoiBbox[3]) / 2);
  const [annLon, setAnnLon] = useState<number>((aoiBbox[0] + aoiBbox[2]) / 2);
  const [selectedCandidateForAnn, setSelectedCandidateForAnn] = useState<CandidateRegion | null>(null);

  // Candidates extracted from analysis
  const candidateList: CandidateRegion[] = analysis && 'candidates' in analysis && Array.isArray((analysis as any).candidates)
    ? (analysis as any).candidates
    : [];

  // Auto-fetch fallback scenes if none provided
  useEffect(() => {
    if (!beforeProduct || !afterProduct) {
      loadFallbackScenes();
    }
  }, []);

  const loadFallbackScenes = async () => {
    setIsLoadingScenes(true);
    try {
      const searchRes = await searchSentinel2({
        bbox: aoiBbox,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        max_cloud_cover: 30,
        product_type: 'S2MSI2A',
        limit: 10
      });

      if (searchRes.results.length >= 2) {
        const sorted = [...searchRes.results].sort(
          (a, b) => new Date(a.acquisition_date).getTime() - new Date(b.acquisition_date).getTime()
        );
        const bProd = sorted[0];
        const aProd = sorted[sorted.length - 1];
        setBeforeProduct(bProd);
        setAfterProduct(aProd);

        // Run change analysis if none provided
        if (!analysis) {
          const res = await analyzeSentinel2Change(bProd.id, aProd.id, aoiBbox, 'ndvi_differencing');
          setAnalysis(res);
        }
      }
    } catch (err) {
      console.error('EvidenceStudio fallback load failed:', err);
    } finally {
      setIsLoadingScenes(false);
    }
  };

  // Image URLs
  const beforeUrl = beforeProduct ? getSentinel2PreviewUrl(beforeProduct.id) : '';
  const afterUrl = afterProduct ? getSentinel2PreviewUrl(afterProduct.id) : '';
  const maskUrl = analysis ? (analysis as any).change_mask_url : '';

  // Add Annotation Handler
  const handleSaveAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annLabel.trim()) return;

    const newAnn: EvidenceAnnotation = {
      id: `ann-${Date.now()}`,
      type: 'point',
      label: annLabel.trim(),
      notes: annNotes.trim() || 'No additional investigator notes recorded.',
      category: annCategory,
      lat: Number(annLat),
      lon: Number(annLon),
      candidateId: selectedCandidateForAnn ? selectedCandidateForAnn.id : undefined,
      candidateMetrics: selectedCandidateForAnn ? {
        areaM2: selectedCandidateForAnn.area_m2,
        deltaNdvi: selectedCandidateForAnn.mean_delta_ndvi ?? selectedCandidateForAnn.delta_ndvi,
        deltaNdbi: selectedCandidateForAnn.mean_delta_ndbi ?? selectedCandidateForAnn.delta_ndbi,
        persistence: selectedCandidateForAnn.persistence_status || 'ANALYZED'
      } : undefined,
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm')
    };

    setAnnotations(prev => [newAnn, ...prev]);
    setIsAddingAnnotation(false);
    setAnnLabel('');
    setAnnNotes('');
    setSelectedCandidateForAnn(null);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const handleSelectCandidateToAnnotate = (cand: CandidateRegion) => {
    setSelectedCandidateForAnn(cand);
    setAnnLabel(`Candidate ${cand.id} - ${cand.display_name || cand.type}`);
    if (cand.centroid) {
      setAnnLon(cand.centroid[0]);
      setAnnLat(cand.centroid[1]);
    }
    setAnnCategory(cand.type.includes('construction') ? 'Construction Candidate' : 'Spectral Built-Up Shift');
    setAnnNotes(`Detected footprint of ${cand.area_m2?.toLocaleString() || 'N/A'} m² with ΔNDVI ${cand.mean_delta_ndvi?.toFixed(3) || 'N/A'} and ΔNDBI +${cand.mean_delta_ndbi?.toFixed(3) || 'N/A'}.`);
    setIsAddingAnnotation(true);
  };

  // Export Handlers
  const handleExportPng = async () => {
    setIsExportingPng(true);
    setExportNotice(null);
    try {
      await exportEvidenceImage({
        beforeImageUrl: beforeUrl,
        afterImageUrl: afterUrl,
        changeMaskUrl: maskUrl,
        beforeDate: beforeProduct?.acquisition_date ? format(new Date(beforeProduct.acquisition_date), 'yyyy-MM-dd HH:mm') : 'N/A',
        afterDate: afterProduct?.acquisition_date ? format(new Date(afterProduct.acquisition_date), 'yyyy-MM-dd HH:mm') : 'N/A',
        beforeSceneId: beforeProduct?.name || beforeProduct?.id,
        afterSceneId: afterProduct?.name || afterProduct?.id,
        locationName,
        aoiBbox,
        annotations,
        metrics: {
          changePercentage: (analysis as any)?.change_percentage ? Number(((analysis as any).change_percentage * (analysis && 'classification' in analysis ? 1 : 100)).toFixed(1)) : undefined,
          method: (analysis as any)?.processing_method || '10m Sentinel-2 NDVI/NDBI Differencing'
        }
      });
      setExportNotice('High-resolution PNG evidence record downloaded successfully.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to export evidence PNG:', err);
      setExportNotice('Failed to generate evidence image composite.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleExportPdf = () => {
    if (!analysis) return;
    setIsExportingPdf(true);
    setExportNotice(null);
    try {
      exportAnalysisPdf({
        analysis: analysis as ChangeAnalysisResult,
        beforeProduct,
        afterProduct,
        aoiBbox,
        locationName,
        annotations
      });
      setExportNotice('Forensic PDF dossier exported with investigator annotations.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to export PDF dossier:', err);
      setExportNotice('Failed to export PDF summary.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto select-none">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-teal-800 uppercase tracking-wider font-mono">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Evidence Visualization Studio</span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-slate-500 font-sans font-normal">Authentic Multi-Temporal Inspection</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Satellite Change Evidence & Presentation Studio
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Inspect real Sentinel-2 Level-2A radiometric differences, annotate suspected physical changes, and export forensic dossier evidence records.
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExportingPng || !beforeProduct || !afterProduct}
              className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Download high-resolution composite PNG image"
            >
              {isExportingPng ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Compositing Canvas...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Evidence Image (PNG)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf || !analysis}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 text-xs font-semibold rounded border border-slate-300 shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Download comprehensive PDF report including analyst annotations"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-teal-800" />
                  <span>Export Dossier (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notice Message */}
        {exportNotice && (
          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Scene Identification Bar */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Location / AOI</span>
            <div className="font-bold text-slate-800 mt-0.5 truncate">{locationName}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              [{aoiBbox[0].toFixed(3)}°E, {aoiBbox[1].toFixed(3)}°N]
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <span className="text-[10px] text-emerald-700 font-mono uppercase block font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Baseline Scene (Before)
            </span>
            <div className="font-bold text-slate-800 mt-0.5 font-mono">
              {beforeProduct ? format(new Date(beforeProduct.acquisition_date), 'yyyy-MM-dd HH:mm') : 'Loading...'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
              {beforeProduct ? beforeProduct.name.slice(0, 28) : 'S2 MSI L2A'} ({beforeProduct?.cloud_cover ?? 0}% cloud)
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <span className="text-[10px] text-sky-700 font-mono uppercase block font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              Monitoring Scene (After)
            </span>
            <div className="font-bold text-slate-800 mt-0.5 font-mono">
              {afterProduct ? format(new Date(afterProduct.acquisition_date), 'yyyy-MM-dd HH:mm') : 'Loading...'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
              {afterProduct ? afterProduct.name.slice(0, 28) : 'S2 MSI L2A'} ({afterProduct?.cloud_cover ?? 0}% cloud)
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <span className="text-[10px] text-teal-800 font-mono uppercase block font-semibold">Analytical Change Shift</span>
            <div className="font-bold text-amber-700 mt-0.5 font-mono">
              {analysis ? `${((analysis as any).change_percentage * (('classification' in analysis) ? 1 : 100)).toFixed(1)}% altered` : 'Pending...'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Method: 10m Normalized Differencing
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Studio Interactive Canvas Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Viewport & Inspection Stage (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Controls Dock */}
          <div className="bg-white border border-slate-200 rounded-md p-2 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* View Mode */}
            <div className="flex items-center bg-slate-100 rounded p-0.5 font-medium border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === 'slider' ? 'bg-teal-800 text-white font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                Swipe Slider
              </button>
              <button
                type="button"
                onClick={() => setViewMode('side_by_side')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === 'side_by_side' ? 'bg-teal-800 text-white font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                Side-by-Side Dual
              </button>
              <button
                type="button"
                onClick={() => setViewMode('difference_only')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === 'difference_only' ? 'bg-teal-800 text-white font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                Change Mask Only
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowMask(!showMask)}
                className={`px-2 py-1 rounded border text-xs font-medium flex items-center gap-1 transition-colors ${
                  showMask ? 'bg-orange-50 text-orange-900 border-orange-300' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {showMask ? <Eye className="w-3.5 h-3.5 text-orange-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                <span>Spectral Mask</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={`px-2 py-1 rounded border text-xs font-medium flex items-center gap-1 transition-colors ${
                  showAnnotations ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Annotations ({annotations.length})</span>
              </button>

              {showMask && (
                <div className="flex items-center space-x-1 pl-1">
                  <span className="text-[10px] text-slate-500 font-mono">Opacity:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={maskOpacity}
                    onChange={(e) => setMaskOpacity(Number(e.target.value))}
                    className="w-16 accent-teal-800 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-700 w-6">{Math.round(maskOpacity * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Inspection Canvas Display */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden relative shadow-md min-h-[480px] flex items-center justify-center">
            {isLoadingScenes ? (
              <div className="text-center p-12 text-slate-400 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-400" />
                <p className="text-xs font-mono">Loading authentic Sentinel-2 Level-2A radiometric rasters...</p>
              </div>
            ) : viewMode === 'side_by_side' ? (
              <div className="grid grid-cols-2 w-full h-[540px] divide-x divide-slate-700">
                {/* Baseline Left */}
                <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
                  {beforeUrl ? (
                    <img 
                      src={beforeUrl} 
                      alt="Baseline Scene" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Baseline raster not available</span>
                  )}
                  <div className="absolute top-2 left-2 bg-slate-900/90 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                    BASELINE: {beforeProduct ? format(new Date(beforeProduct.acquisition_date), 'yyyy-MM-dd') : 'S2'}
                  </div>
                </div>

                {/* Monitoring Right */}
                <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
                  {afterUrl ? (
                    <img 
                      src={afterUrl} 
                      alt="Monitoring Scene" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Monitoring raster not available</span>
                  )}
                  {showMask && maskUrl && (
                    <img 
                      src={maskUrl} 
                      alt="Computed Change Mask" 
                      style={{ opacity: maskOpacity }}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen"
                    />
                  )}
                  <div className="absolute top-2 left-2 bg-slate-900/90 text-sky-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-sky-500/40">
                    MONITORING: {afterProduct ? format(new Date(afterProduct.acquisition_date), 'yyyy-MM-dd') : 'S2'}
                  </div>

                  {/* Render Annotations Overlay on After Image */}
                  {showAnnotations && annotations.map((ann, idx) => {
                    const minLon = aoiBbox[0];
                    const minLat = aoiBbox[1];
                    const maxLon = aoiBbox[2];
                    const maxLat = aoiBbox[3];
                    const leftPct = ((ann.lon - minLon) / (maxLon - minLon || 1)) * 100;
                    const topPct = (1 - (ann.lat - minLat) / (maxLat - minLat || 1)) * 100;

                    return (
                      <div
                        key={ann.id}
                        style={{
                          left: `${Math.max(5, Math.min(95, leftPct))}%`,
                          top: `${Math.max(5, Math.min(95, topPct))}%`
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group pointer-events-auto cursor-pointer z-20"
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-dashed border-amber-400 bg-amber-500/80 flex items-center justify-center text-white font-bold text-[10px] shadow-lg animate-pulse">
                          {idx + 1}
                        </div>
                        <div className="hidden group-hover:block absolute left-7 top-1/2 -translate-y-1/2 bg-slate-900/95 text-white p-2 rounded text-[11px] font-mono border border-amber-400/80 shadow-xl w-48 pointer-events-none z-30">
                          <div className="text-amber-300 font-bold">[ANN-{idx + 1}] {ann.label}</div>
                          <div className="text-slate-400 text-[9px] mt-0.5 font-sans">{ann.notes}</div>
                          <div className="text-slate-500 text-[9px] mt-1">{ann.lat.toFixed(4)}°N, {ann.lon.toFixed(4)}°E</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : viewMode === 'difference_only' ? (
              <div className="relative w-full h-[540px] flex items-center justify-center bg-black">
                {maskUrl ? (
                  <img 
                    src={maskUrl} 
                    alt="Computed Difference Mask" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-slate-500 text-xs font-mono">No change mask available</div>
                )}
                <div className="absolute top-3 left-3 bg-slate-900/90 text-orange-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded border border-orange-500/40">
                  PURE SPECTRAL CHANGE MASK (NDVI / NDBI DIFFERENCING)
                </div>
              </div>
            ) : (
              /* Swipe Slider Mode */
              <div className="relative w-full h-[540px] overflow-hidden bg-slate-950">
                {/* Baseline Layer (Full width behind) */}
                <div 
                  className="absolute inset-0 w-full h-full"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  {beforeUrl && (
                    <img 
                      src={beforeUrl} 
                      alt="Baseline Scene" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-3 left-3 bg-slate-900/90 text-emerald-300 text-xs font-mono font-bold px-2.5 py-1 rounded border border-emerald-500/40">
                    BASELINE: {beforeProduct ? format(new Date(beforeProduct.acquisition_date), 'yyyy-MM-dd') : 'S2'}
                  </div>
                </div>

                {/* Monitoring Layer (Clipped to right of slider) */}
                <div 
                  className="absolute inset-0 w-full h-full"
                  style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                >
                  {afterUrl && (
                    <img 
                      src={afterUrl} 
                      alt="Monitoring Scene" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  {showMask && maskUrl && (
                    <img 
                      src={maskUrl} 
                      alt="Change Mask" 
                      style={{ opacity: maskOpacity }}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen"
                    />
                  )}
                  <div className="absolute bottom-3 right-3 bg-slate-900/90 text-sky-300 text-xs font-mono font-bold px-2.5 py-1 rounded border border-sky-500/40">
                    MONITORING: {afterProduct ? format(new Date(afterProduct.acquisition_date), 'yyyy-MM-dd') : 'S2'}
                  </div>
                </div>

                {/* Draggable Divider Line */}
                <div 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none"
                  style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-[2px] h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-300 shadow-lg flex items-center justify-center text-teal-800">
                    <Sliders className="w-4 h-4 rotate-90" />
                  </div>
                </div>

                {/* Slider Input overlay */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
                  aria-label="Swipe comparison slider"
                />

                {/* Annotations Marker Overlay in Slider Mode */}
                {showAnnotations && annotations.map((ann, idx) => {
                  const minLon = aoiBbox[0];
                  const minLat = aoiBbox[1];
                  const maxLon = aoiBbox[2];
                  const maxLat = aoiBbox[3];
                  const leftPct = ((ann.lon - minLon) / (maxLon - minLon || 1)) * 100;
                  const topPct = (1 - (ann.lat - minLat) / (maxLat - minLat || 1)) * 100;

                  return (
                    <div
                      key={ann.id}
                      style={{
                        left: `${Math.max(5, Math.min(95, leftPct))}%`,
                        top: `${Math.max(5, Math.min(95, topPct))}%`
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group pointer-events-auto cursor-pointer z-35"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-dashed border-amber-400 bg-amber-500/80 flex items-center justify-center text-white font-bold text-[10px] shadow-lg animate-pulse">
                        {idx + 1}
                      </div>
                      <div className="hidden group-hover:block absolute left-7 top-1/2 -translate-y-1/2 bg-slate-900/95 text-white p-2.5 rounded text-[11px] font-mono border border-amber-400 shadow-xl w-52 pointer-events-none z-50">
                        <div className="text-amber-300 font-bold">[ANN-{idx + 1}] {ann.label}</div>
                        <div className="text-slate-300 text-[10px] mt-1 font-sans">{ann.notes}</div>
                        <div className="text-slate-500 text-[9px] mt-1">{ann.lat.toFixed(4)}°N, {ann.lon.toFixed(4)}°E</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scientific Legend & Distinction Banner */}
          <div className="p-3 bg-white border border-slate-200 rounded-md text-xs shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-800 uppercase tracking-wide font-mono text-[10px]">
                EVIDENCE LAYER SEPARATION & LEGEND
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Verified Pipeline Artifacts</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 font-mono text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>COMPUTED ANALYTICAL DATA</span>
                </div>
                <p className="text-slate-600 font-sans text-[11px]">
                  Deterministic Sentinel-2 L2A BOA Surface Reflectance. Automatic radiometric NDVI/NDBI differencing and contiguous 10m candidate clustering.
                </p>
              </div>

              <div className="p-2 bg-amber-50/70 border border-amber-200 rounded space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 font-mono text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm border border-amber-600 bg-amber-400 inline-block" />
                  <span>INVESTIGATOR PRESENTATION ANNOTATIONS</span>
                </div>
                <p className="text-slate-600 font-sans text-[11px]">
                  Manual human analyst markers, observation notes, and hypotheses. Stored strictly on a separate presentation layer without modifying analytical pixels.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Annotations Manager & Candidate Bridge (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Add Annotation Card */}
          <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-800" />
                <span>Investigator Annotations</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                className="px-2 py-0.5 bg-teal-800 hover:bg-teal-900 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingAnnotation ? 'Cancel' : 'New Note'}</span>
              </button>
            </div>

            {/* Quick Candidate Attacher */}
            {candidateList.length > 0 && (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                  Quick-Annotate Detected Candidates:
                </span>
                <div className="flex flex-wrap gap-1">
                  {candidateList.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCandidateToAnnotate(c)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white hover:bg-teal-50 hover:text-teal-900 border border-slate-300 text-slate-700 transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <Building2 className="w-2.5 h-2.5 text-teal-700" />
                      <span>{c.id} ({c.area_m2 ? `${(c.area_m2 / 10000).toFixed(1)} ha` : 'Change'})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form to Add / Edit Annotation */}
            {isAddingAnnotation && (
              <form onSubmit={handleSaveAnnotation} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2.5">
                <div className="text-[11px] font-bold text-slate-800 uppercase font-mono">
                  {selectedCandidateForAnn ? `Annotate Candidate ${selectedCandidateForAnn.id}` : 'Create Spatial Annotation'}
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Label / Title</label>
                  <input
                    type="text"
                    required
                    value={annLabel}
                    onChange={(e) => setAnnLabel(e.target.value)}
                    placeholder="e.g. Cleared Site Perimeter"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Category</label>
                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:border-teal-700 font-mono"
                  >
                    <option value="Ground Clearing">Ground Clearing</option>
                    <option value="Construction Candidate">Construction Candidate</option>
                    <option value="Excavation Staging">Excavation Staging</option>
                    <option value="Vegetation Disturbance">Vegetation Disturbance</option>
                    <option value="Road or Access Track">Road or Access Track</option>
                    <option value="Water Boundary Alteration">Water Boundary Alteration</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Latitude (°N)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={annLat}
                      onChange={(e) => setAnnLat(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Longitude (°E)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={annLon}
                      onChange={(e) => setAnnLon(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Investigator Findings & Observations</label>
                  <textarea
                    rows={2}
                    value={annNotes}
                    onChange={(e) => setAnnNotes(e.target.value)}
                    placeholder="Short observations, physical interpretation, or cross-checks..."
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-hidden focus:border-teal-700"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAnnotation(false);
                      setSelectedCandidateForAnn(null);
                    }}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-800 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-semibold shadow-2xs"
                  >
                    Save Annotation
                  </button>
                </div>
              </form>
            )}

            {/* List of Existing Annotations */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {annotations.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-xs font-mono">
                  No annotations added yet.
                </div>
              ) : (
                annotations.map((ann, idx) => (
                  <div
                    key={ann.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded text-xs space-y-1.5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{ann.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnotation(ann.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                        title="Delete Annotation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                      <span>{ann.lat.toFixed(4)}°N, {ann.lon.toFixed(4)}°E</span>
                      <span>&bull;</span>
                      <span className="text-teal-800 font-semibold">{ann.category}</span>
                    </div>

                    <p className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 leading-relaxed font-sans">
                      "{ann.notes}"
                    </p>

                    {ann.candidateMetrics?.areaM2 && (
                      <div className="text-[10px] font-mono text-slate-600 flex items-center gap-2 pt-0.5">
                        <span>Area: <strong className="text-slate-800">{ann.candidateMetrics.areaM2.toLocaleString()} m²</strong></span>
                        <span>ΔNDVI: <strong className="text-emerald-700">{ann.candidateMetrics.deltaNdvi?.toFixed(3)}</strong></span>
                        <span>ΔNDBI: <strong className="text-amber-700">+{ann.candidateMetrics.deltaNdbi?.toFixed(3)}</strong></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scientific Disclaimer Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 space-y-1.5 font-sans leading-relaxed">
            <div className="flex items-center space-x-1.5 text-slate-800 font-bold font-mono text-xs">
              <Info className="w-3.5 h-3.5 text-teal-800" />
              <span>Scientific Integrity & Evidence Protocol</span>
            </div>
            <p>
              Radiometric anomalies denote spectral variance (vegetation loss, bare ground exposure, moisture fluctuations). They do not constitute certified construction or legal ground truth without physical field verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceStudio;
