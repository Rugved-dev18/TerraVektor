from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ChangeCandidate, AnalystReview
from app.schemas.change import AnalystReviewCreate, AnalystReview as AnalystReviewSchema

router = APIRouter()

@router.post("/review/{candidate_id}")
async def review_candidate(
    candidate_id: int,
    review_data: AnalystReviewCreate,
    db: Session = Depends(get_db)
):
    """Submit an analyst review for a change candidate"""
    
    # Verify candidate exists
    candidate = db.query(ChangeCandidate).filter(ChangeCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Change candidate not found")
    
    # Create review
    new_review = AnalystReview(
        candidate_id=candidate_id,
        decision=review_data.decision,
        comment=review_data.comment
    )
    db.add(new_review)
    
    # Update candidate status based on review
    if review_data.decision == "confirmed":
        candidate.status = "confirmed"
    elif review_data.decision == "rejected":
        candidate.status = "rejected"
    elif review_data.decision == "needs_review":
        candidate.status = "pending"
    
    db.commit()
    db.refresh(new_review)
    
    return {
        "message": "Review submitted successfully",
        "review_id": new_review.id,
        "candidate_status": candidate.status
    }

@router.get("/reviews/{candidate_id}")
async def get_candidate_reviews(candidate_id: int, db: Session = Depends(get_db)):
    """Get all reviews for a specific change candidate"""
    # Verify candidate exists
    candidate = db.query(ChangeCandidate).filter(ChangeCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Change candidate not found")
    
    reviews = db.query(AnalystReview).filter(AnalystReview.candidate_id == candidate_id).all()
    return [AnalystReviewSchema.from_orm(r) for r in reviews]
