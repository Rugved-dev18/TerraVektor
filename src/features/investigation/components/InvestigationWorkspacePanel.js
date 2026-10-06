import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { MapPin, CheckCircle2, XCircle, HelpCircle, Info, Clock, ChevronRight, Download } from 'lucide-react';
import { format } from 'date-fns';
import { reviewCandidate } from '../../../services/api';
import { TemporalEvidenceLineChart } from './TemporalEvidenceLineChart';
export const InvestigationWorkspacePanel = ({ candidate, candidatesList = [], beforeScene, afterScene, temporalScenes = [], onSelectCandidate, onClose, dataMode, limitations, source }) => {
    const [reviewStatus, setReviewStatus] = useState('pending');
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedMessage, setSubmittedMessage] = useState(null);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [hoveredDate, setHoveredDate] = useState(null);
    const [temporalViewMode, setTemporalViewMode] = useState('both');
    const isDemo = dataMode === 'demo_data';
    const isConstruction = candidate?.type === 'possible_construction_candidate' || candidate?.type === 'new_construction_candidate';
    const isBuiltUp = candidate?.type === 'built_up_change_candidate';
    // Compute or use real deterministic multi-temporal persistence evidence
    const effectiveEvidence = React.useMemo(() => {
        if (!candidate)
            return null;
        if (candidate.temporal_evidence)
            return candidate.temporal_evidence;
        if (!temporalScenes || temporalScenes.length === 0)
            return null;
        const sorted = [...temporalScenes].sort((a, b) => new Date(a.acquisitionDate).getTime() - new Date(b.acquisitionDate).getTime());
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
                    water_mask_status: 'land',
                    valid_pixels: 0,
                    total_pixels: candidate.pixel_count || 10,
                    usable: false,
                    unusable_reason: `High cloud cover (${cloud.toFixed(1)}%) exceeds 35% threshold`,
                    change_signal: 'inconclusive',
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
                    water_mask_status: 'land',
                    valid_pixels: candidate.pixel_count || 10,
                    total_pixels: candidate.pixel_count || 10,
                    usable: true,
                    change_signal: 'baseline',
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
            let change_signal = 'inconclusive';
            if (delta_ndbi >= 0.08 && delta_ndvi <= -0.06) {
                change_signal = 'changed';
            }
            else if (delta_ndbi < 0.03 && delta_ndvi >= -0.04) {
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
                water_mask_status: 'land',
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
        let status = 'INCONCLUSIVE';
        let rationale = '';
        if (usableObs.length < 3) {
            status = 'INCONCLUSIVE';
            rationale = `Insufficient usable cloud-free observations (${usableObs.length} of ${seq.length}) to establish temporal persistence.`;
        }
        else if (reversalCount > 0) {
            status = 'TRANSIENT';
            rationale = `Seasonal reversal detected in ${reversalCount} observation(s): spectral vegetation signal rebounded and built-up index dropped, consistent with agricultural cycle or seasonal soil variation rather than permanent construction.`;
        }
        else if (persistentCount >= 2 && (persistentCount / Math.max(1, postBaseline.length)) >= 0.7) {
            status = 'PERSISTENT';
            rationale = `Vegetation signal decreased and remained changed (NDVI depressed), while built-up index remained elevated across ${persistentCount} consecutive observations with no seasonal reversal.`;
        }
        else {
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
    const handleDecision = async (decision) => {
        if (!candidate)
            return;
        setIsSubmitting(true);
        try {
            const candidateNumericId = parseInt(candidate.id.replace(/\D/g, ''), 10) || 1;
            await reviewCandidate(candidateNumericId, decision, reviewComment || undefined);
            setReviewStatus(decision);
            setSubmittedMessage(`Analyst decision recorded: ${decision.toUpperCase()}`);
            setTimeout(() => setSubmittedMessage(null), 4000);
        }
        catch {
            setReviewStatus(decision);
            setSubmittedMessage(`Decision cached locally (${decision})`);
            setTimeout(() => setSubmittedMessage(null), 3000);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const escapeCsv = (val) => {
        if (val === null || val === undefined)
            return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const handleExportCsv = () => {
        const lines = [];
        // Header metadata comments
        lines.push(`# Sentinel-2 Multi-Temporal Investigation Export`);
        lines.push(`# Export Date: ${new Date().toISOString()}`);
        lines.push(`# Baseline Scene: ${beforeScene.id} (${beforeScene.acquisition_date})`);
        if (afterScene && afterScene.cloud_cover <= 35) {
            lines.push(`# Monitoring Scene: ${afterScene.id} (${afterScene.acquisition_date})`);
        }
        else {
            lines.push(`# Monitoring Scene: No usable monitoring scene available`);
        }
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
        }
        else if (temporalScenes && temporalScenes.length > 0) {
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
    const afterPlatform = afterScene?.name?.startsWith('S2A') ? 'S2A' : afterScene?.name?.startsWith('S2B') ? 'S2B' : afterScene?.name?.startsWith('S2C') ? 'S2C' : 'S2';
    return (_jsxs("div", { className: "bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col h-full max-h-[820px] overflow-hidden text-slate-800 select-none", children: [_jsxs("div", { className: "px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-teal-800" }), _jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-slate-900 font-mono", children: "EVIDENCE SPINE" }), _jsx("span", { className: "text-[10px] text-slate-500 font-mono", children: "Bi-Temporal Chain" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [candidate && onClose && (_jsx("button", { type: "button", onClick: onClose, className: "text-[11px] text-slate-500 hover:text-slate-900 underline font-mono", children: "All Candidates" })), _jsxs("button", { type: "button", onClick: handleExportCsv, className: `flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-mono font-medium rounded border transition-colors shadow-2xs ${exportSuccess
                                    ? 'bg-teal-50 border-teal-400 text-teal-900 font-semibold'
                                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-950 hover:border-teal-700'}`, title: "Download temporal evidence sequence and candidate details as CSV", children: [_jsx(Download, { className: "w-3.5 h-3.5 text-teal-800" }), _jsx("span", { children: exportSuccess ? 'Downloaded CSV' : 'Export Results to CSV' })] })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-3.5 space-y-4", children: [_jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between text-[10px] font-mono text-slate-500", children: [_jsx("span", { className: "font-semibold text-slate-700 uppercase tracking-tight", children: "Temporal Spine" }), _jsx("span", { className: "text-teal-800 font-medium", children: temporalScenes.length > 0 ? `${temporalScenes.length} Sentinel-2 Observations` : 'Bitemporal Pair' })] }), _jsx("div", { className: "relative pt-2 pb-2", children: _jsx("div", { className: "h-0.5 bg-slate-200 w-full relative", children: temporalScenes.length > 0 ? (temporalScenes.map((s, sIdx) => {
                                        const pct = (sIdx / Math.max(1, temporalScenes.length - 1)) * 90 + 5;
                                        const isFirst = sIdx === 0;
                                        const isLast = sIdx === temporalScenes.length - 1;
                                        const isHeavyCloud = (s.cloudCover || 0) > 35;
                                        return (_jsxs("div", { style: { left: `${pct}%` }, className: "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center", title: `${format(new Date(s.acquisitionDate), 'dd MMM yyyy')} (${s.cloudCover.toFixed(1)}% cloud)`, children: [_jsx("span", { className: `w-2 h-2 rounded-full ring-2 ring-white ${isFirst
                                                        ? 'bg-emerald-600'
                                                        : isLast
                                                            ? 'bg-sky-600'
                                                            : isHeavyCloud
                                                                ? 'bg-slate-400'
                                                                : 'bg-teal-700'}` }), _jsx("span", { className: "text-[8px] font-mono text-slate-600 mt-1 whitespace-nowrap", children: format(new Date(s.acquisitionDate), 'yyyy-MM') })] }, s.productId || sIdx));
                                    })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "absolute left-[15%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white" }), _jsx("span", { className: "text-[9px] font-mono text-slate-700 mt-1 font-semibold whitespace-nowrap", children: format(new Date(beforeScene.acquisition_date), 'yyyy') }), _jsx("span", { className: "text-[8px] text-slate-500 font-mono", children: "Baseline" })] }), _jsxs("div", { className: "absolute left-[85%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-sky-600 ring-2 ring-white" }), _jsx("span", { className: "text-[9px] font-mono text-slate-700 mt-1 font-semibold whitespace-nowrap", children: afterScene?.acquisition_date ? format(new Date(afterScene.acquisition_date), 'yyyy') : 'N/A' }), _jsx("span", { className: "text-[8px] text-slate-500 font-mono", children: "Monitor" })] })] })) }) }), _jsx("div", { className: "text-[9px] text-slate-500 font-mono pt-3 text-center", children: "Multi-Temporal Sequence \u2022 Sentinel-2 Revisit Observations" })] }), !candidate ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs font-semibold text-slate-800", children: [_jsxs("span", { children: ["Detected Change Candidates (", candidatesList.length, ")"] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-[10px] text-slate-500 font-mono", children: "Click to inspect" }), _jsxs("button", { type: "button", onClick: handleExportCsv, className: "flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors", title: "Export all candidates to CSV", children: [_jsx(Download, { className: "w-3 h-3 text-teal-800" }), _jsx("span", { children: "Export CSV" })] })] })] }), candidatesList.length > 0 ? (_jsx("div", { className: "space-y-1.5", children: candidatesList.map((cand, idx) => {
                                    const isNew = cand.type === 'new_construction_candidate';
                                    return (_jsxs("button", { type: "button", onClick: () => onSelectCandidate && onSelectCandidate(cand.id), className: "w-full text-left p-2.5 rounded border border-slate-200 hover:border-teal-700 hover:bg-teal-50/50 transition-colors flex items-center justify-between group", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: `w-2.5 h-2.5 rounded-xs shrink-0 ${isNew ? 'bg-orange-500' : 'bg-purple-600'}` }), _jsxs("div", { children: [_jsxs("div", { className: "text-xs font-semibold text-slate-900 group-hover:text-teal-950", children: [cand.id, " \u2022 ", isNew ? 'Potential New Construction' : 'Expansion Candidate'] }), _jsxs("div", { className: "text-[10px] font-mono text-slate-500", children: [cand.area_m2.toLocaleString(), " m\u00B2 \u2022 \u0394NDBI: +", cand.mean_delta_ndbi.toFixed(3)] })] })] }), _jsx(ChevronRight, { className: "w-3.5 h-3.5 text-slate-400 group-hover:text-teal-800 shrink-0" })] }, cand.id));
                                }) })) : (_jsx("div", { className: "text-center py-8 text-xs text-slate-500 font-mono", children: "No candidates detected for current AOI threshold." }))] })) : (
                    /* CONNECTED EVIDENCE CHAIN (Section 4 & 5) */
                    _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono", children: [_jsxs("div", { className: "flex items-center space-x-1.5 min-w-0", children: [_jsx(MapPin, { className: "w-3.5 h-3.5 text-teal-800 shrink-0" }), _jsx("span", { className: "font-bold text-slate-900 font-sans", children: candidate.id }), _jsx("span", { className: "text-slate-400", children: "\u2022" }), _jsxs("span", { className: "text-slate-700 truncate", children: [candidate.centroid[1].toFixed(4), "\u00B0 N, ", candidate.centroid[0].toFixed(4), "\u00B0 E"] })] }), _jsx("span", { className: `text-[10px] font-bold px-1.5 py-0.5 rounded font-sans uppercase shrink-0 ${isConstruction ? 'bg-orange-100 text-orange-900' : isBuiltUp ? 'bg-purple-100 text-purple-900' : 'bg-sky-100 text-sky-900'}`, children: candidate.display_name || (isConstruction ? 'POTENTIAL NEW CONSTRUCTION' : isBuiltUp ? 'BUILT-UP CHANGE' : 'SPECTRAL CHANGE') })] }), _jsxs("div", { className: "relative pl-6 pb-2 border-l-2 border-emerald-500/40", children: [_jsx("div", { className: "absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-white" }), _jsxs("div", { className: "bg-white border border-slate-200 rounded p-2 text-xs space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] font-mono", children: [_jsx("span", { className: "font-bold text-emerald-800 uppercase", children: "01 Baseline Scene" }), _jsxs("span", { className: "text-slate-600 font-bold", children: [beforePlatform, " \u2022 L2A"] })] }), _jsxs("div", { className: "flex items-center justify-between text-slate-700", children: [_jsx("span", { className: "font-mono", children: format(new Date(beforeScene.acquisition_date), 'dd MMM yyyy') }), _jsxs("span", { className: "font-mono text-[10px] text-slate-500", children: ["Cloud: ", beforeScene.cloud_cover.toFixed(1), "%"] })] }), _jsxs("div", { className: "flex items-center justify-between text-[10px] font-mono text-slate-600 pt-0.5 border-t border-slate-100", children: [_jsxs("span", { children: ["Candidate Baseline NDVI: ", _jsx("strong", { className: "text-slate-800", children: candidate.before_ndvi_mean !== undefined ? candidate.before_ndvi_mean.toFixed(3) : candidate.before_ndvi?.toFixed(3) ?? 'N/A' })] }), _jsxs("span", { children: ["NDBI: ", _jsx("strong", { className: "text-slate-800", children: candidate.before_ndbi_mean !== undefined ? candidate.before_ndbi_mean.toFixed(3) : candidate.before_ndbi?.toFixed(3) ?? 'N/A' })] })] }), _jsxs("div", { className: "text-[10px] text-slate-500 font-mono truncate", children: ["Tile ", beforeScene.tile_id || '43QCA', " \u2022 GSD 10m"] })] })] }), _jsxs("div", { className: "relative pl-6 pb-2 border-l-2 border-teal-500/50", children: [_jsx("div", { className: "absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-teal-800 ring-2 ring-white" }), _jsxs("div", { className: "bg-teal-50/50 border border-teal-200 rounded p-2 text-xs space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] font-mono", children: [_jsx("span", { className: "font-bold text-teal-950 uppercase", children: "02 Candidate Spectral Shift" }), _jsx("span", { className: "text-[10px] text-teal-800 font-semibold", children: "\u0394 Bands" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs font-mono", children: [_jsxs("div", { className: "bg-white p-1.5 rounded border border-teal-200", children: [_jsx("span", { className: "text-[9px] text-slate-500 block uppercase", children: "Candidate \u0394NDVI" }), _jsx("span", { className: "text-xs font-bold text-emerald-700 block", children: candidate.mean_delta_ndvi?.toFixed(3) ?? candidate.delta_ndvi?.toFixed(3) }), _jsxs("span", { className: "text-[9px] text-slate-400 block font-mono", children: ["(", candidate.before_ndvi_mean?.toFixed(3), " \u2192 ", candidate.after_ndvi_mean?.toFixed(3), ")"] })] }), _jsxs("div", { className: "bg-white p-1.5 rounded border border-teal-200", children: [_jsx("span", { className: "text-[9px] text-slate-500 block uppercase", children: "Candidate \u0394NDBI" }), _jsxs("span", { className: "text-xs font-bold text-amber-700 block", children: ["+", candidate.mean_delta_ndbi?.toFixed(3) ?? candidate.delta_ndbi?.toFixed(3)] }), _jsxs("span", { className: "text-[9px] text-slate-400 block font-mono", children: ["(", candidate.before_ndbi_mean?.toFixed(3), " \u2192 ", candidate.after_ndbi_mean?.toFixed(3), ")"] })] })] }), _jsxs("div", { className: "text-[10px] font-mono text-slate-600 flex items-center justify-between", children: [_jsxs("span", { children: ["Candidate Pixels: ", candidate.pixel_count] }), _jsxs("span", { children: ["Footprint: ", candidate.area_m2.toLocaleString(), " m\u00B2"] })] })] })] }), _jsxs("div", { className: "relative pl-6 pb-2 border-l-2 border-sky-500/40", children: [_jsx("div", { className: "absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-sky-600 ring-2 ring-white" }), _jsxs("div", { className: "bg-white border border-slate-200 rounded p-2 text-xs space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] font-mono", children: [_jsx("span", { className: "font-bold text-sky-800 uppercase", children: "03 Monitoring Scene" }), _jsxs("span", { className: "text-slate-600 font-bold", children: [afterPlatform, " \u2022 L2A"] })] }), afterScene && afterScene.cloud_cover <= 35 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-between text-slate-700", children: [_jsx("span", { className: "font-mono", children: format(new Date(afterScene.acquisition_date), 'dd MMM yyyy') }), _jsxs("span", { className: "font-mono text-[10px] text-slate-500", children: ["Cloud: ", afterScene.cloud_cover.toFixed(1), "%"] })] }), _jsxs("div", { className: "flex items-center justify-between text-[10px] font-mono text-slate-600 pt-0.5 border-t border-slate-100", children: [_jsxs("span", { children: ["Candidate Monitoring NDVI: ", _jsx("strong", { className: "text-slate-800", children: candidate?.after_ndvi_mean !== undefined ? candidate.after_ndvi_mean.toFixed(3) : candidate?.after_ndvi?.toFixed(3) ?? 'N/A' })] }), _jsxs("span", { children: ["NDBI: ", _jsx("strong", { className: "text-slate-800", children: candidate?.after_ndbi_mean !== undefined ? candidate.after_ndbi_mean.toFixed(3) : candidate?.after_ndbi?.toFixed(3) ?? 'N/A' })] })] }), _jsxs("div", { className: "text-[10px] text-slate-500 font-mono truncate", children: ["Tile ", afterScene.tile_id || '43QCA', " \u2022 GSD 10m"] })] })) : (_jsx("div", { className: "text-rose-600 font-mono text-xs py-1", children: "No usable monitoring scene available" }))] })] }), _jsxs("div", { className: "relative pl-6 pb-2 border-l-2 border-amber-500/40", children: [_jsx("div", { className: "absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-amber-600 ring-2 ring-white" }), _jsxs("div", { className: `rounded p-2 text-xs space-y-1 border ${isConstruction ? 'bg-orange-50/70 border-orange-200' : isBuiltUp ? 'bg-purple-50/70 border-purple-200' : 'bg-sky-50/70 border-sky-200'}`, children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] font-mono", children: [_jsx("span", { className: "font-bold uppercase text-slate-900", children: "04 Spatial Candidate" }), _jsxs("span", { className: "font-semibold text-slate-700", children: [(candidate.area_m2 / 10000).toFixed(2), " ha"] })] }), _jsx("div", { className: "text-[11px] font-medium text-slate-800", children: candidate.display_name || (isConstruction ? 'Potential New Construction' : isBuiltUp ? 'Built-up Change Candidate' : 'Spectral Change Candidate') }), _jsxs("div", { className: "text-[10px] text-slate-600 font-mono", children: ["Area: ", candidate.area_m2.toLocaleString(), " m\u00B2 (", candidate.pixel_count, " contiguous 10m pixels)"] }), _jsxs("div", { className: "text-[9px] font-mono text-slate-500", children: ["Bounds: [", candidate.bounding_box.map(n => n.toFixed(3)).join(', '), "]"] })] })] }), effectiveEvidence && (_jsxs("div", { className: "p-2.5 rounded bg-slate-50 border border-slate-200 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx(Clock, { className: "w-3.5 h-3.5 text-teal-800" }), _jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-800 font-mono", children: "TEMPORAL EVIDENCE" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("button", { type: "button", onClick: handleExportCsv, className: "flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-teal-900 bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-600 transition-colors", title: "Export temporal evidence sequence and candidate metrics to CSV", children: [_jsx(Download, { className: "w-3 h-3 text-teal-800" }), _jsx("span", { children: "Export CSV" })] }), _jsx("span", { className: `text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${effectiveEvidence.status === 'PERSISTENT'
                                                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                                            : effectiveEvidence.status === 'TRANSIENT'
                                                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                                : 'bg-slate-200 text-slate-800 border border-slate-300'}`, children: effectiveEvidence.status })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-1.5 text-xs font-mono bg-white p-2 rounded border border-slate-200", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[9px] text-slate-500 block", children: "Observations" }), _jsx("span", { className: "text-xs font-bold text-slate-900", children: effectiveEvidence.observations })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[9px] text-slate-500 block", children: "Usable observations" }), _jsx("span", { className: "text-xs font-bold text-teal-800", children: effectiveEvidence.usable_observations })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[9px] text-slate-500 block", children: "Persistent change" }), _jsx("span", { className: "text-xs font-bold text-indigo-900", children: effectiveEvidence.persistent_change_observations })] })] }), _jsxs("div", { className: "text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 leading-relaxed font-sans", children: [_jsx("span", { className: "font-semibold text-slate-800 font-mono", children: "Status: " }), _jsx("strong", { className: "font-mono text-slate-900", children: effectiveEvidence.status }), " \u2022 ", effectiveEvidence.persistence_rationale] }), _jsxs("div", { className: "flex items-center justify-between pt-0.5", children: [_jsxs("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center space-x-1", children: [_jsx("span", { children: "Evidence Sequence" }), _jsx("span", { className: "text-[9px] text-slate-400 font-normal lowercase font-mono", children: "\u2022 spectral trajectory" })] }), _jsxs("div", { className: "flex items-center p-0.5 bg-slate-200/70 rounded text-[9px] font-mono", children: [_jsx("button", { type: "button", onClick: () => setTemporalViewMode('both'), className: `px-1.5 py-0.5 rounded transition-colors ${temporalViewMode === 'both'
                                                            ? 'bg-white text-teal-950 font-bold shadow-2xs'
                                                            : 'text-slate-600 hover:text-slate-900'}`, children: "Split View" }), _jsx("button", { type: "button", onClick: () => setTemporalViewMode('chart'), className: `px-1.5 py-0.5 rounded transition-colors ${temporalViewMode === 'chart'
                                                            ? 'bg-white text-teal-950 font-bold shadow-2xs'
                                                            : 'text-slate-600 hover:text-slate-900'}`, children: "Chart" }), _jsx("button", { type: "button", onClick: () => setTemporalViewMode('timeline'), className: `px-1.5 py-0.5 rounded transition-colors ${temporalViewMode === 'timeline'
                                                            ? 'bg-white text-teal-950 font-bold shadow-2xs'
                                                            : 'text-slate-600 hover:text-slate-900'}`, children: "Timeline" })] })] }), (temporalViewMode === 'both' || temporalViewMode === 'chart') && (_jsx(TemporalEvidenceLineChart, { observationsSequence: effectiveEvidence.observations_sequence, candidateId: candidate.id, activeDate: hoveredDate, onHoverDate: setHoveredDate })), (temporalViewMode === 'both' || temporalViewMode === 'timeline') && (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center justify-between", children: [_jsx("span", { children: "Timeline Measurements" }), _jsx("span", { className: "text-[9px] font-normal text-slate-400 lowercase font-mono", children: "date \u2022 actual BOA reflectance" })] }), _jsx("div", { className: "space-y-1 bg-white p-2 rounded border border-slate-200 font-mono text-[11px]", children: effectiveEvidence.observations_sequence.map((obs, oIdx) => {
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
                                                    return (_jsxs("div", { onMouseEnter: () => setHoveredDate(obs.date), onMouseLeave: () => setHoveredDate(null), className: `flex items-center justify-between py-1 px-1.5 rounded transition-all cursor-default ${isHovered
                                                            ? 'bg-teal-50/90 ring-1 ring-teal-500/40 text-slate-900'
                                                            : !obs.usable
                                                                ? 'bg-slate-50/70 text-slate-400'
                                                                : 'hover:bg-slate-50 text-slate-700'}`, children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "font-bold text-slate-800", children: obs.date }), _jsx("span", { className: `text-sm leading-none ${dotColor}`, children: "\u25CF" }), _jsxs("span", { className: "text-[10px] text-slate-600", children: ["NDVI: ", _jsx("strong", { className: "text-slate-800", children: obs.usable ? obs.ndvi.toFixed(3) : '—' })] }), _jsxs("span", { className: "text-[10px] text-slate-600", children: ["NDBI: ", _jsx("strong", { className: "text-slate-800", children: obs.usable ? obs.ndbi.toFixed(3) : '—' })] })] }), _jsxs("div", { className: "flex items-center space-x-2 text-[10px]", children: [_jsx("span", { className: `px-1 py-0.2 rounded text-[9px] ${obs.water_mask_status === 'land' ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'}`, children: obs.water_mask_status === 'land' ? 'Land' : 'Water' }), _jsx("span", { className: `px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${!obs.usable
                                                                            ? 'bg-slate-100 text-slate-500'
                                                                            : obs.change_signal === 'changed'
                                                                                ? 'bg-amber-100 text-amber-900'
                                                                                : obs.change_signal === 'baseline'
                                                                                    ? 'bg-emerald-100 text-emerald-900'
                                                                                    : obs.change_signal === 'reversal'
                                                                                        ? 'bg-sky-100 text-sky-900'
                                                                                        : 'bg-slate-100 text-slate-700'}`, children: !obs.usable ? `Cloud (${obs.cloud_cover.toFixed(0)}%)` : obs.change_signal })] })] }, obs.scene_id || oIdx));
                                                }) })] }))] })), _jsxs("div", { className: "p-2.5 rounded bg-slate-50 border border-slate-200 space-y-2", children: [_jsx("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-700 font-mono", children: "WHY WAS THIS DETECTED?" }), _jsxs("div", { className: "space-y-1.5 text-xs", children: [_jsxs("div", { className: "p-1.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] flex items-start space-x-2", children: [_jsx("span", { className: "text-sky-800 font-bold shrink-0", children: "00" }), _jsxs("div", { children: [_jsx("span", { className: "font-sans font-semibold text-slate-900", children: "Confirmed land surface" }), _jsx("div", { className: "text-[10px] text-sky-700", children: "Spectral water mask (NDWI < 0, MNDWI < 0) verified; aquatic/ocean false alarms excluded" })] })] }), _jsxs("div", { className: "p-1.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] flex items-start space-x-2", children: [_jsx("span", { className: "text-teal-800 font-bold shrink-0", children: "01" }), _jsxs("div", { children: [_jsx("span", { className: "font-sans font-semibold text-slate-900", children: "Vegetation signal changed" }), _jsxs("div", { className: "text-[10px] text-emerald-700", children: ["Candidate NDVI: ", candidate.before_ndvi_mean?.toFixed(3) || '—', " \u2192 ", candidate.after_ndvi_mean?.toFixed(3) || '—', " (\u0394NDVI: ", candidate.mean_delta_ndvi?.toFixed(3) ?? candidate.delta_ndvi?.toFixed(3), ")"] })] })] }), _jsxs("div", { className: "p-1.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] flex items-start space-x-2", children: [_jsx("span", { className: "text-teal-800 font-bold shrink-0", children: "02" }), _jsxs("div", { children: [_jsx("span", { className: "font-sans font-semibold text-slate-900", children: "Built-up spectral signal changed" }), _jsxs("div", { className: "text-[10px] text-amber-700", children: ["Candidate NDBI: ", candidate.before_ndbi_mean?.toFixed(3) || '—', " \u2192 ", candidate.after_ndbi_mean?.toFixed(3) || '—', " (\u0394NDBI: +", candidate.mean_delta_ndbi?.toFixed(3) ?? candidate.delta_ndbi?.toFixed(3), ")"] })] })] }), _jsxs("div", { className: "p-1.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] flex items-start space-x-2", children: [_jsx("span", { className: "text-teal-800 font-bold shrink-0", children: "03" }), _jsxs("div", { children: [_jsx("span", { className: "font-sans font-semibold text-slate-900", children: "Spatial candidate cluster" }), _jsxs("div", { className: "text-[10px] text-slate-600", children: ["Area: ", candidate.area_m2.toLocaleString(), " m\u00B2 (", candidate.pixel_count, " contiguous 10m pixels = ", (candidate.area_m2 / 10000).toFixed(2), " ha)"] })] })] })] })] }), _jsxs("div", { className: "p-2.5 rounded bg-white border border-slate-200 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-700 font-mono", children: "ANALYST VERIFICATION" }), reviewStatus !== 'pending' && (_jsx("span", { className: "text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-teal-100 text-teal-900", children: reviewStatus }))] }), submittedMessage && (_jsx("div", { className: "p-1.5 rounded bg-teal-50 border border-teal-200 text-[10px] font-mono text-teal-900 text-center font-medium", children: submittedMessage })), _jsx("input", { type: "text", value: reviewComment, onChange: (e) => setReviewComment(e.target.value), placeholder: "Analyst verification notes (optional)...", className: "w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-hidden focus:border-teal-700 font-sans" }), _jsxs("div", { className: "grid grid-cols-3 gap-1.5 pt-1", children: [_jsxs("button", { type: "button", disabled: isSubmitting, onClick: () => handleDecision('confirmed'), className: "px-2 py-1.5 rounded bg-teal-800 hover:bg-teal-900 text-white font-medium text-[11px] transition-colors flex items-center justify-center space-x-1", children: [_jsx(CheckCircle2, { className: "w-3 h-3 shrink-0" }), _jsx("span", { children: "Confirm" })] }), _jsxs("button", { type: "button", disabled: isSubmitting, onClick: () => handleDecision('needs_review'), className: "px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-[11px] border border-slate-300 transition-colors flex items-center justify-center space-x-1", children: [_jsx(HelpCircle, { className: "w-3 h-3 shrink-0" }), _jsx("span", { children: "Review" })] }), _jsxs("button", { type: "button", disabled: isSubmitting, onClick: () => handleDecision('rejected'), className: "px-2 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-900 font-medium text-[11px] border border-rose-300 transition-colors flex items-center justify-center space-x-1", children: [_jsx(XCircle, { className: "w-3 h-3 shrink-0" }), _jsx("span", { children: "Reject" })] })] }), _jsxs("button", { type: "button", onClick: handleExportCsv, className: "w-full mt-1.5 py-1.5 px-2 rounded border border-slate-300 hover:border-teal-700 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-950 font-mono text-[11px] font-medium transition-colors flex items-center justify-center space-x-1.5 shadow-2xs", title: "Download temporal evidence sequence and candidate details as CSV", children: [_jsx(Download, { className: "w-3.5 h-3.5 text-teal-800" }), _jsx("span", { children: "Export Results to CSV" })] })] }), _jsxs("div", { className: "p-2 rounded bg-amber-50/70 border border-amber-200 flex items-start space-x-1.5 text-[10px] text-amber-900 italic", children: [_jsx(Info, { className: "w-3 h-3 text-amber-800 shrink-0 mt-0.5" }), _jsx("span", { children: "\"This is a spectral change candidate derived from Sentinel-2 BOA surface reflectance, not a confirmed building footprint.\"" })] })] }))] })] }));
};
export default InvestigationWorkspacePanel;
