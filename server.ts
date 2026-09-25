import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Scene {
  id: number;
  scene_name: string;
  sensor: string;
  acquisition_date: string;
  latitude: number;
  longitude: number;
  bbox: string;
  resolution: number;
  cloud_percentage: number;
  file_path: string;
  thumbnail_path: string;
  crs: string;
  source: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

interface ChangeCandidate {
  id: number;
  before_scene_id: number;
  after_scene_id: number;
  latitude: number;
  longitude: number;
  change_type: string;
  confidence: number;
  earliest_detection_date: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'false_alarm';
  created_at: string;
  updated_at: string;
}

interface AnalystReview {
  id: number;
  candidate_id: number;
  decision: 'confirmed' | 'rejected' | 'needs_review';
  comment?: string;
  timestamp: string;
}

interface ProcessingLog {
  id: number;
  scene_id: number;
  operation: string;
  model_version: string;
  timestamp: string;
  parameters: string;
}

// In-Memory Database Seeded with Realistic Indian Satellite Data
const initialLocations = [
  { name: 'Pune Urban Area', lat: 18.5204, lon: 73.8567, sensor: 'Sentinel-2', source: 'ESA' },
  { name: 'Mumbai Coastal Region', lat: 19.0760, lon: 72.8777, sensor: 'Landsat-8', source: 'USGS' },
  { name: 'Nagpur Industrial Zone', lat: 21.1458, lon: 79.0882, sensor: 'Sentinel-2', source: 'ESA' },
  { name: 'Nashik Agricultural Region', lat: 19.9975, lon: 73.7898, sensor: 'Landsat-8', source: 'USGS' },
  { name: 'Bengaluru Tech Corridor', lat: 12.9716, lon: 77.5946, sensor: 'Sentinel-2', source: 'ESA' },
  { name: 'Hyderabad Urban Expansion', lat: 17.3850, lon: 78.4867, sensor: 'Landsat-8', source: 'USGS' },
  { name: 'Delhi Metropolitan Area', lat: 28.7041, lon: 77.1025, sensor: 'Sentinel-2', source: 'ESA' },
  { name: 'Chennai Coastal Zone', lat: 13.0827, lon: 80.2707, sensor: 'Landsat-8', source: 'USGS' },
  { name: 'Kolkata Urban Region', lat: 22.5726, lon: 88.3639, sensor: 'Sentinel-2', source: 'ESA' },
  { name: 'Jaipur Heritage Site', lat: 26.9124, lon: 75.7873, sensor: 'Landsat-8', source: 'USGS' }
];

const scenes: Scene[] = initialLocations.map((loc, idx) => {
  const daysAgo = 30 + (idx * 25);
  const acqDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const bboxSize = 0.1;
  const bbox = `${(loc.lon - bboxSize).toFixed(4)},${(loc.lat - bboxSize).toFixed(4)},${(loc.lon + bboxSize).toFixed(4)},${(loc.lat + bboxSize).toFixed(4)}`;

  return {
    id: idx + 1,
    scene_name: `${loc.name.replace(/\s+/g, '_')}_${acqDate.toISOString().slice(0, 10).replace(/-/g, '')}`,
    sensor: loc.sensor,
    acquisition_date: acqDate.toISOString(),
    latitude: loc.lat,
    longitude: loc.lon,
    bbox,
    resolution: loc.sensor === 'Sentinel-2' ? 10.0 : 30.0,
    cloud_percentage: Number((Math.random() * 18 + 2).toFixed(1)),
    file_path: `data/imagery/mock_scene_${idx + 1}.tif`,
    thumbnail_path: `data/thumbnails/mock_scene_${idx + 1}.jpg`,
    crs: 'EPSG:4326',
    source: loc.source,
    processing_status: 'completed',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  };
});

const changeTypes = ['construction', 'vegetation', 'water', 'urban_expansion', 'deforestation'];
const changeCandidates: ChangeCandidate[] = [
  {
    id: 1,
    before_scene_id: 1,
    after_scene_id: 2,
    latitude: 19.0650,
    longitude: 72.8850,
    change_type: 'urban_expansion',
    confidence: 0.88,
    earliest_detection_date: scenes[1].acquisition_date,
    status: 'pending',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    before_scene_id: 2,
    after_scene_id: 3,
    latitude: 21.1350,
    longitude: 79.0950,
    change_type: 'construction',
    confidence: 0.92,
    earliest_detection_date: scenes[2].acquisition_date,
    status: 'pending',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    before_scene_id: 4,
    after_scene_id: 5,
    latitude: 12.9820,
    longitude: 77.6010,
    change_type: 'construction',
    confidence: 0.79,
    earliest_detection_date: scenes[4].acquisition_date,
    status: 'confirmed',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    before_scene_id: 6,
    after_scene_id: 7,
    latitude: 28.6940,
    longitude: 77.1120,
    change_type: 'vegetation',
    confidence: 0.73,
    earliest_detection_date: scenes[6].acquisition_date,
    status: 'pending',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    before_scene_id: 8,
    after_scene_id: 9,
    latitude: 22.5620,
    longitude: 88.3710,
    change_type: 'water',
    confidence: 0.84,
    earliest_detection_date: scenes[8].acquisition_date,
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const reviews: AnalystReview[] = [
  {
    id: 1,
    candidate_id: 3,
    decision: 'confirmed',
    comment: 'Verified commercial tech park ground clearing.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let nextLogId = 1;
const processingLogs: ProcessingLog[] = [];
scenes.forEach(scene => {
  ['ingestion', 'preprocessing', 'embedding', 'quality_check'].forEach((op, opIdx) => {
    processingLogs.push({
      id: nextLogId++,
      scene_id: scene.id,
      operation: op,
      model_version: '1.0.0-mock',
      timestamp: new Date(new Date(scene.created_at).getTime() + opIdx * 300000).toISOString(),
      parameters: JSON.stringify({ sensor: scene.sensor, resolution: scene.resolution, status: 'ok' })
    });
  });
});

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  // 1. Health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      database: 'in-memory (migrated)',
      services: {
        embedding: 'mock',
        vector_search: 'mock',
        change_detection: 'mock',
        image_preprocessing: 'mock',
        provenance: 'mock'
      }
    });
  });

  // 2. Scenes
  app.get('/api/scenes', (req: Request, res: Response) => {
    const skip = parseInt(req.query.skip as string || '0', 10);
    const limit = parseInt(req.query.limit as string || '100', 10);
    const results = scenes.slice(skip, skip + limit);
    res.json(results);
  });

  app.get('/api/scenes/:sceneId', (req: Request, res: Response) => {
    const sceneId = parseInt(req.params.sceneId, 10);
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) {
      return res.status(404).json({ detail: 'Scene not found' });
    }
    res.json(scene);
  });

  app.post('/api/ingest', (req: Request, res: Response) => {
    const body = req.body || {};
    const existing = scenes.find(s => s.scene_name === body.scene_name);
    if (existing) {
      return res.status(400).json({ detail: 'Scene with this name already exists' });
    }

    const newId = scenes.length > 0 ? Math.max(...scenes.map(s => s.id)) + 1 : 1;
    const now = new Date().toISOString();
    const newScene: Scene = {
      id: newId,
      scene_name: body.scene_name || `Scene_${newId}_${Date.now()}`,
      sensor: body.sensor || 'Sentinel-2',
      acquisition_date: body.acquisition_date || now,
      latitude: body.latitude || 19.0760,
      longitude: body.longitude || 72.8777,
      bbox: body.bbox || '72.7777,18.9760,72.9777,19.1760',
      resolution: body.resolution || 10.0,
      cloud_percentage: body.cloud_percentage || 5.0,
      file_path: body.file_path || `data/imagery/mock_scene_${newId}.tif`,
      thumbnail_path: body.thumbnail_path || `data/thumbnails/mock_scene_${newId}.jpg`,
      crs: body.crs || 'EPSG:4326',
      source: body.source || 'ESA',
      processing_status: 'completed',
      created_at: now,
      updated_at: now
    };

    scenes.push(newScene);

    // Create logs
    ['ingestion', 'preprocessing', 'embedding', 'quality_check'].forEach(op => {
      processingLogs.push({
        id: nextLogId++,
        scene_id: newScene.id,
        operation: op,
        model_version: '1.0.0-mock',
        timestamp: new Date().toISOString(),
        parameters: JSON.stringify({ ingested_by: 'analyst', status: 'verified' })
      });
    });

    res.json({
      message: 'Scene ingested successfully',
      scene_id: newScene.id,
      scene_name: newScene.scene_name
    });
  });

  // 3. Search
  app.post('/api/search/semantic', (req: Request, res: Response) => {
    const { query = '', limit = 10 } = req.body || {};
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    // Score scenes based on query terms matching name, sensor, or source
    const scored = scenes.map((scene, idx) => {
      let score = 0.55;
      const haystack = `${scene.scene_name} ${scene.sensor} ${scene.source}`.toLowerCase();
      terms.forEach(term => {
        if (haystack.includes(term)) {
          score += 0.15;
        }
      });
      // Vary slightly by index for natural ordering
      score = Math.min(0.96, score + ((idx % 4) * 0.05));
      return {
        scene_id: scene.id,
        scene_name: scene.scene_name,
        similarity_score: Number(score.toFixed(3)),
        acquisition_date: scene.acquisition_date,
        latitude: scene.latitude,
        longitude: scene.longitude,
        thumbnail_path: scene.thumbnail_path,
        metadata: {
          sensor: scene.sensor,
          resolution: `${scene.resolution}m`,
          source: scene.source,
          cloud_percentage: `${scene.cloud_percentage}%`
        }
      };
    });

    scored.sort((a, b) => b.similarity_score - a.similarity_score);
    const results = scored.slice(0, limit);

    res.json({
      results,
      query,
      total_results: results.length
    });
  });

  app.post('/api/search/image', (req: Request, res: Response) => {
    const { limit = 10 } = req.body || {};
    const results = scenes.slice(0, limit).map((scene, idx) => ({
      scene_id: scene.id,
      scene_name: scene.scene_name,
      similarity_score: Number((0.92 - idx * 0.04).toFixed(3)),
      acquisition_date: scene.acquisition_date,
      latitude: scene.latitude,
      longitude: scene.longitude,
      thumbnail_path: scene.thumbnail_path,
      metadata: {
        sensor: scene.sensor,
        resolution: `${scene.resolution}m`,
        source: scene.source
      }
    }));

    res.json({
      results,
      total_results: results.length
    });
  });

  // 4. Change Analysis
  app.post('/api/change/analyze', (req: Request, res: Response) => {
    const beforeSceneId = parseInt((req.query.before_scene_id as string) || req.body?.before_scene_id, 10);
    const afterSceneId = parseInt((req.query.after_scene_id as string) || req.body?.after_scene_id, 10);

    const beforeScene = scenes.find(s => s.id === beforeSceneId);
    const afterScene = scenes.find(s => s.id === afterSceneId);

    if (!beforeScene || !afterScene) {
      return res.status(404).json({ detail: 'One or both scenes not found' });
    }

    const newId = changeCandidates.length > 0 ? Math.max(...changeCandidates.map(c => c.id)) + 1 : 1;
    const typeIdx = (beforeSceneId + afterSceneId) % changeTypes.length;
    const newCandidate: ChangeCandidate = {
      id: newId,
      before_scene_id: beforeSceneId,
      after_scene_id: afterSceneId,
      latitude: Number((afterScene.latitude + (Math.random() * 0.04 - 0.02)).toFixed(4)),
      longitude: Number((afterScene.longitude + (Math.random() * 0.04 - 0.02)).toFixed(4)),
      change_type: changeTypes[typeIdx],
      confidence: Number((0.75 + Math.random() * 0.18).toFixed(2)),
      earliest_detection_date: afterScene.acquisition_date,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    changeCandidates.unshift(newCandidate);

    res.json({
      message: `Change analysis completed. Found 1 change candidate.`,
      change_candidates: [newCandidate]
    });
  });

  app.get('/api/change/change/:changeId', (req: Request, res: Response) => {
    const changeId = parseInt(req.params.changeId, 10);
    const candidate = changeCandidates.find(c => c.id === changeId);
    if (!candidate) {
      return res.status(404).json({ detail: 'Change candidate not found' });
    }
    res.json(candidate);
  });

  app.get('/api/change/candidates', (req: Request, res: Response) => {
    const status = req.query.status as string;
    const skip = parseInt(req.query.skip as string || '0', 10);
    const limit = parseInt(req.query.limit as string || '100', 10);

    let filtered = changeCandidates;
    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    res.json(filtered.slice(skip, skip + limit));
  });

  // 5. Review
  app.post('/api/review/:candidateId', (req: Request, res: Response) => {
    const candidateId = parseInt(req.params.candidateId, 10);
    const { decision, comment } = req.body || {};

    const candidate = changeCandidates.find(c => c.id === candidateId);
    if (!candidate) {
      return res.status(404).json({ detail: 'Change candidate not found' });
    }

    if (decision === 'confirmed') {
      candidate.status = 'confirmed';
    } else if (decision === 'rejected') {
      candidate.status = 'rejected';
    } else if (decision === 'needs_review') {
      candidate.status = 'pending';
    }
    candidate.updated_at = new Date().toISOString();

    const reviewId = reviews.length > 0 ? Math.max(...reviews.map(r => r.id)) + 1 : 1;
    const newReview: AnalystReview = {
      id: reviewId,
      candidate_id: candidateId,
      decision,
      comment,
      timestamp: new Date().toISOString()
    };
    reviews.push(newReview);

    res.json({
      message: 'Review submitted successfully',
      review_id: newReview.id,
      candidate_status: candidate.status
    });
  });

  app.get('/api/reviews/:candidateId', (req: Request, res: Response) => {
    const candidateId = parseInt(req.params.candidateId, 10);
    const filtered = reviews.filter(r => r.candidate_id === candidateId);
    res.json(filtered);
  });

  // 6. Provenance
  app.get('/api/provenance/:sceneId', (req: Request, res: Response) => {
    const sceneId = parseInt(req.params.sceneId, 10);
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) {
      return res.status(404).json({ detail: 'Scene not found' });
    }

    const logs = processingLogs.filter(l => l.scene_id === sceneId);

    res.json({
      scene_id: scene.id,
      scene_name: scene.scene_name,
      acquisition_date: scene.acquisition_date,
      sensor: scene.sensor,
      source: scene.source,
      processing_status: scene.processing_status,
      processing_logs: logs
    });
  });

  app.get('/api/provenance/:sceneId/history', (req: Request, res: Response) => {
    const sceneId = parseInt(req.params.sceneId, 10);
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) {
      return res.status(404).json({ detail: 'Scene not found' });
    }

    const logs = processingLogs.filter(l => l.scene_id === sceneId);
    const history = logs.map(l => ({
      source: 'database',
      operation: l.operation,
      timestamp: l.timestamp,
      parameters: l.parameters,
      model_version: l.model_version,
      status: 'completed'
    }));

    res.json({
      scene_id: scene.id,
      scene_name: scene.scene_name,
      processing_history: history
    });
  });

  // 7. Sentinel-2 Discovery (Copernicus Data Space Ecosystem)
  interface SearchCacheEntry {
    timestamp: number;
    payload: any;
  }
  const sentinel2Cache = new Map<string, SearchCacheEntry>();
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

  function parseWktToGeoJson(wkt: string | undefined): {
    geometry: { type: 'Polygon'; coordinates: number[][][] };
    bbox: [number, number, number, number];
    center: [number, number];
  } {
    if (!wkt) {
      return {
        geometry: { type: 'Polygon', coordinates: [[]] },
        bbox: [0, 0, 0, 0],
        center: [0, 0]
      };
    }

    try {
      const match = wkt.match(/\(\s*\((.*?)\)\s*\)/) || wkt.match(/\((.*?)\)/);
      if (!match) {
        return {
          geometry: { type: 'Polygon', coordinates: [[]] },
          bbox: [0, 0, 0, 0],
          center: [0, 0]
        };
      }

      const pairs = match[1].split(',');
      const ring: number[][] = [];
      let minLon = Infinity;
      let minLat = Infinity;
      let maxLon = -Infinity;
      let maxLat = -Infinity;

      for (const pair of pairs) {
        const parts = pair.trim().split(/\s+/);
        if (parts.length >= 2) {
          const lon = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lon) && !isNaN(lat)) {
            ring.push([lon, lat]);
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        }
      }

      if (ring.length === 0) {
        return {
          geometry: { type: 'Polygon', coordinates: [[]] },
          bbox: [0, 0, 0, 0],
          center: [0, 0]
        };
      }

      return {
        geometry: { type: 'Polygon', coordinates: [ring] },
        bbox: [minLon, minLat, maxLon, maxLat],
        center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2]
      };
    } catch {
      return {
        geometry: { type: 'Polygon', coordinates: [[]] },
        bbox: [0, 0, 0, 0],
        center: [0, 0]
      };
    }
  }

  async function handleSentinel2Search(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const body = req.method === 'GET' ? req.query : req.body || {};

      let bbox: [number, number, number, number] | undefined = undefined;
      if (body.bbox) {
        if (typeof body.bbox === 'string') {
          const parts = body.bbox.split(',').map((n: string) => parseFloat(n.trim()));
          if (parts.length === 4 && parts.every((n: number) => !isNaN(n))) {
            bbox = [parts[0], parts[1], parts[2], parts[3]];
          }
        } else if (Array.isArray(body.bbox) && body.bbox.length === 4) {
          bbox = [Number(body.bbox[0]), Number(body.bbox[1]), Number(body.bbox[2]), Number(body.bbox[3])];
        }
      }

      const geojson_polygon = body.geojson_polygon;

      if (!bbox && (!geojson_polygon || !geojson_polygon.coordinates)) {
        return res.status(400).json({
          detail: 'Area of Interest is required. Please provide a bounding box [minLon, minLat, maxLon, maxLat] or GeoJSON polygon.'
        });
      }

      if (bbox) {
        const [minLon, minLat, maxLon, maxLat] = bbox;
        if (minLon >= maxLon || minLat >= maxLat || minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
          return res.status(400).json({
            detail: `Invalid bounding box coordinates [${bbox.join(', ')}]. Must satisfy: -180 <= minLon < maxLon <= 180 and -90 <= minLat < maxLat <= 90.`
          });
        }
      }

      const startDateStr = (body.start_date as string) || '';
      const endDateStr = (body.end_date as string) || '';

      if (!startDateStr || isNaN(Date.parse(startDateStr))) {
        return res.status(400).json({ detail: 'Valid start_date (YYYY-MM-DD) is required.' });
      }
      if (!endDateStr || isNaN(Date.parse(endDateStr))) {
        return res.status(400).json({ detail: 'Valid end_date (YYYY-MM-DD) is required.' });
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      if (startDate > endDate) {
        return res.status(400).json({ detail: 'start_date must be earlier than or equal to end_date.' });
      }

      const maxCloudCover = body.max_cloud_cover !== undefined ? parseFloat(String(body.max_cloud_cover)) : 100;
      if (isNaN(maxCloudCover) || maxCloudCover < 0 || maxCloudCover > 100) {
        return res.status(400).json({ detail: 'max_cloud_cover must be a number between 0 and 100.' });
      }

      const limit = Math.min(Math.max(parseInt(String(body.limit || '20'), 10), 1), 50);
      const productType = body.product_type && body.product_type !== 'ALL' ? String(body.product_type) : null;
      const forceRefresh = body.force_refresh === true || body.force_refresh === 'true' || req.query.force_refresh === 'true';

      // Check Cache
      const cacheKey = JSON.stringify({
        bbox: bbox ? bbox.map(n => Number(n.toFixed(3))) : null,
        polygon: geojson_polygon?.coordinates ? geojson_polygon.coordinates[0].map(pt => [Number(pt[0].toFixed(3)), Number(pt[1].toFixed(3))]) : null,
        startDateStr,
        endDateStr,
        maxCloudCover,
        productType: productType || 'ALL',
        limit
      });

      if (!forceRefresh && sentinel2Cache.has(cacheKey)) {
        const cached = sentinel2Cache.get(cacheKey)!;
        const ageMs = Date.now() - cached.timestamp;
        if (ageMs < CACHE_TTL_MS) {
          const cacheAgeSeconds = Math.round(ageMs / 1000);
          console.log(`[Sentinel-2 CDSE API] Cache HIT for key: ${cacheKey} (age: ${cacheAgeSeconds}s)`);
          const cachedPayload = cached.payload;
          const cachedResults = cachedPayload.results.map((p: any) => ({
            ...p,
            data_mode: 'cached' as const
          }));

          return res.json({
            ...cachedPayload,
            results: cachedResults,
            data_mode: 'cached',
            source: 'Copernicus Data Space Ecosystem (Cached)',
            cached_at: new Date(cached.timestamp).toISOString(),
            cache_age_seconds: cacheAgeSeconds,
            execution_time_ms: Date.now() - startTime,
            message: `Showing cached Copernicus Sentinel-2 search results (${cacheAgeSeconds}s old). Toggle Force Live Query to refresh.`
          });
        }
      }

      // Construct WKT polygon for OData intersection
      let aoiWkt = '';
      if (bbox) {
        const [minLon, minLat, maxLon, maxLat] = bbox;
        aoiWkt = `POLYGON((${minLon} ${minLat}, ${maxLon} ${minLat}, ${maxLon} ${maxLat}, ${minLon} ${maxLat}, ${minLon} ${minLat}))`;
      } else if (geojson_polygon?.coordinates?.[0]) {
        const ring = geojson_polygon.coordinates[0];
        const formatted = ring.map((pt: number[]) => `${pt[0]} ${pt[1]}`).join(', ');
        aoiWkt = `POLYGON((${formatted}))`;
      }

      // Build CDSE OData Filter with official index-optimized queries
      const filterConditions = [
        "Collection/Name eq 'SENTINEL-2'",
        `ContentDate/Start ge ${startDateStr}T00:00:00.000Z`,
        `ContentDate/Start le ${endDateStr}T23:59:59.999Z`
      ];

      // Official OData indexed attribute filter for productType (S2MSI2A / S2MSI1C)
      if (productType === 'S2MSI2A' || productType === 'S2MSI1C') {
        filterConditions.push(
          `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq '${productType}')`
        );
      }

      if (maxCloudCover < 100) {
        filterConditions.push(
          `Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/OData.CSC.DoubleAttribute/Value le ${maxCloudCover})`
        );
      }

      if (aoiWkt) {
        filterConditions.push(`OData.CSC.Intersects(area=geography'SRID=4326;${aoiWkt}')`);
      }

      const odataFilterStr = filterConditions.join(' and ');
      const cdseUrl = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$filter=${encodeURIComponent(
        odataFilterStr
      )}&$expand=Attributes&$top=${limit}&$orderby=ContentDate/Start desc`;

      console.log(`[Sentinel-2 CDSE API] Direct live query: ${cdseUrl}`);

      // 25 second timeout for CDSE catalog response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let cdseData: any = null;
      let upstreamError: string | null = null;
      try {
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'User-Agent': 'TerraVektor-Satellite-Discovery/1.0'
        };

        if (process.env.CDSE_ACCESS_TOKEN) {
          headers['Authorization'] = `Bearer ${process.env.CDSE_ACCESS_TOKEN}`;
        }

        const response = await fetch(cdseUrl, {
          method: 'GET',
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          cdseData = await response.json();
        } else {
          const errText = await response.text();
          upstreamError = `HTTP ${response.status}: ${errText.slice(0, 150)}`;
          console.warn(`[Sentinel-2 CDSE API] Upstream error: ${upstreamError}`);
        }
      } catch (netErr: any) {
        clearTimeout(timeoutId);
        upstreamError = netErr.name === 'AbortError' ? 'Copernicus CDSE response timed out after 25s' : netErr.message;
        console.warn(`[Sentinel-2 CDSE API] Direct network issue: ${upstreamError}`);
      }

      // Process live Copernicus products if received
      if (cdseData && Array.isArray(cdseData.value)) {
        const results = cdseData.value.map((item: any) => {
          const attrs = Array.isArray(item.Attributes) ? item.Attributes : [];
          const attrMap: Record<string, any> = {};
          attrs.forEach((a: any) => {
            if (a.Name) attrMap[a.Name] = a.Value;
          });

          // Prefer native GeoFootprint if provided by CDSE OData, else parse WKT Footprint
          let geometry: { type: 'Polygon'; coordinates: number[][][] };
          let bboxArr: [number, number, number, number];
          let centerArr: [number, number];

          if (item.GeoFootprint?.coordinates?.[0]?.length >= 3) {
            geometry = item.GeoFootprint;
            const ring = item.GeoFootprint.coordinates[0];
            let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
            for (const pt of ring) {
              const lon = pt[0];
              const lat = pt[1];
              if (lon < minLon) minLon = lon;
              if (lon > maxLon) maxLon = lon;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            }
            bboxArr = [minLon, minLat, maxLon, maxLat];
            centerArr = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
          } else {
            const parsed = parseWktToGeoJson(item.Footprint);
            geometry = parsed.geometry;
            bboxArr = parsed.bbox;
            centerArr = parsed.center;
          }

          const cloudCoverVal = typeof attrMap.cloudCover === 'number' ? attrMap.cloudCover : 0;
          const pType = attrMap.productType || (item.Name?.includes('MSIL2A') ? 'S2MSI2A' : 'S2MSI1C');
          const platformSerial = attrMap.platformSerialIdentifier || (item.Name?.startsWith('S2A') ? 'A' : 'B');
          const platformName = `Sentinel-2${platformSerial}`;
          const tileId = attrMap.tileId || (item.Name?.match(/T[0-9]{2}[A-Z]{3}/)?.[0] || 'Unknown');

          const cdseBrowserUrl = `https://browser.dataspace.copernicus.eu/?zoom=11&lat=${centerArr[1].toFixed(
            4
          )}&lng=${centerArr[0].toFixed(4)}&themeId=DEFAULT-THEME&datasetId=S2_L2A_CDAS`;

          return {
            id: item.Id,
            name: item.Name,
            product_type: pType,
            acquisition_date: item.ContentDate?.Start || item.OriginDate,
            cloud_cover: Number(cloudCoverVal.toFixed(2)),
            platform: platformName,
            tile_id: tileId,
            footprint_wkt: item.Footprint,
            geometry,
            bbox: bboxArr,
            center: centerArr,
            data_mode: 'live_copernicus' as const,
            download_url: `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${item.Id})/$value`,
            cdse_browser_url: cdseBrowserUrl,
            origin: attrMap.origin || 'ESA',
            content_length_bytes: item.ContentLength || 0,
            metadata: {
              orbit_number: attrMap.orbitNumber,
              relative_orbit: attrMap.relativeOrbitNumber,
              processing_level: attrMap.processingLevel || pType,
              processor_version: attrMap.processorVersion,
              datastrip_id: attrMap.datastripId,
              granule_identifier: attrMap.granuleIdentifier,
              online_status: item.Online ? 'Online' : 'Archive',
              publication_date: item.PublicationDate
            }
          };
        });

        console.log(`[Sentinel-2 CDSE API] Live products returned: ${results.length}`);

        const responsePayload = {
          total_results: results.length,
          results,
          query_params: {
            bbox,
            geojson_polygon,
            start_date: startDateStr,
            end_date: endDateStr,
            max_cloud_cover: maxCloudCover,
            product_type: productType || 'ALL',
            limit,
            force_refresh: forceRefresh
          },
          source: 'Copernicus Data Space Ecosystem (CDSE)',
          data_mode: 'live_copernicus' as const,
          api_endpoint: 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products',
          odata_filter: odataFilterStr,
          execution_time_ms: Date.now() - startTime,
          message: results.length === 0 ? 'No Sentinel-2 scenes matched these exact filter parameters on Copernicus CDSE. Try adjusting cloud cover threshold or date range.' : undefined
        };

        // Cache live result
        sentinel2Cache.set(cacheKey, {
          timestamp: Date.now(),
          payload: responsePayload
        });

        return res.json(responsePayload);
      }

      // Resilient Fallback: Preserved if Copernicus CDSE is temporarily unreachable
      console.log('[Sentinel-2 CDSE API] Generating fallback demonstration data (reason:', upstreamError, ')');
      const fallbackCenterLat = bbox ? (bbox[1] + bbox[3]) / 2 : 18.5204;
      const fallbackCenterLon = bbox ? (bbox[0] + bbox[2]) / 2 : 73.8567;
      const span = 0.5;

      const fallbackCount = Math.min(5, limit);
      const fallbackResults = Array.from({ length: fallbackCount }).map((_, i) => {
        const offsetDays = i * 4;
        const acq = new Date(endDate.getTime() - offsetDays * 86400000);
        const tile = '43QCA';
        const id = `cdse-mock-${Date.now()}-${i}`;
        const pType = productType || 'S2MSI2A';
        const name = `S2A_${pType}_${acq.toISOString().replace(/[-:]/g, '').slice(0, 15)}_N0510_R105_T${tile}_${acq.toISOString().slice(0, 10).replace(/-/g, '')}.SAFE`;
        
        const minX = fallbackCenterLon - span / 2 + (i % 2 === 0 ? 0.05 : -0.05);
        const maxX = minX + span;
        const minY = fallbackCenterLat - span / 2;
        const maxY = minY + span;

        const coords = [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY]
        ];

        return {
          id,
          name,
          product_type: pType,
          acquisition_date: acq.toISOString(),
          cloud_cover: Number((Math.random() * Math.min(maxCloudCover, 25)).toFixed(2)),
          platform: i % 2 === 0 ? 'Sentinel-2A' : 'Sentinel-2B',
          tile_id: tile,
          footprint_wkt: `POLYGON ((${coords.map(c => `${c[0]} ${c[1]}`).join(', ')}))`,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [coords]
          },
          bbox: [minX, minY, maxX, maxY] as [number, number, number, number],
          center: [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number],
          data_mode: 'demo_fallback' as const,
          download_url: `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${id})/$value`,
          cdse_browser_url: `https://browser.dataspace.copernicus.eu/?zoom=11&lat=${fallbackCenterLat.toFixed(4)}&lng=${fallbackCenterLon.toFixed(4)}`,
          origin: 'ESA',
          content_length_bytes: 850000000,
          metadata: {
            note: 'Demonstration dataset active due to temporary CDSE endpoint timeout or network restrictions'
          }
        };
      });

      return res.json({
        total_results: fallbackResults.length,
        results: fallbackResults,
        query_params: {
          bbox,
          geojson_polygon,
          start_date: startDateStr,
          end_date: endDateStr,
          max_cloud_cover: maxCloudCover,
          product_type: productType || 'ALL',
          limit,
          force_refresh: forceRefresh
        },
        source: 'Demonstration / Fallback Sentinel-2 Data',
        data_mode: 'demo_fallback',
        api_endpoint: 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products',
        odata_filter: odataFilterStr,
        execution_time_ms: Date.now() - startTime,
        message: `Direct Copernicus CDSE endpoint timed out (${upstreamError || 'upstream delay'}). Showing demonstration Sentinel-2 scenes for the selected AOI.`
      });
    } catch (err: any) {
      console.error('[Sentinel-2 API] Error handling search request:', err);
      return res.status(500).json({
        detail: `Failed to search Sentinel-2 imagery: ${err.message || 'Internal server error'}`
      });
    }
  }

  app.post('/api/sentinel2/search', handleSentinel2Search);
  app.get('/api/sentinel2/search', handleSentinel2Search);

  // Frontend Serving (Dev via Vite middleware, Prod via express.static)
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
