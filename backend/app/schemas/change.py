from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ChangeCandidateBase(BaseModel):
    before_scene_id: int
    after_scene_id: int
    latitude: float
    longitude: float
    change_type: str
    confidence: float
    earliest_detection_date: datetime
    status: str = "pending"

class ChangeCandidateCreate(ChangeCandidateBase):
    pass

class ChangeCandidateUpdate(BaseModel):
    status: Optional[str] = None
    confidence: Optional[float] = None

class ChangeCandidate(ChangeCandidateBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AnalystReviewBase(BaseModel):
    candidate_id: int
    decision: str
    comment: Optional[str] = None

class AnalystReviewCreate(AnalystReviewBase):
    pass

class AnalystReview(AnalystReviewBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True
