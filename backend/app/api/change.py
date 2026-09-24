from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import ChangeCandidate, Scene
from app.schemas.change import ChangeCandidateCreate, ChangeCandidate as ChangeCandidateSchema
from app.services.change_detection_service import MockChangeDetectionService

router = APIRouter()

# Initialize mock change detection service
change_detection_service = MockChangeDetectionService()

@router.post("/analyze")
async def analyze_changes(before_scene_id: int, after_scene_id: int, db: Session = Depends(get_db)):
    """Analyze changes between two scenes"""
    
    # Verify scenes exist
    before_scene = db.query(Scene).filter(Scene.id == before_scene_id).first()
    after_scene = db.query(Scene).filter(Scene.id == after_scene_id).first()
    
    if not before_scene or not after_scene:
        raise HTTPException(status_code=404, detail="One or both scenes not found")
    
    # Detect changes using mock service
    detected_changes = change_detection_service.detect_changes(before_scene_id, after_scene_id)
    
    # Store change candidates in database
    created_candidates = []
    for change_data in detected_changes:
        new_candidate = ChangeCandidate(**change_data)
        db.add(new_candidate)
        db.commit()
        db.refresh(new_candidate)
        created_candidates.append(new_candidate)
    
    return {
        "message": f"Change analysis completed. Found {len(created_candidates)} change candidates.",
        "change_candidates": [ChangeCandidateSchema.from_orm(c) for c in created_candidates]
    }

@router.get("/change/{change_id}", response_model=ChangeCandidateSchema)
async def get_change_candidate(change_id: int, db: Session = Depends(get_db)):
    """Get a specific change candidate by ID"""
    candidate = db.query(ChangeCandidate).filter(ChangeCandidate.id == change_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Change candidate not found")
    return candidate

@router.get("/candidates")
async def get_change_candidates(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(get_db)
):
    """Get change candidates with optional status filter"""
    query = db.query(ChangeCandidate)
    
    if status:
        query = query.filter(ChangeCandidate.status == status)
    
    candidates = query.offset(skip).limit(limit).all()
    return [ChangeCandidateSchema.from_orm(c) for c in candidates]
