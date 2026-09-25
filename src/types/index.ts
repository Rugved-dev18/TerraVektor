export interface Scene {
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

export interface ChangeCandidate {
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

export interface AnalystReview {
  id: number;
  candidate_id: number;
  decision: 'confirmed' | 'rejected' | 'needs_review';
  comment?: string;
  timestamp: string;
}

export interface SearchResult {
  scene_id: number;
  scene_name: string;
  similarity_score: number;
  acquisition_date: string;
  latitude: number;
  longitude: number;
  thumbnail_path: string;
  metadata: Record<string, any>;
}

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
}

export interface SemanticSearchResponse {
  results: SearchResult[];
  query: string;
  total_results: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  services: Record<string, string>;
}

export interface ProcessingLog {
  id: number;
  scene_id: number;
  operation: string;
  model_version: string;
  timestamp: string;
  parameters: string;
}

export interface ProvenanceData {
  scene_id: number;
  scene_name: string;
  acquisition_date: string;
  sensor: string;
  source: string;
  processing_status: string;
  processing_logs: ProcessingLog[];
  [key: string]: any;
}

export interface Sentinel2SearchParams {
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  geojson_polygon?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  max_cloud_cover: number; // 0 - 100
  product_type?: 'S2MSI2A' | 'S2MSI1C' | 'ALL';
  limit?: number;
  force_refresh?: boolean;
}

export interface Sentinel2Product {
  id: string; // CDSE product UUID
  name: string; // e.g. S2A_MSIL2A_20240508...
  product_type: string; // S2MSI2A or S2MSI1C
  acquisition_date: string; // ISO 8601
  cloud_cover: number; // 0 - 100%
  platform: string; // Sentinel-2A or Sentinel-2B
  tile_id?: string;
  footprint_wkt?: string;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [ [ [lon, lat], ... ] ]
  };
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: [number, number]; // [lon, lat]
  data_mode: 'live_copernicus' | 'cached' | 'demo_fallback';
  thumbnail_url?: string;
  quicklook_url?: string;
  download_url: string;
  cdse_browser_url: string;
  origin: string;
  content_length_bytes?: number;
  metadata?: Record<string, any>;
}

export interface Sentinel2SearchResponse {
  total_results: number;
  results: Sentinel2Product[];
  query_params: Sentinel2SearchParams;
  source: string;
  data_mode: 'live_copernicus' | 'cached' | 'demo_fallback';
  api_endpoint: string;
  odata_filter?: string;
  execution_time_ms: number;
  cached_at?: string;
  cache_age_seconds?: number;
  message?: string;
}
