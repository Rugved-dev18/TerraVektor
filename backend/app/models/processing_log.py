from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ProcessingLog(Base):
    __tablename__ = "processing_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id"), index=True)
    operation = Column(String, index=True)  # e.g., "ingestion", "embedding", "change_detection"
    model_version = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    parameters = Column(Text)  # Stored as JSON string
    
    # Relationships
    scene = relationship("Scene", back_populates="processing_logs")
