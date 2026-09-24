from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Scene(Base):
    __tablename__ = "scenes"
    
    id = Column(Integer, primary_key=True, index=True)
    scene_name = Column(String, unique=True, index=True)
    sensor = Column(String, index=True)
    acquisition_date = Column(DateTime, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    bbox = Column(String)  # Stored as JSON string "minx,miny,maxx,maxy"
    resolution = Column(Float)
    cloud_percentage = Column(Float)
    file_path = Column(String)
    thumbnail_path = Column(String)
    crs = Column(String)  # Coordinate Reference System
    source = Column(String)
    processing_status = Column(String, default="pending")
    
    # Relationships
    tiles = relationship("Tile", back_populates="scene")
    processing_logs = relationship("ProcessingLog", back_populates="scene")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
