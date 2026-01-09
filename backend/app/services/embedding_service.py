"""Embedding service using Google Gemini"""
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from typing import List
import logging
from ..config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate embeddings using Google Gemini Embedding models"""
    
    def __init__(
        self,
        model_name: str = "text-embedding-004"
    ):
        """
        Initialize embedding service
        
        Args:
            model_name: Name of the embedding model
        """
        self.model_name = model_name
        
        # Initialize embeddings with GoogleGenerativeAIEmbeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=model_name,
            google_api_key=settings.google_api_key,
            vertexai =True
        )
        
        logger.info(f"EmbeddingService initialized with model: {model_name}")
    
    async def embed_chunks(self, chunks: List[str]) -> List[List[float]]:
        """
        Generate embeddings for document chunks
        
        Args:
            chunks: List of text chunks
            
        Returns:
            List of embedding vectors
        """
        try:
            logger.debug(f"Generating embeddings for {len(chunks)} chunks")
            
            # Generate embeddings
            embeddings = await self.embeddings.aembed_documents(chunks)
            
            logger.debug(f"Generated {len(embeddings)} embeddings")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating chunk embeddings: {e}")
            raise
    
    async def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for user query
        
        Args:
            query: User query text
            
        Returns:
            Embedding vector
        """
        try:
            logger.debug(f"Generating embedding for query: {query[:50]}...")
            
            # Generate query embedding
            embedding = await self.embeddings.aembed_query(query)
            
            logger.debug("Query embedding generated successfully")
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating query embedding: {e}")
            raise
    
    async def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        return await self.embed_query(text)
