from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Scene, ProcessingLog
from app.services.provenance_service import MockProvenanceService

router = APIRouter()

# Initialize mock provenance service
provenance_service = MockProvenanceService()

@router.get("/provenance/{scene_id}")
async def get_scene_provenance(scene_id: int, db: Session = Depends(get_db)):
    """Get provenance information for a scene"""
    
    # Verify scene exists
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Get provenance from service
    provenance_data = provenance_service.get_scene_provenance(scene_id)
    
    # Get processing logs from database
    processing_logs = db.query(ProcessingLog).filter(ProcessingLog.scene_id == scene_id).all()
    
    # Enhance provenance with database information
    provenance_data.update({
        "scene_id": scene.id,
        "scene_name": scene.scene_name,
        "acquisition_date": scene.acquisition_date.isoformat(),
        "sensor": scene.sensor,
        "source": scene.source,
        "processing_status": scene.processing_status,
        "processing_logs": [
            {
                "id": log.id,
                "operation": log.operation,
                "model_version": log.model_version,
                "timestamp": log.timestamp.isoformat(),
                "parameters": log.parameters
            }
            for log in processing_logs
        ]
    })
    
    return provenance_data

@router.get("/provenance/{scene_id}/history")
async def get_processing_history(scene_id: int, db: Session = Depends(get_db)):
    """Get complete processing history for a scene"""
    
    # Verify scene exists
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Get processing history from service
    history = provenance_service.get_processing_history(scene_id)
    
    # Get processing logs from database
    processing_logs = db.query(ProcessingLog).filter(ProcessingLog.scene_id == scene_id).all()
    
    # Combine service and database history
    combined_history = []
    
    # Add service history
    for step in history:
        combined_history.append({
            "source": "service",
            "operation": step["operation"],
            "timestamp": step["timestamp"],
            "parameters": step["parameters"],
            "status": step["status"]
        })
    
    # Add database logs
    for log in processing_logs:
        combined_history.append({
            "source": "database",
            "operation": log.operation,
            "timestamp": log.timestamp.isoformat(),
            "parameters": log.parameters,
            "model_version": log.model_version,
            "status": "completed"
        })
    
    # Sort by timestamp
    combined_history.sort(key=lambda x: x["timestamp"])
    
    return {
        "scene_id": scene_id,
        "scene_name": scene.scene_name,
        "processing_history": combined_history
    }
