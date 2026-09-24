from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class AnalystReview(Base):
    __tablename__ = "analyst_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("change_candidates.id"), index=True)
    decision = Column(String)  # confirmed, rejected, needs_review
    comment = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    candidate = relationship("ChangeCandidate", back_populates="reviews")
