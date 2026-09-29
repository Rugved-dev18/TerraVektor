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
  data_mode?: 'live_sentinel2' | 'real_data' | 'demo_data' | 'upstream_unavailable' | 'processing_unavailable' | string;
  source?: string;
  cdse_connected?: boolean;
  services: Record<string, string>;
  error?: string;
  detail?: string;
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
  preview_url?: string;
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

export interface ChangeAnalysisRequest {
  before_product_id: string;
  after_product_id: string;
  aoi_bbox?: [number, number, number, number]; // minLon, minLat, maxLon, maxLat
  method?: 'ndvi_differencing';
}

export interface ChangeAnalysisResult {
  analysis_id: string;
  classification?: string;
  before_product_id: string;
  after_product_id: string;
  data_mode: 'real_sentinel2' | 'demo_fallback' | 'processing_unavailable';
  processing_method: string;
  change_percentage: number;
  before_ndvi_avg: number;
  after_ndvi_avg: number;
  change_mask_url: string;
  before_image_url: string;
  after_image_url: string;
  statistics: {
    total_pixels: number;
    changed_pixels: number;
    unchanged_pixels: number;
  };
  metadata: {
    before_date: string;
    after_date: string;
    before_cloud_cover: number;
    after_cloud_cover: number;
    aoi_bbox: [number, number, number, number] | null;
    processing_time_ms: number;
  };
  source?: string;
  limitations?: string[];
  message?: string;
}

// Semantic Retrieval Types
export interface ParsedQuery {
  location: string;
  aoi: [number, number, number, number] | null;
  startDate: string | null;
  endDate: string | null;
  phenomenon: string;
  direction: 'increase' | 'decrease' | 'change' | null;
  changeType?: 'vegetation' | 'built_up' | 'construction' | 'expansion' | null;
  error?: string;
}

export interface SemanticRetrievalRequest {
  query: string;
}

export interface SemanticRetrievalResponse {
  success: boolean;
  parsedQuery: ParsedQuery;
  beforeScene: any | null;
  afterScene: any | null;
  analysis: ChangeAnalysisResult | BuiltUpAnalysisResult | null;
  error?: string;
  message?: string;
  detail?: string;
  data_mode?: string;
  execution_time_ms?: number;
}

// Built-up Change Analysis Types
export interface BuiltUpAnalysisResult {
  analysis_id: string;
  classification: string;
  before_product_id: string;
  after_product_id: string;
  data_mode: 'real_sentinel2' | 'processing_unavailable';
  before: {
    product_id: string;
    date: string;
    tile: string;
  };
  after: {
    product_id: string;
    date: string;
    tile: string;
  };
  metrics: {
    mean_ndvi_before: number;
    mean_ndvi_after: number;
    mean_ndvi_change: number;
    mean_ndbi_before: number;
    mean_ndbi_after: number;
    mean_ndbi_change: number;
    total_valid_pixels: number;
    changed_pixels: number;
    change_percentage: number;
  };
  candidates: Array<{
    id: string;
    type: string;
    pixel_count: number;
    area_m2: number;
    centroid: number[];
    bounding_box: number[];
    mean_delta_ndvi: number;
    mean_delta_ndbi: number;
    min_delta_ndvi: number;
    max_delta_ndbi: number;
  }>;
  candidate_summary: {
    total_candidates: number;
    new_construction_count: number;
    building_expansion_count: number;
  };
  thresholds: {
    ndbi_increase_threshold: number;
    ndvi_decrease_threshold: number;
    min_area_pixels: number;
  };
  change_mask_url: string;
  before_image_url: string;
  after_image_url: string;
  metadata: {
    before_date: string;
    after_date: string;
    before_cloud_cover: number;
    after_cloud_cover: number;
    aoi_bbox: [number, number, number, number] | null;
    processing_time_ms: number;
  };
  source?: string;
  limitations?: string[];
  message?: string;
}

// Extended ParsedQuery for new parser
export interface ExtendedParsedQuery extends ParsedQuery {
  status?: 'valid' | 'incomplete' | 'ambiguous' | 'unsupported';
  missingFields?: string[];
}

// Dynamic Geographic Location Resolution Types
export interface ResolvedLocation {
  name: string;
  displayName: string;
  country?: string;
  countryCode?: string;
  state?: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: {
    lat: number;
    lon: number;
  };
  source: string;
  confidence: 'high' | 'medium' | 'low';
  placeType?: string;
  importance?: number;
}

export type LocationResolutionStatus = 'resolved' | 'ambiguous' | 'unresolved';

export interface LocationResolutionResponse {
  status: LocationResolutionStatus;
  query: string;
  location?: ResolvedLocation;
  candidates?: ResolvedLocation[];
  locationText?: string;
  message?: string;
  cached?: boolean;
  execution_time_ms?: number;
}

