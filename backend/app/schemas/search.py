from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 10
    filters: Optional[dict] = None

class ImageSearchRequest(BaseModel):
    image_data: str  # Base64 encoded image
    limit: int = 10
    filters: Optional[dict] = None

class SearchResult(BaseModel):
    scene_id: int
    scene_name: str
    similarity_score: float
    acquisition_date: datetime
    latitude: float
    longitude: float
    thumbnail_path: str
    metadata: dict

class SemanticSearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    total_results: int

class ImageSearchResponse(BaseModel):
    results: List[SearchResult]
    total_results: int
