"""
Script to generate mock satellite imagery data for MVP
Creates 10 realistic satellite scenes and 5 change candidates using Indian geographic locations
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from datetime import datetime, timedelta
from app.database import SessionLocal, engine
from app.models import Scene, ChangeCandidate, ProcessingLog
from app.services.embedding_service import MockEmbeddingService
from app.services.vector_search_service import MockVectorSearchService
from app.services.provenance_service import MockProvenanceService
import random

def generate_mock_scenes():
    """Generate 10 mock satellite scenes with Indian locations"""
    
    indian_locations = [
        {
            "name": "Pune Urban Area",
            "lat": 18.5204,
            "lon": 73.8567,
            "sensor": "Sentinel-2",
            "source": "ESA"
        },
        {
            "name": "Mumbai Coastal Region",
            "lat": 19.0760,
            "lon": 72.8777,
            "sensor": "Landsat-8",
            "source": "USGS"
        },
        {
            "name": "Nagpur Industrial Zone",
            "lat": 21.1458,
            "lon": 79.0882,
            "sensor": "Sentinel-2",
            "source": "ESA"
        },
        {
            "name": "Nashik Agricultural Region",
            "lat": 19.9975,
            "lon": 73.7898,
            "sensor": "Landsat-8",
            "source": "USGS"
        },
        {
            "name": "Bengaluru Tech Corridor",
            "lat": 12.9716,
            "lon": 77.5946,
            "sensor": "Sentinel-2",
            "source": "ESA"
        },
        {
            "name": "Hyderabad Urban Expansion",
            "lat": 17.3850,
            "lon": 78.4867,
            "sensor": "Landsat-8",
            "source": "USGS"
        },
        {
            "name": "Delhi Metropolitan Area",
            "lat": 28.7041,
            "lon": 77.1025,
            "sensor": "Sentinel-2",
            "source": "ESA"
        },
        {
            "name": "Chennai Coastal Zone",
            "lat": 13.0827,
            "lon": 80.2707,
            "sensor": "Landsat-8",
            "source": "USGS"
        },
        {
            "name": "Kolkata Urban Region",
            "lat": 22.5726,
            "lon": 88.3639,
            "sensor": "Sentinel-2",
            "source": "ESA"
        },
        {
            "name": "Jaipur Heritage Site",
            "lat": 26.9124,
            "lon": 75.7873,
            "sensor": "Landsat-8",
            "source": "USGS"
        }
    ]
    
    db = SessionLocal()
    scenes = []
    
    for i, location in enumerate(indian_locations):
        # Generate random date within past year
        base_date = datetime.now() - timedelta(days=random.randint(30, 365))
        acquisition_date = base_date - timedelta(days=random.randint(0, 30))
        
        # Create bounding box around location
        bbox_size = 0.1
        bbox = f"{location['lon']-bbox_size},{location['lat']-bbox_size},{location['lon']+bbox_size},{location['lat']+bbox_size}"
        
        scene = Scene(
            scene_name=f"{location['name'].replace(' ', '_')}_{acquisition_date.strftime('%Y%m%d')}",
            sensor=location['sensor'],
            acquisition_date=acquisition_date,
            latitude=location['lat'],
            longitude=location['lon'],
            bbox=bbox,
            resolution=10.0 if location['sensor'] == "Sentinel-2" else 30.0,
            cloud_percentage=random.uniform(0, 30),
            file_path=f"data/imagery/mock_scene_{i+1}.tif",
            thumbnail_path=f"data/thumbnails/mock_scene_{i+1}.jpg",
            crs="EPSG:4326",
            source=location['source'],
            processing_status="completed"
        )
        
        db.add(scene)
        scenes.append(scene)
    
    db.commit()
    
    # Refresh to get IDs
    for scene in scenes:
        db.refresh(scene)
    
    print(f"Created {len(scenes)} mock scenes")
    return scenes

def generate_mock_change_candidates(scenes):
    """Generate 5 mock change candidates"""
    
    db = SessionLocal()
    change_candidates = []
    
    change_types = ["construction", "vegetation", "water", "urban_expansion", "deforestation"]
    
    # Create change candidates between pairs of scenes
    for i in range(5):
        if i + 1 < len(scenes):
            before_scene = scenes[i]
            after_scene = scenes[i + 1]
            
            # Generate change near the after scene location
            lat_offset = random.uniform(-0.05, 0.05)
            lon_offset = random.uniform(-0.05, 0.05)
            
            candidate = ChangeCandidate(
                before_scene_id=before_scene.id,
                after_scene_id=after_scene.id,
                latitude=after_scene.latitude + lat_offset,
                longitude=after_scene.longitude + lon_offset,
                change_type=change_types[i % len(change_types)],
                confidence=random.uniform(0.65, 0.92),
                earliest_detection_date=after_scene.acquisition_date,
                status="pending"
            )
            
            db.add(candidate)
            change_candidates.append(candidate)
    
    db.commit()
    
    # Refresh to get IDs
    for candidate in change_candidates:
        db.refresh(candidate)
    
    print(f"Created {len(change_candidates)} mock change candidates")
    return change_candidates

def populate_vector_store(scenes):
    """Populate mock vector store with scene embeddings"""
    
    embedding_service = MockEmbeddingService()
    vector_search_service = MockVectorSearchService()
    
    for scene in scenes:
        # Generate embedding for scene
        embedding = embedding_service.generate_text_embedding(scene.scene_name)
        
        # Add to vector store
        vector_search_service.add_embedding(
            embedding_id=f"scene_{scene.id}",
            embedding=embedding,
            metadata={
                "scene_id": scene.id,
                "scene_name": scene.scene_name,
                "sensor": scene.sensor,
                "acquisition_date": scene.acquisition_date.isoformat(),
                "location": f"{scene.latitude},{scene.longitude}"
            }
        )
    
    print(f"Populated vector store with {len(scenes)} embeddings")

def add_processing_logs(scenes):
    """Add mock processing logs for scenes"""
    
    db = SessionLocal()
    provenance_service = MockProvenanceService()
    
    operations = ["ingestion", "preprocessing", "embedding", "quality_check"]
    
    for scene in scenes:
        for operation in operations:
            # Add database log
            log = ProcessingLog(
                scene_id=scene.id,
                operation=operation,
                model_version="1.0.0-mock",
                parameters=f"{{'mock_parameter': 'value'}}"
            )
            db.add(log)
            
            # Add to provenance service
            provenance_service.track_processing_step(
                scene_id=scene.id,
                operation=operation,
                parameters={"mock_parameter": "value"}
            )
    
    db.commit()
    print(f"Added processing logs for {len(scenes)} scenes")

def main():
    print("Generating mock data for Satellite Change Analysis MVP...")
    
    # Generate scenes
    scenes = generate_mock_scenes()
    
    # Generate change candidates
    change_candidates = generate_mock_change_candidates(scenes)
    
    # Populate vector store
    populate_vector_store(scenes)
    
    # Add processing logs
    add_processing_logs(scenes)
    
    print("Mock data generation completed successfully!")
    print(f"Summary: {len(scenes)} scenes, {len(change_candidates)} change candidates")

if __name__ == "__main__":
    main()
