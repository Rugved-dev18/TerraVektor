from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Tile(Base):
    __tablename__ = "tiles"
    
    id = Column(Integer, primary_key=True, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id"), index=True)
    tile_path = Column(String)
    thumbnail_path = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    bbox = Column(String)  # Stored as JSON string "minx,miny,maxx,maxy"
    embedding_id = Column(String, index=True)  # Reference to vector store
    
    # Relationships
    scene = relationship("Scene", back_populates="tiles")
