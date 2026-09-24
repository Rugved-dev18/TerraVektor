from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Scene
from app.schemas.search import SemanticSearchRequest, ImageSearchRequest, SemanticSearchResponse, ImageSearchResponse, SearchResult
from app.services.embedding_service import MockEmbeddingService
from app.services.vector_search_service import MockVectorSearchService

router = APIRouter()

# Initialize mock services
embedding_service = MockEmbeddingService()
vector_search_service = MockVectorSearchService()

@router.post("/semantic", response_model=SemanticSearchResponse)
async def semantic_search(request: SemanticSearchRequest, db: Session = Depends(get_db)):
    """Perform semantic text search for satellite imagery"""
    
    # Generate embedding for query
    query_embedding = embedding_service.generate_text_embedding(request.query)
    
    # Search vector store
    search_results = vector_search_service.search(query_embedding, k=request.limit)
    
    # Convert to SearchResult format
    results = []
    for emb_id, score, metadata in search_results:
        scene_id = metadata.get("scene_id")
        if scene_id:
            scene = db.query(Scene).filter(Scene.id == scene_id).first()
            if scene:
                result = SearchResult(
                    scene_id=scene.id,
                    scene_name=scene.scene_name,
                    similarity_score=score,
                    acquisition_date=scene.acquisition_date,
                    latitude=scene.latitude,
                    longitude=scene.longitude,
                    thumbnail_path=scene.thumbnail_path,
                    metadata=metadata
                )
                results.append(result)
    
    return SemanticSearchResponse(
        results=results,
        query=request.query,
        total_results=len(results)
    )

@router.post("/image", response_model=ImageSearchResponse)
async def image_search(request: ImageSearchRequest, db: Session = Depends(get_db)):
    """Perform image-based search for similar satellite imagery"""
    
    # In a real implementation, we would decode the base64 image and generate embedding
    # For MVP, we'll use a mock embedding based on the image data string
    query_embedding = embedding_service.generate_text_embedding(request.image_data)
    
    # Search vector store
    search_results = vector_search_service.search(query_embedding, k=request.limit)
    
    # Convert to SearchResult format
    results = []
    for emb_id, score, metadata in search_results:
        scene_id = metadata.get("scene_id")
        if scene_id:
            scene = db.query(Scene).filter(Scene.id == scene_id).first()
            if scene:
                result = SearchResult(
                    scene_id=scene.id,
                    scene_name=scene.scene_name,
                    similarity_score=score,
                    acquisition_date=scene.acquisition_date,
                    latitude=scene.latitude,
                    longitude=scene.longitude,
                    thumbnail_path=scene.thumbnail_path,
                    metadata=metadata
                )
                results.append(result)
    
    return ImageSearchResponse(
        results=results,
        total_results=len(results)
    )
