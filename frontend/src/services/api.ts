import axios from 'axios';
import {
  Scene,
  ChangeCandidate,
  AnalystReview,
  SearchResult,
  SemanticSearchRequest,
  SemanticSearchResponse,
  HealthResponse,
  ProvenanceData
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const getHealth = async (): Promise<HealthResponse> => {
  const response = await api.get('/api/health');
  return response.data;
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

export default api;
