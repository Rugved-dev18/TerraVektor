from abc import ABC, abstractmethod
from typing import Tuple, Optional
import numpy as np

class ImagePreprocessingService(ABC):
    """Abstract interface for image preprocessing service"""
    
    @abstractmethod
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess satellite image for analysis"""
        pass
    
    @abstractmethod
    def normalize_image(self, image: np.ndarray) -> np.ndarray:
        """Normalize image values"""
        pass
    
    @abstractmethod
    def extract_tiles(self, image: np.ndarray, tile_size: int = 256) -> list:
        """Extract tiles from image for processing"""
        pass
    
    @abstractmethod
    def generate_thumbnail(self, image_path: str, output_path: str, size: Tuple[int, int] = (256, 256)):
        """Generate thumbnail from image"""
        pass

class MockImagePreprocessingService(ImagePreprocessingService):
    """Mock implementation for MVP"""
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        # Mock implementation - return random array
        return np.random.rand(512, 512, 3).astype(np.float32)
    
    def normalize_image(self, image: np.ndarray) -> np.ndarray:
        # Simple normalization to [0, 1]
        if image.max() > 0:
            return image / image.max()
        return image
    
    def extract_tiles(self, image: np.ndarray, tile_size: int = 256) -> list:
        # Mock implementation - return mock tiles
        height, width = image.shape[:2]
        tiles = []
        
        for y in range(0, height, tile_size):
            for x in range(0, width, tile_size):
                tile = image[y:y+tile_size, x:x+tile_size]
                if tile.shape[0] > 0 and tile.shape[1] > 0:
                    tiles.append(tile)
        
        return tiles
    
    def generate_thumbnail(self, image_path: str, output_path: str, size: Tuple[int, int] = (256, 256)):
        # Mock implementation - just create a placeholder
        import os
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Create a simple placeholder image
        from PIL import Image
        import numpy as np
        
        # Create a random colored image as placeholder
        img_array = np.random.randint(0, 255, (*size, 3), dtype=np.uint8)
        img = Image.fromarray(img_array)
        img.save(output_path)
