from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import sentinel2

app = FastAPI(
    title="TerraVektor Satellite Analysis & Sentinel-2 Discovery API",
    description="Official Copernicus Data Space Ecosystem Sentinel-2 integration and imagery analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sentinel2.router, prefix="/api/sentinel2", tags=["sentinel2"])

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "operational",
        "services": {
            "sentinel2_cdse": "active",
            "change_detection": "active",
            "vector_search": "active"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
