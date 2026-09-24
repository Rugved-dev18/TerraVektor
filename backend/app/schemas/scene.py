from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class SceneBase(BaseModel):
    scene_name: str
    sensor: str
    acquisition_date: datetime
    latitude: float
    longitude: float
    bbox: str
    resolution: float
    cloud_percentage: float
    file_path: str
    thumbnail_path: str
    crs: str
    source: str
    processing_status: str = "pending"

class SceneCreate(SceneBase):
    pass

class SceneUpdate(BaseModel):
    processing_status: Optional[str] = None
    cloud_percentage: Optional[float] = None

class Scene(SceneBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
