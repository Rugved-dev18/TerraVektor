from abc import ABC, abstractmethod
from typing import List, Optional
import numpy as np

class EmbeddingService(ABC):
    """Abstract interface for embedding generation service"""
    
    @abstractmethod
    def generate_text_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text query"""
        pass
    
    @abstractmethod
    def generate_image_embedding(self, image_path: str) -> np.ndarray:
        """Generate embedding for image"""
        pass
    
    @abstractmethod
    def get_embedding_dimension(self) -> int:
        """Return the dimension of embeddings"""
        pass

class MockEmbeddingService(EmbeddingService):
    """Mock implementation for MVP - returns random embeddings"""
    
    def __init__(self, dimension: int = 512):
        self.dimension = dimension
    
    def generate_text_embedding(self, text: str) -> np.ndarray:
        # Generate deterministic but pseudo-random embedding based on text
        np.random.seed(hash(text) % (2**32))
        return np.random.rand(self.dimension).astype(np.float32)
    
    def generate_image_embedding(self, image_path: str) -> np.ndarray:
        # Generate deterministic but pseudo-random embedding based on path
        np.random.seed(hash(image_path) % (2**32))
        return np.random.rand(self.dimension).astype(np.float32)
    
    def get_embedding_dimension(self) -> int:
        return self.dimension
