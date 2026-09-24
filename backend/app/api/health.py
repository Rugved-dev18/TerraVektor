from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    services: dict

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        database="sqlite",
        services={
            "embedding": "mock",
            "vector_search": "mock",
            "change_detection": "mock",
            "image_preprocessing": "mock",
            "provenance": "mock"
        }
    )
