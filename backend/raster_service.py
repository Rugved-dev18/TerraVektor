from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Tuple
import logging
import sys
import os

# Add parent directory to path to import from app.services
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.services.change_detection_service import ChangeDetectionService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TerraVektor Raster Processing Service",
    description="Real Sentinel-2 spectral band processing for change detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize change detection service
change_service = ChangeDetectionService()

class ChangeDetectionRequest(BaseModel):
    before_product_name: str
    after_product_name: str
    bbox: Tuple[float, float, float, float]  # [minLon, minLat, maxLon, maxLat]
    change_threshold: float = 0.2

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "raster-processing",
        "version": "1.0.0",
        "capabilities": {
            "ndvi_calculation": True,
            "cog_access": True,
            "change_detection": True
        }
    }

@app.post("/analyze-change")
async def analyze_change(request: ChangeDetectionRequest):
    """
    Perform real change detection using actual Sentinel-2 B4/B8 spectral bands.
    
    This endpoint:
    1. Accesses public Sentinel-2 L2A COG mirror for B04 (Red) and B08 (NIR) bands
    2. Crops data to the specified AOI bounding box
    3. Calculates real NDVI: (B8 - B4) / (B8 + B4)
    4. Computes NDVI difference between before/after scenes
    5. Generates pixel-level change mask based on threshold
    6. Returns actual statistics from real pixel data
    """
    try:
        result = change_service.detect_changes(
            before_product_name=request.before_product_name,
            after_product_name=request.after_product_name,
            bbox=request.bbox,
            change_threshold=request.change_threshold
        )
        
        if not result.get('success', False):
            raise HTTPException(
                status_code=503,
                detail=result
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Change analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "data_mode": "processing_unavailable",
                "reason": str(e),
                "failed_source": "raster_service",
                "required_next_step": "Check error logs and service configuration"
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")