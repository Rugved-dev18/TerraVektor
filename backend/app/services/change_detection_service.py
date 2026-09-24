from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from datetime import datetime

class ChangeDetectionService(ABC):
    """Abstract interface for change detection service"""
    
    @abstractmethod
    def detect_changes(self, before_scene_id: int, after_scene_id: int) -> List[Dict]:
        """Detect changes between two scenes"""
        pass
    
    @abstractmethod
    def analyze_change_type(self, change_data: Dict) -> str:
        """Classify the type of change (construction, vegetation, water, etc.)"""
        pass
    
    @abstractmethod
    def calculate_confidence(self, change_data: Dict) -> float:
        """Calculate confidence score for detected change"""
        pass

class MockChangeDetectionService(ChangeDetectionService):
    """Mock implementation for MVP - returns simulated change candidates"""
    
    def detect_changes(self, before_scene_id: int, after_scene_id: int) -> List[Dict]:
        # Simulate detecting changes with random locations around Indian cities
        import random
        
        changes = []
        indian_locations = [
            (18.5204, 73.8567),  # Pune
            (19.0760, 72.8777),  # Mumbai
            (21.1458, 79.0882),  # Nagpur
            (19.9975, 73.7898),  # Nashik
            (12.9716, 77.5946),  # Bengaluru
            (17.3850, 78.4867),  # Hyderabad
            (28.7041, 77.1025),  # Delhi
            (13.0827, 80.2707),  # Chennai
            (22.5726, 88.3639),  # Kolkata
            (26.9124, 75.7873),  # Jaipur
        ]
        
        # Generate 1-3 change candidates
        num_changes = random.randint(1, 3)
        base_lat, base_lon = random.choice(indian_locations)
        
        change_types = ["construction", "vegetation", "water", "urban_expansion", "deforestation"]
        
        for i in range(num_changes):
            # Add some random offset to base location
            lat_offset = random.uniform(-0.1, 0.1)
            lon_offset = random.uniform(-0.1, 0.1)
            
            change = {
                "before_scene_id": before_scene_id,
                "after_scene_id": after_scene_id,
                "latitude": base_lat + lat_offset,
                "longitude": base_lon + lon_offset,
                "change_type": random.choice(change_types),
                "confidence": random.uniform(0.6, 0.95),
                "earliest_detection_date": datetime.now(),
                "status": "pending"
            }
            changes.append(change)
        
        return changes
    
    def analyze_change_type(self, change_data: Dict) -> str:
        # Mock implementation - return random change type
        import random
        change_types = ["construction", "vegetation", "water", "urban_expansion", "deforestation"]
        return random.choice(change_types)
    
    def calculate_confidence(self, change_data: Dict) -> float:
        # Mock implementation - return random confidence
        import random
        return random.uniform(0.6, 0.95)
