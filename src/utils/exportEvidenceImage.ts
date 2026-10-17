/**
 * Client-Side Evidence Image Exporter for TerraVektor
 * Generates high-resolution PNG composite of real satellite before/after scenes,
 * computed change masks, and investigator annotations without AI fabrication.
 */

export interface EvidenceAnnotation {
  id: string;
  type: 'point' | 'box';
  label: string;
  notes: string;
  category: string;
  lat: number;
  lon: number;
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  candidateId?: string;
  candidateMetrics?: {
    areaM2?: number;
    deltaNdvi?: number;
    deltaNdbi?: number;
    persistence?: string;
  };
  createdAt: string;
}

export interface ExportEvidenceImageOptions {
  beforeImageUrl?: string;
  afterImageUrl?: string;
  changeMaskUrl?: string;
  beforeDate: string;
  afterDate: string;
  beforeSceneId?: string;
  afterSceneId?: string;
  locationName: string;
  aoiBbox: [number, number, number, number];
  annotations: EvidenceAnnotation[];
  metrics?: {
    changePercentage?: number;
    areaM2?: number;
    method?: string;
  };
}

export async function exportEvidenceImage(options: ExportEvidenceImageOptions): Promise<void> {
  const {
    beforeImageUrl,
    afterImageUrl,
    changeMaskUrl,
    beforeDate,
    afterDate,
    beforeSceneId = 'S2_BASELINE',
    afterSceneId = 'S2_MONITORING',
    locationName,
    aoiBbox,
    annotations,
    metrics
  } = options;

  // Helper to safely load an image via Promise
  const loadImage = (url?: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const [beforeImg, afterImg, maskImg] = await Promise.all([
    loadImage(beforeImageUrl),
    loadImage(afterImageUrl),
    loadImage(changeMaskUrl)
  ]);

  // Set up 1600x1200 canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Background
  ctx.fillStyle = '#0f172a'; // Slate-900
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Header
  ctx.fillStyle = '#0f292e'; // Deep Teal Navy
  ctx.fillRect(0, 0, canvas.width, 110);
  ctx.fillStyle = '#0d9488'; // Teal border accent
  ctx.fillRect(0, 108, canvas.width, 3);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Inter, system-ui, sans-serif';
  ctx.fillText('TERRAVEKTOR', 40, 48);

  ctx.fillStyle = '#99f6e4';
  ctx.font = '13px Inter, monospace';
  ctx.fillText('EVIDENCE VISUALIZATION STUDIO • SATELLITE FORENSIC DOSSIER', 40, 75);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SATELLITE CHANGE INVESTIGATION RECORD', canvas.width - 40, 44);

  const timestampStr = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Inter, monospace';
  ctx.fillText(`Generated: ${timestampStr}`, canvas.width - 40, 68);
  ctx.fillText(`Target: ${locationName}`, canvas.width - 40, 90);
  ctx.textAlign = 'left';

  // 3. Metadata Sub-bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, 130, canvas.width - 80, 50);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 130, canvas.width - 80, 50);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '12px Inter, sans-serif';
  const bboxText = `AOI BBox: [${aoiBbox[0].toFixed(4)}°E, ${aoiBbox[1].toFixed(4)}°N] to [${aoiBbox[2].toFixed(4)}°E, ${aoiBbox[3].toFixed(4)}°N]`;
  ctx.fillText(bboxText, 56, 160);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '12px Inter, monospace';
  const sensorText = 'Sensor: Sentinel-2 MSI Level-2A (10m BOA Ground Resolution)';
  ctx.fillText(sensorText, 560, 160);

  ctx.fillStyle = '#a7f3d0';
  const metricText = `Change Area: ${metrics?.changePercentage ? `${metrics.changePercentage}%` : 'Detected'} • Method: ${metrics?.method || 'NDVI/NDBI Differencing'}`;
  ctx.fillText(metricText, 1080, 160);

  // 4. Imagery Panels (Side-by-side Before and After)
  const panelY = 200;
  const panelWidth = 730;
  const panelHeight = 520;

  // Panel A: Before Scene
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, panelY, panelWidth, panelHeight);
  if (beforeImg) {
    ctx.drawImage(beforeImg, 40, panelY, panelWidth, panelHeight);
  } else {
    ctx.fillStyle = '#334155';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Baseline imagery unavailable', 40 + panelWidth / 2 - 90, panelY + panelHeight / 2);
  }
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, panelY, panelWidth, panelHeight);

  // Panel A Banner
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(40, panelY, panelWidth, 40);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 13px Inter, monospace';
  ctx.fillText(`BASELINE (BEFORE): ${beforeDate}`, 56, panelY + 25);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, monospace';
  ctx.fillText(`ID: ${beforeSceneId.slice(0, 32)}`, 320, panelY + 25);

  // Panel B: After Scene + Change Overlay
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(830, panelY, panelWidth, panelHeight);
  if (afterImg) {
    ctx.drawImage(afterImg, 830, panelY, panelWidth, panelHeight);
  } else {
    ctx.fillStyle = '#334155';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Monitoring imagery unavailable', 830 + panelWidth / 2 - 90, panelY + panelHeight / 2);
  }

  // Composite Change Mask onto After Image
  if (maskImg) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(maskImg, 830, panelY, panelWidth, panelHeight);
    ctx.restore();
  }

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(830, panelY, panelWidth, panelHeight);

  // Panel B Banner
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(830, panelY, panelWidth, 40);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px Inter, monospace';
  ctx.fillText(`MONITORING (AFTER): ${afterDate}`, 846, panelY + 25);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, monospace';
  ctx.fillText(`ID: ${afterSceneId.slice(0, 32)}`, 1110, panelY + 25);

  // 5. Draw Annotations on After Panel
  const minLon = aoiBbox[0];
  const minLat = aoiBbox[1];
  const maxLon = aoiBbox[2];
  const maxLat = aoiBbox[3];

  annotations.forEach((ann, idx) => {
    // Map lon/lat to After panel coordinate space
    const relX = (ann.lon - minLon) / (maxLon - minLon || 1);
    const relY = 1 - (ann.lat - minLat) / (maxLat - minLat || 1);
    const px = 830 + Math.max(10, Math.min(panelWidth - 10, relX * panelWidth));
    const py = panelY + Math.max(10, Math.min(panelHeight - 10, relY * panelHeight));

    // Draw distinctive dashed marker outline
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#f59e0b'; // Amber-500
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 16, py - 16, 32, 32);

    // Center pin
    ctx.setLineDash([]);
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Callout Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(px + 12, py - 18, 140, 24);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 12, py - 18, 140, 24);

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 11px Inter, monospace';
    ctx.fillText(`[ANN-${idx + 1}] ${ann.label.slice(0, 14)}`, px + 18, py - 2);

    ctx.restore();
  });

  // 6. Evidence Annotations & Findings Table (Lower Section)
  const findingsY = 740;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, findingsY, canvas.width - 80, 280);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(40, findingsY, canvas.width - 80, 280);

  ctx.fillStyle = '#0d9488';
  ctx.fillRect(40, findingsY, canvas.width - 80, 32);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillText('INVESTIGATOR ANNOTATIONS & RECORDED FINDINGS (MANUAL PRESENTATION LAYER)', 56, findingsY + 21);

  if (annotations.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13px Inter, sans-serif';
    ctx.fillText('No manual investigator annotations recorded. Displaying raw spectral change analysis.', 56, findingsY + 70);
  } else {
    let rowY = findingsY + 54;
    annotations.slice(0, 5).forEach((ann, idx) => {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px Inter, monospace';
      ctx.fillText(`[ANN-${idx + 1}] ${ann.label}`, 56, rowY);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px Inter, sans-serif';
      const coords = `Coord: ${ann.lat.toFixed(4)}°N, ${ann.lon.toFixed(4)}°E`;
      ctx.fillText(coords, 280, rowY);

      const metricsStr = ann.candidateMetrics?.areaM2 
        ? `Area: ${ann.candidateMetrics.areaM2.toLocaleString()} m² • Status: ${ann.candidateMetrics.persistence || 'Analyzed'}`
        : `Category: ${ann.category}`;
      ctx.fillText(metricsStr, 530, rowY);

      ctx.fillStyle = '#93c5fd';
      ctx.fillText(`Note: "${ann.notes.slice(0, 65)}${ann.notes.length > 65 ? '...' : ''}"`, 900, rowY);

      rowY += 40;
    });
  }

  // 7. Legend & Scientific Integrity Disclaimer (Bottom Bar)
  const footerY = 1040;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(40, footerY, canvas.width - 80, 120);
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(40, footerY, canvas.width - 80, 120);

  // Legend Columns
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11px Inter, monospace';
  ctx.fillText('■ COMPUTED ANALYTICAL DATA', 56, footerY + 28);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Sentinel-2 Level-2A BOA Surface Reflectance. Radiometric NDVI differencing with Otsu auto-thresholding.', 56, footerY + 48);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 11px Inter, monospace';
  ctx.fillText('■ INVESTIGATOR PRESENTATION ANNOTATIONS', 56, footerY + 76);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Manual markers and notes placed by human analysts. Not automatically detected or asserted as physical ground truth.', 56, footerY + 96);

  // Scientific Integrity Statement
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SCIENTIFIC INTEGRITY NOTICE: Spectral differencing identifies radiometric anomalies.', canvas.width - 56, footerY + 38);
  ctx.fillText('Atmospheric, soil moisture, and cloud variations may cause false positives.', canvas.width - 56, footerY + 58);
  ctx.fillText('Ground verification required prior to legal or regulatory enforcement.', canvas.width - 56, footerY + 78);
  ctx.textAlign = 'left';

  // 8. Trigger Browser Download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `terravektor_evidence_${locationName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
}
