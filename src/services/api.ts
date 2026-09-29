import axios from 'axios';
import {
  Scene,
  ChangeCandidate,
  AnalystReview,
  SearchResult,
  SemanticSearchRequest,
  SemanticSearchResponse,
  HealthResponse,
  ProvenanceData,
  SemanticRetrievalRequest,
  SemanticRetrievalResponse,
  BuiltUpAnalysisResult,
  LocationResolutionResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const isExplicitDemoModeActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  const urlParam = new URLSearchParams(window.location.search).get('demo_mode');
  if (urlParam === 'true' || urlParam === '1') return true;
  return localStorage.getItem('terra_demo_mode') === 'true';
};

export const setExplicitDemoMode = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem('terra_demo_mode', 'true');
  } else {
    localStorage.removeItem('terra_demo_mode');
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (isExplicitDemoModeActive()) {
    config.headers['x-demo-mode'] = 'true';
  }
  return config;
});

// Health check
export const getHealth = async (): Promise<HealthResponse> => {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (err: any) {
    if (err.response?.data) {
      return err.response.data;
    }
    return {
      status: 'offline',
      version: '1.0.0',
      database: 'in-memory',
      data_mode: 'upstream_unavailable',
      source: 'Copernicus CDSE Unreachable',
      cdse_connected: false,
      services: {},
      error: 'Sentinel-2 processing unavailable',
      detail: 'Live Copernicus data could not be retrieved. Try again when the data service is available.'
    };
  }
};

// Scenes
export const getScenes = async (skip = 0, limit = 100): Promise<Scene[]> => {
  const response = await api.get(`/api/scenes?skip=${skip}&limit=${limit}`);
  return response.data;
};

export const getScene = async (sceneId: number): Promise<Scene> => {
  const response = await api.get(`/api/scenes/${sceneId}`);
  return response.data;
};

export const ingestScene = async (sceneData: Partial<Scene>): Promise<any> => {
  const response = await api.post('/api/ingest', sceneData);
  return response.data;
};

// Search
export const semanticSearch = async (request: SemanticSearchRequest): Promise<SemanticSearchResponse> => {
  const response = await api.post('/api/search/semantic', request);
  return response.data;
};

export const imageSearch = async (imageData: string, limit = 10): Promise<any> => {
  const response = await api.post('/api/search/image', {
    image_data: imageData,
    limit
  });
  return response.data;
};

// Change Analysis
export const analyzeChanges = async (beforeSceneId: number, afterSceneId: number): Promise<any> => {
  const response = await api.post('/api/change/analyze', null, {
    params: {
      before_scene_id: beforeSceneId,
      after_scene_id: afterSceneId
    }
  });
  return response.data;
};

export const getChangeCandidate = async (changeId: number): Promise<ChangeCandidate> => {
  const response = await api.get(`/api/change/change/${changeId}`);
  return response.data;
};

export const getChangeCandidates = async (status?: string): Promise<ChangeCandidate[]> => {
  const params = status ? { status } : {};
  const response = await api.get('/api/change/candidates', { params });
  return response.data;
};

// Review
export const reviewCandidate = async (candidateId: number, decision: string, comment?: string): Promise<any> => {
  const response = await api.post(`/api/review/${candidateId}`, {
    candidate_id: candidateId,
    decision,
    comment
  });
  return response.data;
};

export const getCandidateReviews = async (candidateId: number): Promise<AnalystReview[]> => {
  const response = await api.get(`/api/reviews/${candidateId}`);
  return response.data;
};

// Provenance
export const getSceneProvenance = async (sceneId: number): Promise<ProvenanceData> => {
  const response = await api.get(`/api/provenance/${sceneId}`);
  return response.data;
};

export const getProcessingHistory = async (sceneId: number): Promise<any> => {
  const response = await api.get(`/api/provenance/${sceneId}/history`);
  return response.data;
};

// Sentinel-2 Imagery Search (Copernicus Data Space Ecosystem)
export const searchSentinel2 = async (
  params: import('../types').Sentinel2SearchParams
): Promise<import('../types').Sentinel2SearchResponse> => {
  const response = await api.post('/api/sentinel2/search', params);
  return response.data;
};

// Sentinel-2 Image Preview URL Helper
export const getSentinel2PreviewUrl = (productId: string): string => {
  return `${API_BASE_URL}/api/sentinel2/preview/${productId}`;
};

// Sentinel-2 Change Analysis
export const analyzeSentinel2Change = async (
  beforeProductId: string,
  afterProductId: string,
  aoiBbox?: [number, number, number, number],
  method: 'ndvi_differencing' = 'ndvi_differencing'
): Promise<any> => {
  const response = await api.post('/api/change/analyze-sentinel2', {
    before_product_id: beforeProductId,
    after_product_id: afterProductId,
    aoi_bbox: aoiBbox,
    method
  });
  return response.data;
};

// Change Mask URL Helper
export const getChangeMaskUrl = (analysisId: string): string => {
  return `${API_BASE_URL}/api/change/mask/${analysisId}`;
};

// Semantic Retrieval (Natural Language Query Processing)
export const semanticRetrieval = async (request: SemanticRetrievalRequest): Promise<SemanticRetrievalResponse> => {
  const response = await api.post('/api/semantic-retrieval', request);
  return response.data;
};

// Built-up Change Analysis
export const analyzeBuiltUpChanges = async (
  beforeProductId: string,
  afterProductId: string,
  aoiBbox?: [number, number, number, number],
  ndbiIncreaseThreshold: number = 0.1,
  ndviDecreaseThreshold: number = -0.1,
  minAreaPixels: number = 50
): Promise<BuiltUpAnalysisResult> => {
  const response = await api.post('/api/change/analyze-built-up', {
    before_product_id: beforeProductId,
    after_product_id: afterProductId,
    aoi_bbox: aoiBbox,
    ndbi_increase_threshold: ndbiIncreaseThreshold,
    ndvi_decrease_threshold: ndviDecreaseThreshold,
    min_area_pixels: minAreaPixels
  });
  return response.data;
};

// Dynamic Geographic Location Resolution
export const resolveLocationQuery = async (query: string): Promise<LocationResolutionResponse> => {
  const response = await api.get('/api/location/resolve', {
    params: { q: query }
  });
  return response.data;
};

export default api;
