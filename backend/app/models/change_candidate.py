from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ChangeCandidate(Base):
    __tablename__ = "change_candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    before_scene_id = Column(Integer, ForeignKey("scenes.id"), index=True)
    after_scene_id = Column(Integer, ForeignKey("scenes.id"), index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    change_type = Column(String, index=True)  # e.g., "construction", "vegetation", "water"
    confidence = Column(Float)
    earliest_detection_date = Column(DateTime)
    status = Column(String, default="pending")  # pending, confirmed, rejected, false_alarm
    
    # Relationships
    reviews = relationship("AnalystReview", back_populates="candidate")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
