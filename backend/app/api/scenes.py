from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Scene
from app.schemas.scene import SceneCreate, Scene as SceneSchema, SceneUpdate

router = APIRouter()

@router.get("/scenes", response_model=List[SceneSchema])
async def get_scenes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all satellite scenes with pagination"""
    scenes = db.query(Scene).offset(skip).limit(limit).all()
    return scenes

@router.get("/scenes/{scene_id}", response_model=SceneSchema)
async def get_scene(scene_id: int, db: Session = Depends(get_db)):
    """Get a specific scene by ID"""
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene

@router.post("/ingest")
async def ingest_scene(scene_data: SceneCreate, db: Session = Depends(get_db)):
    """Ingest a new satellite scene"""
    # Check if scene already exists
    existing_scene = db.query(Scene).filter(Scene.scene_name == scene_data.scene_name).first()
    if existing_scene:
        raise HTTPException(status_code=400, detail="Scene with this name already exists")
    
    # Create new scene
    new_scene = Scene(**scene_data.dict())
    db.add(new_scene)
    db.commit()
    db.refresh(new_scene)
    
    return {
        "message": "Scene ingested successfully",
        "scene_id": new_scene.id,
        "scene_name": new_scene.scene_name
    }
