from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from datetime import datetime

class ProvenanceService(ABC):
    """Abstract interface for geospatial provenance tracking"""
    
    @abstractmethod
    def track_scene_provenance(self, scene_id: int, metadata: Dict):
        """Track provenance information for a scene"""
        pass
    
    @abstractmethod
    def get_scene_provenance(self, scene_id: int) -> Dict:
        """Retrieve provenance information for a scene"""
        pass
    
    @abstractmethod
    def track_processing_step(self, scene_id: int, operation: str, parameters: Dict):
        """Track a processing step in the pipeline"""
        pass
    
    @abstractmethod
    def get_processing_history(self, scene_id: int) -> List[Dict]:
        """Get complete processing history for a scene"""
        pass
    
    @abstractmethod
    def validate_data_lineage(self, scene_id: int) -> bool:
        """Validate that data lineage is complete and valid"""
        pass

class MockProvenanceService(ProvenanceService):
    """Mock implementation for MVP"""
    
    def __init__(self):
        self.provenance_data = {}  # scene_id -> provenance metadata
        self.processing_history = {}  # scene_id -> list of processing steps
    
    def track_scene_provenance(self, scene_id: int, metadata: Dict):
        if scene_id not in self.provenance_data:
            self.provenance_data[scene_id] = {}
        self.provenance_data[scene_id].update(metadata)
    
    def get_scene_provenance(self, scene_id: int) -> Dict:
        return self.provenance_data.get(scene_id, {
            "scene_id": scene_id,
            "source": "mock_data",
            "ingestion_date": datetime.now().isoformat(),
            "data_quality": "unknown",
            "processing_steps": []
        })
    
    def track_processing_step(self, scene_id: int, operation: str, parameters: Dict):
        if scene_id not in self.processing_history:
            self.processing_history[scene_id] = []
        
        step = {
            "operation": operation,
            "timestamp": datetime.now().isoformat(),
            "parameters": parameters,
            "status": "completed"
        }
        self.processing_history[scene_id].append(step)
    
    def get_processing_history(self, scene_id: int) -> List[Dict]:
        return self.processing_history.get(scene_id, [])
    
    def validate_data_lineage(self, scene_id: int) -> bool:
        # Mock implementation - always return True for MVP
        return True
