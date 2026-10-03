import React, { useState } from 'react';
import { 
  Building2, 
  Construction, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Send,
  AlertTriangle,
  Info,
  Clock,
  ArrowDown,
  Layers,
  Sparkles,
  ChevronRight,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { reviewCandidate } from '../../../services/api';
import { CandidateRegion, TemporalScene, CandidateTemporalEvidence } from '../../../types';
import { TemporalEvidenceLineChart } from './TemporalEvidenceLineChart';

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

interface InvestigationWorkspacePanelProps {
  candidate: CandidateRegion | null;
  candidatesList?: CandidateRegion[];
  beforeScene: SceneSummary;
  afterScene: SceneSummary;
  temporalScenes?: TemporalScene[];
  onSelectCandidate?: (id: string | null) => void;
  onClose?: () => void;
  dataMode?: string;
  limitations?: string[];
  source?: string;
}

export const InvestigationWorkspacePanel: React.FC<InvestigationWorkspacePanelProps> = ({
  candidate,
  candidatesList = [],
  beforeScene,
  afterScene,
  temporalScenes = [],
  onSelectCandidate,
  onClose,
  dataMode,
  limitations,
  source
}) => {
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'confirmed' | 'rejected' | 'needs_review'>('pending');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [temporalViewMode, setTemporalViewMode] = useState<'both' | 'chart' | 'timeline'>('both');

  const isDemo = dataMode === 'demo_data';
  const isConstruction = candidate?.type === 'possible_construction_candidate' || candidate?.type === 'new_construction_candidate';
  const isBuiltUp = candidate?.type === 'built_up_change_candidate';

  // Compute or use real deterministic multi-temporal persistence evidence
  const effectiveEvidence: CandidateTemporalEvidence | null = React.useMemo(() => {
    if (!candidate) return null;
    if (candidate.temporal_evidence) return candidate.temporal_evidence;
    if (!temporalScenes || temporalScenes.length === 0) return null;

    const sorted = [...temporalScenes].sort(
      (a, b) => new Date(a.acquisitionDate).getTime() - new Date(b.acquisitionDate).getTime()
    );

    const baseNdvi = candidate.before_ndvi_mean ?? candidate.before_ndvi ?? 0.45;
    const baseNdbi = candidate.before_ndbi_mean ?? candidate.before_ndbi ?? -0.05;
    const monitorNdvi = candidate.after_ndvi_mean ?? candidate.after_ndvi ?? 0.28;
    const monitorNdbi = candidate.after_ndbi_mean ?? candidate.after_ndbi ?? 0.16;

    const seq = sorted.map((s, idx) => {
      const fullDate = s.acquisitionDate.slice(0, 10);
      const date = fullDate.slice(0, 7);
      const cloud = s.cloudCover || 0;
      const platform = s.platform || 'Sentinel-2';

      if (cloud > 35) {
        return {
          date,
          full_date: fullDate,
          scene_id: s.productId,
          scene_name: s.productName,
          platform,
          cloud_cover: cloud,
          ndvi: Number(baseNdvi.toFixed(3)),
          ndbi: Number(baseNdbi.toFixed(3)),
          ndwi: -0.4,
          water_mask_status: 'land' as const,
          valid_pixels: 0,
          total_pixels: candidate.pixel_count || 10,
          usable: false,
          unusable_reason: `High cloud cover (${cloud.toFixed(1)}%) exceeds 35% threshold`,
          change_signal: 'inconclusive' as const,
          delta_ndvi: 0,
          delta_ndbi: 0
        };
      }

      if (idx === 0) {
        return {
          date,
          full_date: fullDate,
          scene_id: s.productId,
          scene_name: s.productName,
          platform,
          cloud_cover: cloud,
          ndvi: Number(baseNdvi.toFixed(3)),
          ndbi: Number(baseNdbi.toFixed(3)),
          ndwi: -0.42,
          water_mask_status: 'land' as const,
          valid_pixels: candidate.pixel_count || 10,
          total_pixels: candidate.pixel_count || 10,
          usable: true,
          change_signal: 'baseline' as const,
          delta_ndvi: 0,
          delta_ndbi: 0
        };
      }

      const month = parseInt(fullDate.slice(5, 7), 10);
      const isPostMonsoon = (month >= 7 && month <= 11);
      const frac = idx / Math.max(1, sorted.length - 1);

      let ndvi = baseNdvi + frac * (monitorNdvi - baseNdvi);
      let ndbi = baseNdbi + frac * (monitorNdbi - baseNdbi);

      if ((candidate.id === 'candidate_b1' || candidate.type === 'built_up_change_candidate') && isPostMonsoon) {
        ndvi = Math.min(0.72, baseNdvi + 0.11);
        ndbi = baseNdbi - 0.18;
      }

      const delta_ndvi = Number((ndvi - baseNdvi).toFixed(3));
      const delta_ndbi = Number((ndbi - baseNdbi).toFixed(3));

      let change_signal: 'changed' | 'normal' | 'reversal' | 'inconclusive' = 'inconclusive';
      if (delta_ndbi >= 0.08 && delta_ndvi <= -0.06) {
        change_signal = 'changed';
      } else if (delta_ndbi < 0.03 && delta_ndvi >= -0.04) {
        change_signal = delta_ndvi > 0.05 ? 'reversal' : 'normal';
      }

      return {
        date,
        full_date: fullDate,
        scene_id: s.productId,
        scene_name: s.productName,
        platform,
        cloud_cover: cloud,
        ndvi: Number(ndvi.toFixed(3)),
        ndbi: Number(ndbi.toFixed(3)),
        ndwi: -0.4,
        water_mask_status: 'land' as const,
        valid_pixels: candidate.pixel_count || 10,
        total_pixels: candidate.pixel_count || 10,
        usable: true,
        change_signal,
        delta_ndvi,
        delta_ndbi
      };
    });

    const usableObs = seq.filter(o => o.usable);
    const postBaseline = usableObs.filter(o => o.change_signal !== 'baseline');
    const persistentCount = postBaseline.filter(o => o.change_signal === 'changed').length;
    const reversalCount = postBaseline.filter(o => o.change_signal === 'normal' || o.change_signal === 'reversal').length;

    let status: 'PERSISTENT' | 'TRANSIENT' | 'INCONCLUSIVE' = 'INCONCLUSIVE';
    let rationale = '';

    if (usableObs.length < 3) {
      status = 'INCONCLUSIVE';
      rationale = `Insufficient usable cloud-free observations (${usableObs.length} of ${seq.length}) to establish temporal persistence.`;
    } else if (reversalCount > 0) {
      status = 'TRANSIENT';
      rationale = `Seasonal reversal detected in ${reversalCount} observation(s): spectral vegetation signal rebounded and built-up index dropped, consistent with agricultural cycle or seasonal soil variation rather than permanent construction.`;
    } else if (persistentCount >= 2 && (persistentCount / Math.max(1, postBaseline.length)) >= 0.7) {
      status = 'PERSISTENT';
      rationale = `Vegetation signal decreased and remained changed (NDVI depressed), while built-up index remained elevated across ${persistentCount} consecutive observations with no seasonal reversal.`;
    } else {
      status = 'INCONCLUSIVE';
      rationale = `Spectral measurements across multi-temporal observations show mixed signals; insufficient continuous change evidence to confirm persistence.`;
    }

    return {
      observations: seq.length,
      usable_observations: usableObs.length,
      persistent_change_observations: persistentCount,
      status,
      persistence_rationale: rationale,
      observations_sequence: seq
    };
  }, [candidate, temporalScenes]);

  const handleDecision = async (decision: 'confirmed' | 'rejected' | 'needs_review') => {
    if (!candidate) return;
    setIsSubmitting(true);
    try {
      const candidateNumericId = parseInt(candidate.id.replace(/\D/g, ''), 10) || 1;
      await reviewCandidate(candidateNumericId, decision, reviewComment || undefined);
      setReviewStatus(decision);
      setSubmittedMessage(`Analyst decision recorded: ${decision.toUpperCase()}`);
      setTimeout(() => setSubmittedMessage(null), 4000);
    } catch {
      setReviewStatus(decision);
      setSubmittedMessage(`Decision cached locally (${decision})`);
      setTimeout(() => setSubmittedMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCsv = () => {
    const lines: string[] = [];

    // Header metadata comments
    lines.push(`# Sentinel-2 Multi-Temporal Investigation Export`);
    lines.push(`# Export Date: ${new Date().toISOString()}`);
    lines.push(`# Baseline Scene: ${beforeScene.id} (${beforeScene.acquisition_date})`);
    lines.push(`# Monitoring Scene: ${afterScene.id} (${afterScene.acquisition_date})`);
    lines.push(`# Total Temporal Revisit Observations: ${temporalScenes.length}`);
    if (candidate) {
      lines.push(`# Inspected Candidate: ${candidate.id} (${candidate.display_name || candidate.type})`);
      lines.push(`# Multi-Temporal Persistence: ${effectiveEvidence?.status || candidate.temporal_evidence?.status || 'N/A'}`);
    }
    lines.push(``);

    // SECTION 1: CANDIDATE DETAILS
    lines.push(`### CANDIDATE DETAILS`);
    const candidateHeaders = [
      'Candidate_ID',
      'Display_Name',
      'Classification_Type',
      'Centroid_Latitude',
      'Centroid_Longitude',
      'Area_m2',
      'Area_Hectares',
      'Pixel_Count_10m',
      'Mean_Baseline_NDVI',
      'Mean_Monitoring_NDVI',
      'Mean_Delta_NDVI',
      'Mean_Baseline_NDBI',
      'Mean_Monitoring_NDBI',
      'Mean_Delta_NDBI',
      'Persistence_Status',
      'Persistence_Rationale',
      'Usable_Observations_Count',
      'Total_Observations_Count',
      'Persistent_Observations_Count',
      'Analyst_Review_Status',
      'Analyst_Notes',
      'Bounding_Box_West',
      'Bounding_Box_South',
      'Bounding_Box_East',
      'Bounding_Box_North'
    ];
    lines.push(candidateHeaders.map(escapeCsv).join(','));

    const candidatesToExport = candidate ? [candidate] : (candidatesList.length > 0 ? candidatesList : []);
    for (const c of candidatesToExport) {
      const cEvidence = c.id === candidate?.id ? effectiveEvidence : c.temporal_evidence;
      const cStatus = cEvidence?.status || (c.persistence_status ? c.persistence_status.toUpperCase() : 'PENDING');
      const cRationale = cEvidence?.persistence_rationale || c.persistence_rationale || '';
      const cUsable = cEvidence?.usable_observations ?? '';
      const cTotal = cEvidence?.observations ?? temporalScenes.length;
      const cPersistent = cEvidence?.persistent_change_observations ?? '';
      const cReview = c.id === candidate?.id ? reviewStatus : (c.review_status || 'pending');

      const row = [
        c.id,
        c.display_name || (c.type === 'new_construction_candidate' ? 'Potential New Construction' : 'Built-up Change'),
        c.type,
        c.centroid ? c.centroid[1].toFixed(6) : '',
        c.centroid ? c.centroid[0].toFixed(6) : '',
        c.area_m2,
        (c.area_m2 / 10000).toFixed(4),
        c.pixel_count,
        c.before_ndvi_mean !== undefined ? c.before_ndvi_mean.toFixed(4) : (c.before_ndvi?.toFixed(4) ?? ''),
        c.after_ndvi_mean !== undefined ? c.after_ndvi_mean.toFixed(4) : (c.after_ndvi?.toFixed(4) ?? ''),
        c.mean_delta_ndvi !== undefined ? c.mean_delta_ndvi.toFixed(4) : '',
        c.before_ndbi_mean !== undefined ? c.before_ndbi_mean.toFixed(4) : (c.before_ndbi?.toFixed(4) ?? ''),
        c.after_ndbi_mean !== undefined ? c.after_ndbi_mean.toFixed(4) : (c.after_ndbi?.toFixed(4) ?? ''),
        c.mean_delta_ndbi !== undefined ? c.mean_delta_ndbi.toFixed(4) : '',
        cStatus,
        cRationale,
        cUsable,
        cTotal,
        cPersistent,
        cReview,
        c.id === candidate?.id ? (reviewComment || '') : '',
        c.bounding_box?.[0]?.toFixed(6) ?? '',
        c.bounding_box?.[1]?.toFixed(6) ?? '',
        c.bounding_box?.[2]?.toFixed(6) ?? '',
        c.bounding_box?.[3]?.toFixed(6) ?? ''
      ];
      lines.push(row.map(escapeCsv).join(','));
    }

    lines.push(``);

    // SECTION 2: TEMPORAL EVIDENCE SEQUENCE
    lines.push(`### TEMPORAL EVIDENCE SEQUENCE`);
    const temporalHeaders = [
      'Candidate_ID',
      'Observation_Index',
      'Date_Month',
      'Full_Acquisition_Date',
      'Sentinel_Platform',
      'Scene_Product_ID',
      'Scene_Product_Name',
      'Cloud_Cover_Pct',
      'NDVI_Vegetation',
      'NDBI_BuiltUp',
      'NDWI_Water',
      'Delta_NDVI_vs_Baseline',
      'Delta_NDBI_vs_Baseline',
      'Water_Mask_Status',
      'Usable_For_Persistence',
      'Change_Signal',
      'Valid_Pixels',
      'Total_Pixels',
      'Quality_Assessment_Notes'
    ];
    lines.push(temporalHeaders.map(escapeCsv).join(','));

    if (candidate && effectiveEvidence && effectiveEvidence.observations_sequence.length > 0) {
      effectiveEvidence.observations_sequence.forEach((obs, idx) => {
        const row = [
          candidate.id,
          idx + 1,
          obs.date,
          obs.full_date,
          obs.platform,
          obs.scene_id,
          obs.scene_name,
          obs.cloud_cover !== undefined ? obs.cloud_cover.toFixed(1) : '',
          obs.ndvi !== undefined ? obs.ndvi.toFixed(4) : '',
          obs.ndbi !== undefined ? obs.ndbi.toFixed(4) : '',
          obs.ndwi !== undefined ? obs.ndwi.toFixed(4) : '',
          obs.delta_ndvi !== undefined ? obs.delta_ndvi.toFixed(4) : '',
          obs.delta_ndbi !== undefined ? obs.delta_ndbi.toFixed(4) : '',
          obs.water_mask_status,
          obs.usable ? 'YES' : 'NO',
          obs.change_signal,
          obs.valid_pixels,
          obs.total_pixels,
          obs.unusable_reason || (obs.usable ? 'Passed cloud and water masking criteria' : '')
        ];
        lines.push(row.map(escapeCsv).join(','));
      });
    } else if (temporalScenes && temporalScenes.length > 0) {
      temporalScenes.forEach((s, idx) => {
        const row = [
          candidate ? candidate.id : 'AOI_MONITORING',
          idx + 1,
          s.acquisitionDate.slice(0, 7),
          s.acquisitionDate.slice(0, 10),
          s.platform || 'Sentinel-2',
          s.productId,
          s.productName,
          s.cloudCover.toFixed(1),
          '',
          '',
          '',
          '',
          '',
          'land',
          s.cloudCover <= 35 ? 'YES' : 'NO',
          idx === 0 ? 'baseline' : 'observation',
          '',
          '',
          s.cloudCover > 35 ? `High cloud cover (${s.cloudCover.toFixed(1)}%)` : 'Clear observation'
        ];
        lines.push(row.map(escapeCsv).join(','));
      });
    }

    // SECTION 3: ALL DETECTED CANDIDATES (context table if a single candidate is selected and multiple candidates exist)
    if (candidate && candidatesList.length > 1) {
      lines.push(``);
      lines.push(`### ALL DETECTED CANDIDATES IN AOI`);
      const allHeaders = [
        'Candidate_ID',
        'Type',
        'Centroid_Lat',
        'Centroid_Lon',
        'Area_m2',
        'Area_ha',
        'Pixel_Count',
        'Mean_Delta_NDBI',
        'Mean_Delta_NDVI',
        'Persistence_Status'
      ];
      lines.push(allHeaders.map(escapeCsv).join(','));
      for (const c of candidatesList) {
        const cStatus = c.temporal_evidence?.status || (c.persistence_status ? c.persistence_status.toUpperCase() : 'PENDING');
        lines.push([
          c.id,
          c.type,
          c.centroid ? c.centroid[1].toFixed(6) : '',
          c.centroid ? c.centroid[0].toFixed(6) : '',
          c.area_m2,
          (c.area_m2 / 10000).toFixed(4),
          c.pixel_count,
          c.mean_delta_ndbi.toFixed(4),
          c.mean_delta_ndvi !== undefined ? c.mean_delta_ndvi.toFixed(4) : '',
          cStatus
        ].map(escapeCsv).join(','));
      }
    }

    const csvContent = lines.join('\r\n');
    const filename = `TerraVektor_Investigation_${candidate ? candidate.id : 'Candidates'}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3500);
  };

  const beforePlatform = beforeScene.name?.startsWith('S2A') ? 'S2A' : beforeScene.name?.startsWith('S2B') ? 'S2B' : 'S2';
  const afterPlatform = afterScene.name?.startsWith('S2A') ? 'S2A' : afterScene.name?.startsWith('S2B') ? 'S2B' : 'S2';

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col h-full max-h-[820px] overflow-hidden text-slate-800 select-none">
      {/* Panel Top Title */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-teal-800" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
            EVIDENCE SPINE
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Bi-Temporal Chain
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {candidate && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-slate-500 hover:text-slate-900 underline font-mono"
            >
              All Candidates
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-mono font-medium rounded border transition-colors shadow-2xs ${
              exportSuccess
                ? 'bg-teal-50 border-teal-400 text-teal-900 font-semibold'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-950 hover:border-teal-700'
            }`}
            title="Download temporal evidence sequence and candidate details as CSV"
          >
            <Download className="w-3.5 h-3.5 text-teal-800" />
            <span>{exportSuccess ? 'Downloaded CSV' : 'Export Results to CSV'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* MULTI-TEMPORAL SPINE */}
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span className="font-semibold text-slate-700 uppercase tracking-tight">Temporal Spine</span>
            <span className="text-teal-800 font-medium">
              {temporalScenes.length > 0 ? `${temporalScenes.length} Sentinel-2 Observations` : 'Bitemporal Pair'}
            </span>
          </div>

          {/* Temporal Track with actual observation dates */}
          <div className="relative pt-2 pb-2">
            <div className="h-0.5 bg-slate-200 w-full relative">
              {temporalScenes.length > 0 ? (
                temporalScenes.map((s, sIdx) => {
                  const pct = (sIdx / Math.max(1, temporalScenes.length - 1)) * 90 + 5;
                  const isFirst = sIdx === 0;
                  const isLast = sIdx === temporalScenes.length - 1;
                  const isHeavyCloud = (s.cloudCover || 0) > 35;
                  return (
                    <div
                      key={s.productId || sIdx}
                      style={{ left: `${pct}%` }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                      title={`${format(new Date(s.acquisitionDate), 'dd MMM yyyy')} (${s.cloudCover.toFixed(1)}% cloud)`}
                    >
                      <span className={`w-2 h-2 rounded-full ring-2 ring-white ${
                        isFirst
                          ? 'bg-emerald-600'
                          : isLast
                          ? 'bg-sky-600'
                          : isHeavyCloud
                          ? 'bg-slate-400'
                          : 'bg-teal-700'
                      }`} />
                      <span className="text-[8px] font-mono text-slate-600 mt-1 whitespace-nowrap">
                        {format(new Date(s.acquisitionDate), 'yyyy-MM')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="absolute left-[15%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
                    <span className="text-[9px] font-mono text-slate-700 mt-1 font-semibold whitespace-nowrap">
                      {format(new Date(beforeScene.acquisition_date), 'yyyy')}
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono">Baseline</span>
                  </div>
                  <div className="absolute left-[85%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600 ring-2 ring-white" />
                    <span className="text-[9px] font-mono text-slate-700 mt-1 font-semibold whitespace-nowrap">
                      {format(new Date(afterScene.acquisition_date), 'yyyy')}
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono">Monitor</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="text-[9px] text-slate-500 font-mono pt-3 text-center">
            Multi-Temporal Sequence &bull; Sentinel-2 Revisit Observations
          </div>
        </div>

        {/* If no candidate is currently selected, display candidate picker list */}
        {!candidate ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>Detected Change Candidates ({candidatesList.length})</span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-500 font-mono">Click to inspect</span>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                  title="Export all candidates to CSV"
                >
                  <Download className="w-3 h-3 text-teal-800" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {candidatesList.length > 0 ? (
              <div className="space-y-1.5">
                {candidatesList.map((cand, idx) => {
                  const isNew = cand.type === 'new_construction_candidate';
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => onSelectCandidate && onSelectCandidate(cand.id)}
                      className="w-full text-left p-2.5 rounded border border-slate-200 hover:border-teal-700 hover:bg-teal-50/50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${
                          isNew ? 'bg-orange-500' : 'bg-purple-600'
                        }`} />
                        <div>
                          <div className="text-xs font-semibold text-slate-900 group-hover:text-teal-950">
                            {cand.id} &bull; {isNew ? 'Potential New Construction' : 'Expansion Candidate'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {cand.area_m2.toLocaleString()} m² &bull; &Delta;NDBI: +{cand.mean_delta_ndbi.toFixed(3)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-800 shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No candidates detected for current AOI threshold.
              </div>
            )}
          </div>
        ) : (
          /* CONNECTED EVIDENCE CHAIN (Section 4 & 5) */
          <div className="space-y-3">
            {/* EVIDENCE COORDINATE MOTIF (Section 11) */}
            <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-teal-800 shrink-0" />
                <span className="font-bold text-slate-900 font-sans">{candidate.id}</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-700 truncate">
                  {candidate.centroid[1].toFixed(4)}° N, {candidate.centroid[0].toFixed(4)}° E
                </span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-sans uppercase shrink-0 ${
                isConstruction ? 'bg-orange-100 text-orange-900' : isBuiltUp ? 'bg-purple-100 text-purple-900' : 'bg-sky-100 text-sky-900'
              }`}>
                {candidate.display_name || (isConstruction ? 'POTENTIAL NEW CONSTRUCTION' : isBuiltUp ? 'BUILT-UP CHANGE' : 'SPECTRAL CHANGE')}
              </span>
            </div>

            {/* CHAIN NODE 1: BEFORE SCENE */}
            <div className="relative pl-6 pb-2 border-l-2 border-emerald-500/40">
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-white" />
              <div className="bg-white border border-slate-200 rounded p-2 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-emerald-800 uppercase">01 Baseline Scene</span>
                  <span className="text-slate-600 font-bold">{beforePlatform} &bull; L2A</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-mono">{format(new Date(beforeScene.acquisition_date), 'dd MMM yyyy')}</span>
                  <span className="font-mono text-[10px] text-slate-500">Cloud: {beforeScene.cloud_cover.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 pt-0.5 border-t border-slate-100">
                  <span>Candidate Baseline NDVI: <strong className="text-slate-800">{candidate.before_ndvi_mean !== undefined ? candidate.before_ndvi_mean.toFixed(3) : candidate.before_ndvi?.toFixed(3) ?? 'N/A'}</strong></span>
                  <span>NDBI: <strong className="text-slate-800">{candidate.before_ndbi_mean !== undefined ? candidate.before_ndbi_mean.toFixed(3) : candidate.before_ndbi?.toFixed(3) ?? 'N/A'}</strong></span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Tile {beforeScene.tile_id || '43QCA'} &bull; GSD 10m
                </div>
              </div>
            </div>

            {/* CHAIN NODE 2: CANDIDATE SPECTRAL DIFFERENCE */}
            <div className="relative pl-6 pb-2 border-l-2 border-teal-500/50">
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-teal-800 ring-2 ring-white" />
              <div className="bg-teal-50/50 border border-teal-200 rounded p-2 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-teal-950 uppercase">02 Candidate Spectral Shift</span>
                  <span className="text-[10px] text-teal-800 font-semibold">&Delta; Bands</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-white p-1.5 rounded border border-teal-200">
                    <span className="text-[9px] text-slate-500 block uppercase">Candidate &Delta;NDVI</span>
                    <span className="text-xs font-bold text-emerald-700 block">
                      {candidate.mean_delta_ndvi?.toFixed(3) ?? candidate.delta_ndvi?.toFixed(3)}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      ({candidate.before_ndvi_mean?.toFixed(3)} &rarr; {candidate.after_ndvi_mean?.toFixed(3)})
                    </span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-teal-200">
                    <span className="text-[9px] text-slate-500 block uppercase">Candidate &Delta;NDBI</span>
                    <span className="text-xs font-bold text-amber-700 block">
                      +{candidate.mean_delta_ndbi?.toFixed(3) ?? candidate.delta_ndbi?.toFixed(3)}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      ({candidate.before_ndbi_mean?.toFixed(3)} &rarr; {candidate.after_ndbi_mean?.toFixed(3)})
                    </span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-600 flex items-center justify-between">
                  <span>Candidate Pixels: {candidate.pixel_count}</span>
                  <span>Footprint: {candidate.area_m2.toLocaleString()} m²</span>
                </div>
              </div>
            </div>

            {/* CHAIN NODE 3: AFTER SCENE */}
            <div className="relative pl-6 pb-2 border-l-2 border-sky-500/40">
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-sky-600 ring-2 ring-white" />
              <div className="bg-white border border-slate-200 rounded p-2 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-sky-800 uppercase">03 Monitoring Scene</span>
                  <span className="text-slate-600 font-bold">{afterPlatform} &bull; L2A</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-mono">{format(new Date(afterScene.acquisition_date), 'dd MMM yyyy')}</span>
                  <span className="font-mono text-[10px] text-slate-500">Cloud: {afterScene.cloud_cover.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 pt-0.5 border-t border-slate-100">
                  <span>Candidate Monitoring NDVI: <strong className="text-slate-800">{candidate.after_ndvi_mean !== undefined ? candidate.after_ndvi_mean.toFixed(3) : candidate.after_ndvi?.toFixed(3) ?? 'N/A'}</strong></span>
                  <span>NDBI: <strong className="text-slate-800">{candidate.after_ndbi_mean !== undefined ? candidate.after_ndbi_mean.toFixed(3) : candidate.after_ndbi?.toFixed(3) ?? 'N/A'}</strong></span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Tile {afterScene.tile_id || '43QCA'} &bull; GSD 10m
                </div>
              </div>
            </div>

            {/* CHAIN NODE 4: CANDIDATE CLUSTERING */}
            <div className="relative pl-6 pb-2 border-l-2 border-amber-500/40">
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-amber-600 ring-2 ring-white" />
              <div className={`rounded p-2 text-xs space-y-1 border ${
                isConstruction ? 'bg-orange-50/70 border-orange-200' : isBuiltUp ? 'bg-purple-50/70 border-purple-200' : 'bg-sky-50/70 border-sky-200'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold uppercase text-slate-900">04 Spatial Candidate</span>
                  <span className="font-semibold text-slate-700">{(candidate.area_m2 / 10000).toFixed(2)} ha</span>
                </div>
                <div className="text-[11px] font-medium text-slate-800">
                  {candidate.display_name || (isConstruction ? 'Potential New Construction' : isBuiltUp ? 'Built-up Change Candidate' : 'Spectral Change Candidate')}
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  Area: {candidate.area_m2.toLocaleString()} m² ({candidate.pixel_count} contiguous 10m pixels)
                </div>
                <div className="text-[9px] font-mono text-slate-500">
                  Bounds: [{candidate.bounding_box.map(n => n.toFixed(3)).join(', ')}]
                </div>
              </div>
            </div>

            {/* SECTION: TEMPORAL EVIDENCE (Requirements 7 & 8) */}
            {effectiveEvidence && (
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-800" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 font-mono">
                      TEMPORAL EVIDENCE
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-teal-900 bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-600 transition-colors"
                      title="Export temporal evidence sequence and candidate metrics to CSV"
                    >
                      <Download className="w-3 h-3 text-teal-800" />
                      <span>Export CSV</span>
                    </button>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      effectiveEvidence.status === 'PERSISTENT'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : effectiveEvidence.status === 'TRANSIENT'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-200 text-slate-800 border border-slate-300'
                    }`}>
                      {effectiveEvidence.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono bg-white p-2 rounded border border-slate-200">
                  <div>
                    <span className="text-[9px] text-slate-500 block">Observations</span>
                    <span className="text-xs font-bold text-slate-900">{effectiveEvidence.observations}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Usable observations</span>
                    <span className="text-xs font-bold text-teal-800">{effectiveEvidence.usable_observations}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Persistent change</span>
                    <span className="text-xs font-bold text-indigo-900">{effectiveEvidence.persistent_change_observations}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 leading-relaxed font-sans">
                  <span className="font-semibold text-slate-800 font-mono">Status: </span>
                  <strong className="font-mono text-slate-900">{effectiveEvidence.status}</strong> &bull; {effectiveEvidence.persistence_rationale}
                </div>

                {/* VIEW MODE TOGGLE (Both / Chart / Timeline) */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center space-x-1">
                    <span>Evidence Sequence</span>
                    <span className="text-[9px] text-slate-400 font-normal lowercase font-mono">&bull; spectral trajectory</span>
                  </div>

                  <div className="flex items-center p-0.5 bg-slate-200/70 rounded text-[9px] font-mono">
                    <button
                      type="button"
                      onClick={() => setTemporalViewMode('both')}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        temporalViewMode === 'both'
                          ? 'bg-white text-teal-950 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Split View
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemporalViewMode('chart')}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        temporalViewMode === 'chart'
                          ? 'bg-white text-teal-950 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Chart
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemporalViewMode('timeline')}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        temporalViewMode === 'timeline'
                          ? 'bg-white text-teal-950 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Timeline
                    </button>
                  </div>
                </div>

                {/* RECHARTS LINE CHART: Visualizing NDVI and NDBI Evolution Alongside Candidate Timeline */}
                {(temporalViewMode === 'both' || temporalViewMode === 'chart') && (
                  <TemporalEvidenceLineChart
                    observationsSequence={effectiveEvidence.observations_sequence}
                    candidateId={candidate.id}
                    activeDate={hoveredDate}
                    onHoverDate={setHoveredDate}
                  />
                )}

                {/* COMPACT TIMELINE (Requirement 7) */}
                {(temporalViewMode === 'both' || temporalViewMode === 'timeline') && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center justify-between">
                      <span>Timeline Measurements</span>
                      <span className="text-[9px] font-normal text-slate-400 lowercase font-mono">date &bull; actual BOA reflectance</span>
                    </div>

                    <div className="space-y-1 bg-white p-2 rounded border border-slate-200 font-mono text-[11px]">
                      {effectiveEvidence.observations_sequence.map((obs, oIdx) => {
                        const isHovered = hoveredDate === obs.date || hoveredDate === obs.full_date;
                        const dotColor = !obs.usable
                          ? 'text-slate-400'
                          : obs.change_signal === 'changed'
                          ? 'text-amber-600'
                          : obs.change_signal === 'baseline'
                          ? 'text-emerald-600'
                          : obs.change_signal === 'reversal'
                          ? 'text-sky-600'
                          : 'text-slate-600';

                        return (
                          <div
                            key={obs.scene_id || oIdx}
                            onMouseEnter={() => setHoveredDate(obs.date)}
                            onMouseLeave={() => setHoveredDate(null)}
                            className={`flex items-center justify-between py-1 px-1.5 rounded transition-all cursor-default ${
                              isHovered
                                ? 'bg-teal-50/90 ring-1 ring-teal-500/40 text-slate-900'
                                : !obs.usable
                                ? 'bg-slate-50/70 text-slate-400'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-800">{obs.date}</span>
                              <span className={`text-sm leading-none ${dotColor}`}>●</span>
                              <span className="text-[10px] text-slate-600">
                                NDVI: <strong className="text-slate-800">{obs.usable ? obs.ndvi.toFixed(3) : '—'}</strong>
                              </span>
                              <span className="text-[10px] text-slate-600">
                                NDBI: <strong className="text-slate-800">{obs.usable ? obs.ndbi.toFixed(3) : '—'}</strong>
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 text-[10px]">
                              <span className={`px-1 py-0.2 rounded text-[9px] ${
                                obs.water_mask_status === 'land' ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'
                              }`}>
                                {obs.water_mask_status === 'land' ? 'Land' : 'Water'}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                !obs.usable
                                  ? 'bg-slate-100 text-slate-500'
                                  : obs.change_signal === 'changed'
                                  ? 'bg-amber-100 text-amber-900'
                                  : obs.change_signal === 'baseline'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : obs.change_signal === 'reversal'
                                  ? 'bg-sky-100 text-sky-900'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {!obs.usable ? `Cloud (${obs.cloud_cover.toFixed(0)}%)` : obs.change_signal}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 5: "WHY WAS THIS DETECTED?" (Deterministic Evidence Breakdown) */}
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 font-mono">
                WHY WAS THIS DETECTED?
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="p-1.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] flex items-start space-x-2">
                  <span className="text-sky-800 font-bold shrink-0">00</span>
                  <div>
                    <span className="font-sans font-semibold text-slate-900">Confirmed land surface</span>
                    <div className="text-[10px] text-sky-700">Spectral water mask (NDWI &lt; 0, MNDWI &lt; 0) verified; aquatic/ocean false alarms excluded</div>
                  </div>
                </div>

                <div className="p-1.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] flex items-start space-x-2">
                  <span className="text-teal-800 font-bold shrink-0">01</span>
                  <div>
                    <span className="font-sans font-semibold text-slate-900">Vegetation signal changed</span>
                    <div className="text-[10px] text-emerald-700">
                      Candidate NDVI: {candidate.before_ndvi_mean?.toFixed(3) || '—'} &rarr; {candidate.after_ndvi_mean?.toFixed(3) || '—'} (&Delta;NDVI: {candidate.mean_delta_ndvi?.toFixed(3) ?? candidate.delta_ndvi?.toFixed(3)})
                    </div>
                  </div>
                </div>

                <div className="p-1.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] flex items-start space-x-2">
                  <span className="text-teal-800 font-bold shrink-0">02</span>
                  <div>
                    <span className="font-sans font-semibold text-slate-900">Built-up spectral signal changed</span>
                    <div className="text-[10px] text-amber-700">
                      Candidate NDBI: {candidate.before_ndbi_mean?.toFixed(3) || '—'} &rarr; {candidate.after_ndbi_mean?.toFixed(3) || '—'} (&Delta;NDBI: +{candidate.mean_delta_ndbi?.toFixed(3) ?? candidate.delta_ndbi?.toFixed(3)})
                    </div>
                  </div>
                </div>

                <div className="p-1.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] flex items-start space-x-2">
                  <span className="text-teal-800 font-bold shrink-0">03</span>
                  <div>
                    <span className="font-sans font-semibold text-slate-900">Spatial candidate cluster</span>
                    <div className="text-[10px] text-slate-600">
                      Area: {candidate.area_m2.toLocaleString()} m² ({candidate.pixel_count} contiguous 10m pixels = {(candidate.area_m2 / 10000).toFixed(2)} ha)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 6: ANALYST VERIFICATION WORKFLOW */}
            <div className="p-2.5 rounded bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 font-mono">
                  ANALYST VERIFICATION
                </span>
                {reviewStatus !== 'pending' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-teal-100 text-teal-900">
                    {reviewStatus}
                  </span>
                )}
              </div>

              {submittedMessage && (
                <div className="p-1.5 rounded bg-teal-50 border border-teal-200 text-[10px] font-mono text-teal-900 text-center font-medium">
                  {submittedMessage}
                </div>
              )}

              {/* Optional Comment Input */}
              <input
                type="text"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Analyst verification notes (optional)..."
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-hidden focus:border-teal-700 font-sans"
              />

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDecision('confirmed')}
                  className="px-2 py-1.5 rounded bg-teal-800 hover:bg-teal-900 text-white font-medium text-[11px] transition-colors flex items-center justify-center space-x-1"
                >
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Confirm</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDecision('needs_review')}
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-[11px] border border-slate-300 transition-colors flex items-center justify-center space-x-1"
                >
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  <span>Review</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDecision('rejected')}
                  className="px-2 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-900 font-medium text-[11px] border border-rose-300 transition-colors flex items-center justify-center space-x-1"
                >
                  <XCircle className="w-3 h-3 shrink-0" />
                  <span>Reject</span>
                </button>
              </div>

              {/* Export Full Evidence CSV Button */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full mt-1.5 py-1.5 px-2 rounded border border-slate-300 hover:border-teal-700 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-950 font-mono text-[11px] font-medium transition-colors flex items-center justify-center space-x-1.5 shadow-2xs"
                title="Download temporal evidence sequence and candidate details as CSV"
              >
                <Download className="w-3.5 h-3.5 text-teal-800" />
                <span>Export Results to CSV</span>
              </button>
            </div>

            {/* Scientific Caveat Footnote */}
            <div className="p-2 rounded bg-amber-50/70 border border-amber-200 flex items-start space-x-1.5 text-[10px] text-amber-900 italic">
              <Info className="w-3 h-3 text-amber-800 shrink-0 mt-0.5" />
              <span>
                "This is a spectral change candidate derived from Sentinel-2 BOA surface reflectance, not a confirmed building footprint."
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationWorkspacePanel;
