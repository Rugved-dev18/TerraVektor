from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import scenes, search, change, review, provenance, health
from app.database import engine, Base
from app.models import Scene, Tile, ChangeCandidate, AnalystReview, ProcessingLog

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Satellite Change Analysis API",
    description="API for semantic retrieval and multi-temporal change analysis of satellite imagery",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(scenes.router, prefix="/api", tags=["scenes"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(change.router, prefix="/api/change", tags=["change"])
app.include_router(review.router, prefix="/api", tags=["review"])
app.include_router(provenance.router, prefix="/api", tags=["provenance"])

@app.get("/")
async def root():
    return {
        "message": "Satellite Change Analysis API",
        "version": "1.0.0",
        "status": "operational"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
