from abc import ABC, abstractmethod
from typing import List, Tuple, Optional
import numpy as np

class VectorSearchService(ABC):
    """Abstract interface for vector search service"""
    
    @abstractmethod
    def add_embedding(self, embedding_id: str, embedding: np.ndarray, metadata: dict):
        """Add an embedding to the vector store"""
        pass
    
    @abstractmethod
    def search(self, query_embedding: np.ndarray, k: int = 10) -> List[Tuple[str, float, dict]]:
        """Search for similar embeddings, returns list of (embedding_id, score, metadata)"""
        pass
    
    @abstractmethod
    def delete_embedding(self, embedding_id: str):
        """Delete an embedding from the store"""
        pass
    
    @abstractmethod
    def get_embedding_count(self) -> int:
        """Return total number of embeddings in store"""
        pass

class MockVectorSearchService(VectorSearchService):
    """Mock implementation for MVP - uses simple cosine similarity"""
    
    def __init__(self):
        self.embeddings = {}  # embedding_id -> (vector, metadata)
    
    def add_embedding(self, embedding_id: str, embedding: np.ndarray, metadata: dict):
        self.embeddings[embedding_id] = (embedding, metadata)
    
    def search(self, query_embedding: np.ndarray, k: int = 10) -> List[Tuple[str, float, dict]]:
        results = []
        
        for emb_id, (emb, metadata) in self.embeddings.items():
            # Calculate cosine similarity
            similarity = self._cosine_similarity(query_embedding, emb)
            results.append((emb_id, similarity, metadata))
        
        # Sort by similarity (descending) and return top k
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:k]
    
    def delete_embedding(self, embedding_id: str):
        if embedding_id in self.embeddings:
            del self.embeddings[embedding_id]
    
    def get_embedding_count(self) -> int:
        return len(self.embeddings)
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return dot_product / (norm_a * norm_b)
